// CategoryArt — the generated artwork tile used wherever a category needs a
// picture: the homepage grid, the category page header, and the sidebar dots.
//
// This exists so the app has NO remote images. The reference demo pulled
// every picture from picsum.photos, which meant a broken page offline and a
// different-looking page on every run — bad for a demo where screenshots in
// the report need to match the live site.
//
// Each category gets a hue derived from its accent token, layered over the
// purple wash so the grid still reads as one system. When real artwork lands,
// replace the body of this component with an <img> — every call site keeps
// working because they all go through here.
import type { LucideIcon } from 'lucide-react'

// slug → the Tailwind colour token for that category.
const HUE_BY_SLUG: Record<string, string> = {
  anime: 'text-cat-anime',
  gaming: 'text-cat-gaming',
  movies: 'text-cat-movies',
  'tv-shows': 'text-cat-tv-shows',
  'k-pop': 'text-cat-k-pop',
  comics: 'text-cat-comics',
  manga: 'text-cat-manga',
  cosplay: 'text-cat-cosplay',
}

export function CategoryDot({ slug, className = '' }: { slug: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-2 w-2 shrink-0 rounded-full bg-current ${HUE_BY_SLUG[slug] ?? 'text-accent'} ${className}`}
    />
  )
}

// The big square tile: hue-tinted gradient, oversized ghosted icon, and a
// name label along the bottom.
export default function CategoryArt({
  slug,
  name,
  icon: Icon,
}: {
  slug: string
  name: string
  icon: LucideIcon
}) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-surface-sunken">
      {/* Purple wash + a hue tint layered on top at low opacity, so the tile
          is recognisably "ours" while still carrying the category colour. */}
      <div aria-hidden="true" className="accent-wash absolute inset-0 opacity-90" />
      <div
        aria-hidden="true"
        className={`absolute inset-0 bg-current opacity-25 mix-blend-overlay ${HUE_BY_SLUG[slug] ?? 'text-accent'}`}
      />

      {/* Ghosted icon — oversized and clipped by the tile, which reads as
          artwork rather than as an icon in a box. */}
      <Icon
        aria-hidden="true"
        className={`absolute -right-3 -bottom-3 h-24 w-24 opacity-30 ${HUE_BY_SLUG[slug] ?? 'text-white'}`}
        strokeWidth={1.25}
      />

      <span className="absolute bottom-2 left-2 rounded-md bg-black/65 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
        {name}
      </span>
    </div>
  )
}
