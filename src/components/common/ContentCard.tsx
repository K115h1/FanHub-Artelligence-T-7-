// ContentCard — the tile used by every content row (featured, trending).
// Pass `rank` for the ordered trending list to show a position badge.
//
// The card is an <article>, not a <Link>: the bookmark button inside it would
// otherwise be interactive content nested inside an anchor, which is invalid and
// breaks keyboard use. The title carries the link instead.
import { Link } from 'react-router-dom'
import { Eye, Film } from 'lucide-react'
import type { ContentItem } from '../../lib/mockData'
import { CategoryDot } from './CategoryArt'
import BookmarkButton from './BookmarkButton'
import RatingDisplay from './RatingDisplay'
import { toSlug } from '../../lib/mockData'

export default function ContentCard({ item, rank }: { item: ContentItem; rank?: number }) {
  const slug = toSlug(item.type)

  return (
    <article className="surface-card group relative flex flex-col overflow-hidden hover:-translate-y-0.5">
      {/* Artwork band — same purple-wash treatment as the category tiles, so
          a page of cards reads as one system rather than a patchwork. */}
      <div className="relative flex h-32 items-center justify-center overflow-hidden bg-surface-sunken">
        <div aria-hidden="true" className="accent-wash absolute inset-0 opacity-85" />
        {/* A neutral media glyph, not the title's initial — a letter reads as a
            broken image rather than as artwork. */}
        <Film
          aria-hidden="true"
          className="relative h-12 w-12 text-white/25 transition-transform duration-300 group-hover:scale-110"
          strokeWidth={1.25}
        />

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
              clickable. The bookmark button sets z-10 to sit above it. */}
          <Link
            to={`/content/${item.id}`}
            className="transition after:absolute after:inset-0 hover:text-accent"
          >
            {item.title}
          </Link>
        </h3>
        <p className="line-clamp-2 flex-1 text-sm text-ink-muted">{item.description}</p>

        <div className="mt-1 flex items-center justify-between text-xs text-ink-subtle">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1">
              <Eye size={12} aria-hidden="true" /> {item.views}
            </span>
            <RatingDisplay kind="content" refId={item.id} />
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2 py-0.5 font-medium text-accent">
            <CategoryDot slug={slug} />
            {item.type}
          </span>
        </div>
      </div>
    </article>
  )
}
