// ContentCard — the tile used by every content row on the homepage
// (featured, trending, recommended).
//
// One component for all of them because they were three near-identical copies
// in the original Home page. `rank` is optional: pass it for the ordered
// "trending" list and the tile shows a position badge.
import { Link } from 'react-router-dom'
import { Eye } from 'lucide-react'
import type { ContentItem } from '../../lib/mockData'
import { CategoryDot } from './CategoryArt'
import { toSlug } from '../../lib/mockData'

export default function ContentCard({ item, rank }: { item: ContentItem; rank?: number }) {
  const slug = toSlug(item.type)

  return (
    <Link
      to={`/content/${item.id}`}
      className="surface-card group flex flex-col overflow-hidden hover:-translate-y-0.5"
    >
      {/* Artwork band — same purple-wash treatment as the category tiles, so
          a page of cards reads as one system rather than a patchwork. */}
      <div className="relative flex h-32 items-center justify-center overflow-hidden bg-surface-sunken">
        <div aria-hidden="true" className="accent-wash absolute inset-0 opacity-85" />
        <span className="relative text-4xl font-black text-white/25 transition-transform duration-300 group-hover:scale-110">
          {item.title.charAt(0)}
        </span>

        {rank !== undefined && (
          <span className="absolute top-2 left-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-xs font-bold text-white backdrop-blur-sm">
            {rank}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="line-clamp-2 font-semibold text-ink transition group-hover:text-accent">
          {item.title}
        </h3>
        <p className="line-clamp-2 flex-1 text-sm text-ink-muted">{item.description}</p>

        <div className="mt-1 flex items-center justify-between text-xs text-ink-subtle">
          <span className="inline-flex items-center gap-1">
            <Eye size={12} aria-hidden="true" /> {item.views}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2 py-0.5 font-medium text-accent">
            <CategoryDot slug={slug} />
            {item.type}
          </span>
        </div>
      </div>
    </Link>
  )
}
