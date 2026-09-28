// CharacterCard — one costume or character profile.
//
// Lives here rather than inline in pages/Characters.tsx because the category page
// needs the same tile for fandoms whose content is people rather than titles
// (Cosplay has 14 of these and no titles at all). Extracting it also means the
// two places cannot drift apart on the scrim or the fallback.
//
// The image is a CSS background, not an <img>, for the same reason as
// MerchandiseCard: a path that fails to load then paints nothing and the layer
// underneath shows, where an <img> would leave a broken-image glyph sitting in
// the middle of a grid. Supplied artwork is the most likely thing on the site
// to be missing, so the fallback has to be quiet.
//
// <li> so it drops straight into the <ul> grids on both pages. The link is
// inside rather than wrapping, so the whole tile stays one anchor with no
// interactive children nested in it.
import { ImageOff } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Character } from '../../types/models'
import { CategoryDot } from '../common/CategoryArt'

const CATEGORY_NAMES: Record<string, string> = {
  anime: 'Anime',
  cosplay: 'Cosplay',
  'k-pop': 'K-Pop',
  manga: 'Manga',
  movies: 'Movies',
  gaming: 'Gaming',
  comics: 'Comics',
  'tv-shows': 'TV Shows',
}

export default function CharacterCard({
  character,
  showCategory = true,
}: {
  character: Character
  /** Off on the characters index, where the filter bar already scopes the grid. */
  showCategory?: boolean
}) {
  const category = CATEGORY_NAMES[character.categorySlug] ?? character.categorySlug

  return (
    <li className="group overflow-hidden rounded-xl border border-line bg-surface transition hover:border-accent">
      <Link to={`/characters/${character.id}`} className="block">
        <div className="relative aspect-square bg-surface-sunken">
          {character.imagePath && (
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
              style={{ backgroundImage: `url(${character.imagePath})` }}
            />
          )}

          {/* Under the photo rather than over it, so a failed load leaves a
              purple tile instead of a "no photo" note across a good picture. */}
          {!character.imagePath && (
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 accent-wash">
              <ImageOff size={20} className="text-white/60" aria-hidden="true" />
              <span className="text-[11px] font-medium text-white/70">No photo yet</span>
            </span>
          )}

          {/* Scrim so the category chip stays legible over a light photo. */}
          {showCategory && (
            <>
              <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/75 to-transparent"
              />
              <span className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-white">
                <CategoryDot slug={character.categorySlug} />
                {category}
              </span>
            </>
          )}
        </div>

        <div className="space-y-0.5 p-3">
          <p className="text-sm leading-snug font-semibold text-ink transition group-hover:text-accent">
            {character.name}
          </p>
          {/* The supplied artwork carries no write-up, so this line is usually
              absent. It renders when a bio exists and costs nothing when not. */}
          {character.bio && (
            <p className="line-clamp-2 text-xs text-ink-muted">{character.bio}</p>
          )}
        </div>
      </Link>
    </li>
  )
}
