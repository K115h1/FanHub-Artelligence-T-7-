// Category icons — a presentation detail, so it lives in the frontend.
//
// The database's categories table carries slug, name, description and accent
// colour, but not an icon: which glyph represents a fandom is a design choice,
// not data. Keying it by slug means adding a category to the database does not
// require a matching entry here to avoid a crash — the fallback below handles
// anything unmapped.
import {
  BookOpen,
  Drama,
  Film,
  Gamepad2,
  Music,
  Palette,
  Sparkles,
  Tv,
  type LucideIcon,
} from 'lucide-react'

const ICONS_BY_SLUG: Record<string, LucideIcon> = {
  anime: Drama,
  gaming: Gamepad2,
  movies: Film,
  comics: BookOpen,
  'k-pop': Music,
  'tv-shows': Tv,
  manga: BookOpen,
  cosplay: Palette,
}

/** The icon for a category slug, or a neutral glyph if it has none yet. */
export function categoryIcon(slug: string): LucideIcon {
  return ICONS_BY_SLUG[slug] ?? Sparkles
}

/** The order the eight fandoms appear in, matching the sidebar and the design. */
export const CATEGORY_ORDER = [
  'anime',
  'gaming',
  'movies',
  'tv-shows',
  'k-pop',
  'comics',
  'manga',
  'cosplay',
] as const

/** Sorts API categories into that order, appending anything unlisted at the end. */
export function sortCategories<T extends { slug: string }>(categories: T[]): T[] {
  return [...categories].sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a.slug as (typeof CATEGORY_ORDER)[number])
    const bi = CATEGORY_ORDER.indexOf(b.slug as (typeof CATEGORY_ORDER)[number])
    if (ai === -1 && bi === -1) return a.slug.localeCompare(b.slug)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}
