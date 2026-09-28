// ContentDetail — everything about one title.
//
// Reachable from every content card, and the place bookmarks and ratings are
// actually written. Signed out, the write controls become a login prompt rather
// than silently doing nothing.
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
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
import { getContentBySlug, getContents } from '../services/content.service'
import { categoryIcon } from '../lib/categoryIcons'

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
  // survives an id renumber. "akira" exists under three fandoms, so the category
  // is passed alongside it where the page can tell.
  const { slug, category: categoryParam } = useParams()
  const { isAuthed } = useAuth()
  const { get, set } = useRatings()

  const { data: item, loading, error } = useAsync(
    () => getContentBySlug(slug ?? '', categoryParam),
    [slug, categoryParam],
  )

  // Related titles come from the same category, which the API can do properly
  // rather than filtering a fixed local list.
  const { data: relatedPage } = useAsync(
    () =>
      item
        ? getContents({ category: item.categorySlug, pageSize: 5, sort: 'popular' })
        : Promise.resolve(null),
    [item?.categorySlug],
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

            {item.synopsis ? (
              <>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{item.synopsis}</p>

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
                      <dd className="text-sm text-ink">{item.viewCount.toLocaleString()}</dd>
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
              </>
            ) : (
              /* No synopsis yet — the enrichment pass fills these in. Say so
                 plainly rather than showing an empty About panel. */
              <p className="mt-2 text-sm text-ink-muted">
                {item.shortSynopsis ?? `${item.genres.join(', ') || 'No description yet.'}`}{' '}
                Full details are still being written.
              </p>
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
          <SectionHeader
            id="related-content"
            title="More like this"
            icon={Film}
            viewAllHref={`/explore?category=${item.categorySlug}`}
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
