// CategoryArt — artwork for a category tile, so the app needs no remote images.
//
// A fandom photograph is used when one is on disk (see lib/categoryBanners),
// over the same generated wash the site shipped with. The wash is not a
// placeholder to be removed: it sits UNDER the photograph and shows through
// wherever the photograph fails to load, and the hue tint sits over both so the
// grid still reads as one system rather than eight unrelated pictures.
//
// The photograph is a CSS background rather than an <img> on purpose. A missing
// file then fails silently and the gradient shows through, where an <img> would
// paint a broken-image glyph. A fandom with no photograph — manga — is a missing
// decoration, not a broken tile.
import type { LucideIcon } from 'lucide-react'
import { categoryBanner } from '../../lib/categoryBanners'

// slug → colour token for that category.
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

// The big square tile: the fandom photograph over the wash, the hue tint, a
// bottom scrim so the label stays readable, and a name label.
export default function CategoryArt({
  slug,
  name,
  icon: Icon,
}: {
  slug: string
  name: string
  icon: LucideIcon
}) {
  const banner = categoryBanner(slug)

  return (
    <div className="relative h-full w-full overflow-hidden bg-surface-sunken">
      {/* Purple wash + a hue tint, layered under the photograph. Still drawn
          when there is a photograph, so a 404 falls back to exactly the tile
          this component used to render. */}
      <div aria-hidden="true" className="accent-wash absolute inset-0 opacity-90" />
      <div
        aria-hidden="true"
        className={`absolute inset-0 bg-current opacity-25 mix-blend-overlay ${HUE_BY_SLUG[slug] ?? 'text-accent'}`}
      />

      {banner && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
          style={{ backgroundImage: `url(${banner})` }}
        />
      )}

      {/* Bottom-weighted scrim. Without it the name chip fights a bright
          photograph; with a full-bleed one the fandom would stop being the
          subject of its own tile. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent"
      />

      {/* Ghosted icon — oversized and clipped by the tile, which reads as
          artwork rather than as an icon in a box. Kept over the photograph as
          a watermark, at low opacity, so the silhouette adds texture. */}
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
