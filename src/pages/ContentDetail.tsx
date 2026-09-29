// ContentDetail — everything about one title.
//
// Reachable from every content card, and the place bookmarks and ratings are
// actually written. Signed out, the write controls become a login prompt rather
// than silently doing nothing.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Eye, Calendar, Clock, Users, Film, Tag, ArrowRight, Share2, Check, Star } from 'lucide-react'
import PageHero from '../components/common/PageHero'
import BackButton from '../components/common/BackButton'
import SectionHeader from '../components/common/SectionHeader'
import ContentCard from '../components/common/ContentCard'
import { ContentDetailSkeleton } from '../components/common/skeletons'
import ArticleCard from '../components/common/ArticleCard'
import BookmarkButton from '../components/common/BookmarkButton'
import RatingDisplay from '../components/common/RatingDisplay'
import { RatingStars } from '../components/common/RatingStars'
import SignInPrompt from '../components/common/SignInPrompt'
import { CategoryDot } from '../components/common/CategoryArt'
import { useAuth } from '../context/AuthContext'
import { useRatings } from '../context/RatingsContext'
import { useAsync } from '../hooks/useAsync'
import { getContentBySlug, getContents, recordView } from '../services/content.service'
import { categoryIcon } from '../lib/categoryIcons'
import { useCoverPools } from '../hooks/useCoverPools'
import { pickCoverFallback } from '../lib/coverFallback'

// ARTICLES is still local: the schema has no articles table.
import { ARTICLES } from '../lib/mockData'

/** Copies the permalink and confirms it, falling back when the API is absent. */
function CopyLinkButton() {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard can be blocked (insecure context); no point interrupting the page for it.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm font-medium text-ink-muted transition hover:border-accent hover:text-accent"
    >
      {copied ? <Check size={15} aria-hidden="true" /> : <Share2 size={15} aria-hidden="true" />}
      {copied ? 'Link copied' : 'Share'}
    </button>
  )
}

