// CharacterCard, one costume or character.
//
// This lives here because the category page needs the same tile as
// pages/Characters.tsx, and fandoms like Cosplay are all costumes and no titles
// at all. Having it in one place stops the two drifting apart.
//
// Image is a CSS background, same as MerchandiseCard. If the path is bad it just
// paints nothing and you see the layer underneath. An img tag would leave a
// broken image icon in the middle of the grid instead, and the artwork we were
// given is the most likely thing here to be missing.
//
// It renders as a list item so it drops straight into the grids on both pages.
// The link sits inside the tile rather than around it, so we are not nesting
// clickable things inside a link.
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
