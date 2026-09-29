// ContentCard — the tile used by every content row (featured, trending,
// category grids, search results).
//
// The card is an <article>, not a <Link>: the bookmark button inside it would
// otherwise be interactive content nested inside an anchor, which is invalid and
// breaks keyboard use. The title carries the link instead.
//
// Takes the API's ContentSummary directly, so a card can be handed straight
// from a service call with no mapping step in between.
import { Link } from 'react-router-dom'
import { Eye, Film } from 'lucide-react'
import type { ContentSummary } from '../../types/models'
import { CategoryDot } from './CategoryArt'
import BookmarkButton from './BookmarkButton'
import RatingDisplay from './RatingDisplay'
import { useCoverPools } from '../../hooks/useCoverPools'
import { pickCoverFallback } from '../../lib/coverFallback'

/** 1,234 -> "1.2K". The API sends a number; the old mock sent a pre-formatted string. */
function formatViews(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`
  return String(count)
}

export default function ContentCard({
  item,
  rank,
}: {
  item: ContentSummary
  rank?: number
}) {
  const pools = useCoverPools()
  // Manga ships 449 titles with no cover, so the wash is not a rare edge case —
  // it is a fifth of the catalogue. Falls back to the fandom's own art.
  const artwork = item.posterPath ?? pickCoverFallback(item.categorySlug, item.id, pools)

  return (
    <article className="surface-card group relative flex flex-col overflow-hidden hover:-translate-y-0.5">
      <div className="relative flex h-40 items-center justify-center overflow-hidden bg-surface-sunken">
        {artwork ? (
          <img
            src={artwork}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <>
            <div aria-hidden="true" className="accent-wash absolute inset-0 opacity-85" />
            {/* A neutral media glyph, not the title's initial — a letter reads as
                a broken image rather than as artwork. */}
            <Film
              aria-hidden="true"
              className="relative h-12 w-12 text-white/25 transition-transform duration-300 group-hover:scale-110"
              strokeWidth={1.25}
            />
          </>
        )}

        {/* The trending position, top-left so it never collides with the bookmark. */}
        {rank !== undefined && (
          <span className="absolute top-2 left-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-xs font-bold text-white backdrop-blur-sm">
            {rank}
          </span>
        )}

        <div className="absolute top-2 right-2 z-10">
          <BookmarkButton kind="content" refId={item.id} title={item.title} size="sm" />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="line-clamp-2 font-semibold text-ink">
          {/* Stretched link: the ::after covers the card so the whole tile is
              clickable. The bookmark button sets z-10 to sit above it.

              The category rides along in the query string because slug is unique
              per fandom and not globally — 273 slugs here exist in more than one,
              and "akira" is four separate titles. Without it the API resolves an
              ambiguous slug with FirstOrDefault and a card can open the wrong
              title. See ContentDetail for where the param is read. */}
          <Link
            to={`/content/${item.slug}?category=${encodeURIComponent(item.categorySlug)}`}
            className="transition after:absolute after:inset-0 hover:text-accent"
          >
            {item.title}
          </Link>
        </h3>

        <p className="line-clamp-2 flex-1 text-sm text-ink-muted">
          {item.shortSynopsis ?? (item.genres.join(', ') || 'No synopsis yet.')}
        </p>

        <div className="mt-1 flex items-center justify-between text-xs text-ink-subtle">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1">
              <Eye size={12} aria-hidden="true" /> {formatViews(item.viewCount)}
            </span>
            <RatingDisplay kind="content" refId={item.id} />
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2 py-0.5 font-medium text-accent">
            <CategoryDot slug={item.categorySlug} />
            {item.categorySlug}
          </span>
        </div>
      </div>
    </article>
  )
}