export default function ContentDetail() {
  // The route param is a slug, because a slug is what the cards link to and it
  // survives an id renumber. The category comes from the query string, NOT from
  // a route segment: the route is `content/:slug` and has no `:category`, so the
  // `category` this used to pull out of useParams() was permanently undefined and
  // the API was always asked for a bare slug.
  //
  // That mattered because slug is unique per category and not globally — 273
  // slugs in this catalogue exist in more than one, and "akira" is four separate
  // titles (movies, anime, comics, manga). The repository resolves a bare slug
  // with FirstOrDefault, so a link without a category lands on an arbitrary one
  // of them. The backend has always accepted `?category=` for exactly this; the
  // page just never sent it.
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const categoryParam = searchParams.get('category') ?? undefined
  const { isAuthed } = useAuth()
  const { get, set } = useRatings()

  const { data: item, loading, error } = useAsync(
    () => getContentBySlug(slug ?? '', categoryParam),
    [slug, categoryParam],
  )

  // ---- view counting ----
  //
  // One POST per title per opening, after the detail has loaded so the id is
  // known. The guard is a ref rather than a state flag because StrictMode
  // double-invokes effects in development, and a flag set in an effect would
  // still see itself unset on the second pass — the ref survives it. Keying on
  // the id rather than a bare boolean means moving between two titles in the
  // same mount records both, while a re-render of the same title records once.
  const recordedId = useRef<number | null>(null)
  // Seeded from the fetched count, then bumped locally so the number on screen
  // moves when the view is recorded. Refetching the whole detail to pick up a
  // single increment would be a second round trip for one digit.
  const [views, setViews] = useState<number | null>(null)

  useEffect(() => {
    if (!item || recordedId.current === item.id) return
    recordedId.current = item.id

    let cancelled = false
    void recordView(item.id)
      .then(() => {
        if (!cancelled) setViews((current) => (current ?? item.viewCount) + 1)
      })
      .catch(() => {
        // Deliberately swallowed: a view that did not save is not a problem the
        // reader can act on, and the number on screen stays at the fetched
        // count, which is still true.
      })

    return () => { cancelled = true }
  }, [item?.id])

  // Re-seed when a different title loads, so navigating title -> title does not
  // leave the previous title's local bump showing on the new one.
  useEffect(() => {
    setViews(null)
  }, [item?.id])

  const viewCount = views ?? item?.viewCount ?? 0

  const pools = useCoverPools()

  // Shared genre, not merely the same fandom: category-by-popularity returned
  // whatever else was popular, so a Batman film surfaced under an anime series.
  // The category stays as the scope so results never leak into another fandom.
  const leadGenreId = useMemo(() => item?.genreIds?.[0] ?? null, [item])

  // The label the section wears, so it says WHY these were chosen. A title with
  // no genres falls back to the category wording, which is then honest.
  const relatedLabel = useMemo(() => {
    if (!item) return 'More like this'
    if (!leadGenreId) return `More ${item.categoryName}`
    const genre = item.genres?.[0]
    return genre ? `More in ${genre}` : 'More like this'
  }, [item, leadGenreId])

  const { data: relatedPage } = useAsync(
    () =>
      item
        ? getContents({
            category: item.categorySlug,
            // Null when the title has no genres, which leaves the query as
            // category-only rather than sending genreId=0 and matching nothing.
            genreId: leadGenreId ?? undefined,
            pageSize: 8,
            sort: 'popular',
          })
        : Promise.resolve(null),
    [item?.categorySlug, leadGenreId],
  )

  const related = useMemo(
    () => (relatedPage?.items ?? []).filter((row) => row.id !== item?.id).slice(0, 4),
    [relatedPage, item?.id],
  )

  // Articles are still local: the schema has no articles table.
  const articles = useMemo(
    () => (item ? ARTICLES.filter((a) => a.type === item.categoryName).slice(0, 4) : []),
    [item],
  )

  // The local rating store is the source of truth while signed in, so the stars
  // stay responsive; the API's userRating seeds it on first load.
  const rating = item ? (get('content', item.id) || item.userRating || 0) : 0

  if (loading) {
    return <ContentDetailSkeleton />
  }

  // A 404 is a real answer, not an error worth shouting about; anything else is.
  if (error || !item) {
    const notFound = !error
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold text-ink">
          {notFound ? 'We couldn’t find that title' : 'That did not load'}
        </h1>
        <p className="text-sm text-ink-muted">
          {notFound
            ? 'It may have been removed, or the link might be wrong.'
            : error}
        </p>
        <Link to="/explore" className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
          Browse everything <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    )
  }

  const cast = (item.castList ?? '')
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map((name) => name.trim().replace(/^"|"$/g, ''))
    .filter(Boolean)

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {/* Returns to wherever the visitor came from — a category grid, a
          bookmark, a search result — and falls back to this title's category
          when the page was opened directly. */}
      <BackButton
        fallbackTo={`/category/${item.categorySlug}`}
        fallbackLabel={`Back to ${item.categoryName}`}
      />

      <PageHero
        kicker={item.categoryName}
        title={item.title}
        icon={categoryIcon(item.categorySlug)}
        blurb={item.shortSynopsis ?? undefined}
        // The artwork the originating card showed, so the banner and the card are
        // visibly the same title. Same resolution as the card: a real poster, else
        // a same-fandom sample, else the fandom banner.
        image={item.posterPath ?? pickCoverFallback(item.categorySlug, item.id, pools)}
      >
        <div className="flex flex-wrap items-center gap-2">
          <BookmarkButton kind="content" refId={item.id} title={item.title} size="md" />
          <CopyLinkButton />
        </div>
      </PageHero>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ---- Main column ---- */}
        <div className="space-y-6 lg:col-span-2">
          <section aria-labelledby="about" className="surface-card p-5">
            <h2 id="about" className="text-sm font-semibold text-ink">
              About
            </h2>

            {/* The prose is the one optional part of this panel. It used to
                wrap everything below it, so a title with no description also
                lost its year, genres and cast. The metadata below therefore
                always renders and only the prose is conditional.

                Most titles carry a long synopsis; the blurb is the fallback for
                the 54 whose description has not been written yet, and it is
                what the hero banner above shows in either case. */}
            {item.synopsis ? (
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{item.synopsis}</p>
            ) : item.shortSynopsis ? (
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{item.shortSynopsis}</p>
            ) : (
              <p className="mt-2 text-sm text-ink-muted">
                No description yet — the details for this title are still being written.
              </p>
            )}

            {/* Only the fields this title actually has are shown, so the
                block never fills with "—". */}
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              {item.creator && (
                <div className="flex items-start gap-2">
                  <Film size={15} className="mt-0.5 shrink-0 text-ink-subtle" aria-hidden="true" />
                  <div>
                    <dt className="text-xs text-ink-subtle">
                      {item.contentType === 'Movie' ? 'Director' : 'Created by'}
                    </dt>
                    <dd className="text-sm text-ink">{item.creator}</dd>
                  </div>
                </div>
              )}
              {item.releaseYear && (
                <div className="flex items-start gap-2">
                  <Calendar size={15} className="mt-0.5 shrink-0 text-ink-subtle" aria-hidden="true" />
                  <div>
                    <dt className="text-xs text-ink-subtle">Year</dt>
                    <dd className="text-sm text-ink">{item.releaseYear}</dd>
                  </div>
                </div>
              )}
              {item.runtimeMinutes && (
                <div className="flex items-start gap-2">
                  <Clock size={15} className="mt-0.5 shrink-0 text-ink-subtle" aria-hidden="true" />
                  <div>
                    <dt className="text-xs text-ink-subtle">Length</dt>
                    <dd className="text-sm text-ink">
                      {Math.floor(item.runtimeMinutes / 60)}h {item.runtimeMinutes % 60}m
                    </dd>
                  </div>
                </div>
              )}
              {item.episodeCount && (
                <div className="flex items-start gap-2">
                  <Clock size={15} className="mt-0.5 shrink-0 text-ink-subtle" aria-hidden="true" />
                  <div>
                    <dt className="text-xs text-ink-subtle">
                      {item.contentType === 'Manga' ? 'Chapters' : 'Episodes'}
                    </dt>
                    <dd className="text-sm text-ink">{item.episodeCount}</dd>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2">
                <Eye size={15} className="mt-0.5 shrink-0 text-ink-subtle" aria-hidden="true" />
                <div>
                  <dt className="text-xs text-ink-subtle">Views</dt>
                  <dd className="text-sm text-ink">{viewCount.toLocaleString()}</dd>
                </div>
              </div>
              {item.communityRating && (
                <div className="flex items-start gap-2">
                  <Star size={15} className="mt-0.5 shrink-0 text-ink-subtle" aria-hidden="true" />
                  <div>
                    <dt className="text-xs text-ink-subtle">Community score</dt>
                    <dd className="text-sm text-ink">
                      {item.communityRating.toFixed(1)}
                      {item.communityRatingCount ? ` (${item.communityRatingCount.toLocaleString()} votes)` : ''}
                    </dd>
                  </div>
                </div>
              )}
            </dl>

            {item.genres.length > 0 && (
              <div className="mt-4">
                <h3 className="text-xs font-medium text-ink-subtle">Genres</h3>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {item.genres.map((genre) => (
                    <span
                      key={genre}
                      className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent"
                    >
                      <Tag size={10} aria-hidden="true" />
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {cast.length > 0 && (
              <div className="mt-4">
                <h3 className="flex items-center gap-1.5 text-xs font-medium text-ink-subtle">
                  <Users size={12} aria-hidden="true" />
                  {item.contentType === 'Movie' || item.contentType === 'Series'
                    ? 'Cast'
                    : 'Featuring'}
                </h3>
                <p className="mt-1.5 text-sm text-ink-muted">{cast.join(' · ')}</p>
              </div>
            )}
          </section>

          {articles.length > 0 && (
            <section aria-labelledby="related-articles">
              <SectionHeader
                id="related-articles"
                title={`More ${item.categoryName} coverage`}
                icon={Film}
                viewAllHref="/articles"
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {articles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ---- Sidebar ---- */}
        <div className="space-y-4">
          <section aria-labelledby="rate" className="surface-card p-5">
            <h2 id="rate" className="text-sm font-semibold text-ink">
              Your rating
            </h2>

            {isAuthed ? (
              <>
                <div className="mt-3">
                  <RatingStars
                    value={rating}
                    onChange={(next) => set('content', item.id, next)}
                  />
                </div>
                <p className="mt-2 text-xs text-ink-subtle">
                  {rating === 0
                    ? 'Tap a star to rate. Tap the same star again to clear it.'
                    : `You rated this ${rating}/5. Tap the same star again to clear it.`}
                </p>
              </>
            ) : (
              <div className="mt-3">
                <SignInPrompt message="Sign in to rate this title." />
              </div>
            )}

            {rating > 0 && (
              <p className="mt-3 flex items-center gap-1.5 border-t border-line pt-3 text-xs text-ink-subtle">
                <RatingDisplay kind="content" refId={item.id} />
                saved to your profile
              </p>
            )}
          </section>

          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold text-ink">Fandom</h2>
            <Link
              to={`/category/${item.categorySlug}`}
              className="mt-3 flex items-center gap-2 text-sm text-ink transition hover:text-accent"
            >
              <CategoryDot slug={item.categorySlug} />
              {item.categoryName}
            </Link>
            <p className="mt-1.5 text-xs text-ink-muted">
              {item.status} · {item.contentType}
            </p>
          </section>
        </div>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related-content">
          {/* "View all" carries the genre so it lands on the same filtered set
              this section is showing, not the whole fandom. */}
          <SectionHeader
            id="related-content"
            title={relatedLabel}
            icon={Film}
            viewAllHref={
              leadGenreId
                ? `/explore?category=${item.categorySlug}&genre=${leadGenreId}`
                : `/explore?category=${item.categorySlug}`
            }
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((rel) => (
              <ContentCard key={rel.id} item={rel} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
