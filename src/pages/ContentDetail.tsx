// ContentDetail — everything about one title.
//
// Reachable from every content card, and the place bookmarks and ratings are
// actually written. Signed out, the write controls become a login prompt rather
// than silently doing nothing.
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Eye, Calendar, Clock, Users, Film, Tag, ArrowRight, Share2, Check } from 'lucide-react'
import PageHero from '../components/common/PageHero'
import SectionHeader from '../components/common/SectionHeader'
import ContentCard from '../components/common/ContentCard'
import ArticleCard from '../components/common/ArticleCard'
import BookmarkButton from '../components/common/BookmarkButton'
import RatingDisplay from '../components/common/RatingDisplay'
import { RatingStars } from '../components/common/RatingStars'
import SignInPrompt from '../components/common/SignInPrompt'
import { CategoryDot } from '../components/common/CategoryArt'
import { useAuth } from '../context/AuthContext'
import { useRatings } from '../context/RatingsContext'
import {
  ARTICLES,
  CATEGORY_MAP,
  FEATURED_CONTENT,
  toSlug,
} from '../lib/mockData'
import { getContentDetail, relatedContent } from '../lib/details'

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
  const { id } = useParams()
  const { isAuthed } = useAuth()
  const { get, set } = useRatings()

  const item = useMemo(
    () => FEATURED_CONTENT.find((c) => String(c.id) === id),
    [id],
  )
  const detail = item ? getContentDetail(item.id) : null
  const rating = item ? get('content', item.id) : 0

  const related = useMemo(
    () => (item ? relatedContent(item.id) : []),
    [item],
  )
  const articles = useMemo(
    () => (item ? ARTICLES.filter((a) => a.type === item.type).slice(0, 4) : []),
    [item],
  )

  // Unknown id: show a real "not found" rather than an empty shell.
  if (!item) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold text-ink">We couldn’t find that title</h1>
        <p className="text-sm text-ink-muted">
          It may have been removed, or the link might be wrong.
        </p>
        <Link to="/explore" className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
          Browse everything <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    )
  }

  const category = CATEGORY_MAP[toSlug(item.type)]

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHero
        kicker={item.type}
        title={item.title}
        icon={category?.icon}
        blurb={item.description}
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
            {detail ? (
              <>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{detail.synopsis}</p>

                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="flex items-start gap-2">
                    <Film size={15} className="mt-0.5 shrink-0 text-ink-subtle" aria-hidden="true" />
                    <div>
                      <dt className="text-xs text-ink-subtle">{item.type === 'Movies' ? 'Director' : 'Created by'}</dt>
                      <dd className="text-sm text-ink">{detail.credit}</dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar size={15} className="mt-0.5 shrink-0 text-ink-subtle" aria-hidden="true" />
                    <div>
                      <dt className="text-xs text-ink-subtle">Year</dt>
                      <dd className="text-sm text-ink">{detail.year}</dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock size={15} className="mt-0.5 shrink-0 text-ink-subtle" aria-hidden="true" />
                    <div>
                      <dt className="text-xs text-ink-subtle">Length</dt>
                      <dd className="text-sm text-ink">{detail.length}</dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Eye size={15} className="mt-0.5 shrink-0 text-ink-subtle" aria-hidden="true" />
                    <div>
                      <dt className="text-xs text-ink-subtle">Views</dt>
                      <dd className="text-sm text-ink">{item.views}</dd>
                    </div>
                  </div>
                </dl>

                <div className="mt-4">
                  <h3 className="text-xs font-medium text-ink-subtle">Genres</h3>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {detail.genres.map((genre) => (
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

                <div className="mt-4">
                  <h3 className="flex items-center gap-1.5 text-xs font-medium text-ink-subtle">
                    <Users size={12} aria-hidden="true" />
                    {item.type === 'Movies' || item.type === 'TV Shows' ? 'Cast' : 'Featuring'}
                  </h3>
                  <p className="mt-1.5 text-sm text-ink-muted">{detail.cast.join(' · ')}</p>
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-ink-muted">
                {item.description} Full details are still being written.
              </p>
            )}
          </section>

          {articles.length > 0 && (
            <section aria-labelledby="related-articles">
              <SectionHeader
                id="related-articles"
                title={`More ${item.type} coverage`}
                icon={Film}
                viewAllHref="/articles"
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            {category ? (
              <>
                <Link
                  to={`/category/${category.slug}`}
                  className="mt-3 flex items-center gap-2 text-sm text-ink transition hover:text-accent"
                >
                  <CategoryDot slug={category.slug} />
                  {category.name}
                </Link>
                <p className="mt-1.5 text-xs text-ink-muted">{category.description}</p>
              </>
            ) : (
              <p className="mt-2 text-sm text-ink-muted">{item.type}</p>
            )}
          </section>
        </div>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related-content">
          <SectionHeader
            id="related-content"
            title="More like this"
            icon={Film}
            viewAllHref={`/explore?q=${encodeURIComponent(item.type)}`}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((rel) => (
              <ContentCard key={rel.id} item={rel} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
