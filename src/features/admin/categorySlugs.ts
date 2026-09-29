// categorySlugs, the two directions of the fandom to  category mapping, in one
// place.
//
// They are not the same value in either direction, which is why this is a pair of
// explicit maps and not a cast:
//
//   * key -> slug: 'games' is the category whose slug is 'gaming', 'kpop' is
//     'k-pop'. A Record keyed by FandomKey cannot express that.
//   * slug -> key: the inverse, plus 'tv-shows', because the live database still
//     holds that older spelling while database/04_tvshows_seed.sql writes
//     'tvshows'. Both map to the same grouping.
//
// The database and the seed disagreeing is worth knowing about rather than
// papering over: category 6 in the live database has zero rows, so the TV Shows
// import has not been applied to it at all. Until the seeds are re-run, the
// server's category list is the authority for what a filter should send.
import type { FandomKey } from './types'

/** `categories.slug` -> the admin's fandom grouping. */
export const FANDOM_BY_SLUG: Record<string, FandomKey> = {
  movies: 'movies',
  anime: 'anime',
  gaming: 'games',
  comics: 'comics',
  'k-pop': 'kpop',
  tvshows: 'tvshows',
  'tv-shows': 'tvshows',
}

/**
 * Fallback slug per fandom, used before the server's category list has loaded.
 * Prefer resolving it from that list, see useCatalog's `slugFor`.
 */
export const SLUG_BY_FANDOM: Record<FandomKey, string> = {
  movies: 'movies',
  anime: 'anime',
  games: 'gaming',
  comics: 'comics',
  kpop: 'k-pop',
  tvshows: 'tvshows',
}

/** `content_type` per fandom, matching scripts/lib/catalogParse.mjs. */
export const CONTENT_TYPE_BY_FANDOM: Record<FandomKey, string> = {
  movies: 'movie',
  anime: 'series',
  games: 'game',
  comics: 'comic',
  kpop: 'music_artist',
  tvshows: 'series',
}
