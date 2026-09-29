// coverFallback, gives a title an image when it has no cover of its own.
//
// Manga has 449 titles and no cover files at all, comics has 101 more. That is
// 713 titles out of 3,388 just showing a placeholder, which looks unfinished.
//
// We pull the fallback from the same fandom rather than the whole catalogue.
// Putting an anime poster on a manga card is worse than no poster, because it
// looks like that poster belongs to the title. Manga has no covers to pick from
// at all, so it just gets the category banner.
//
// The pick is based on the row id, not Math.random. Otherwise the grid would
// shuffle every render and a shared link would show different art each time.
import { getCoverPools } from '../services/content.service'
import { categoryBanner } from './categoryBanners'

export type CoverPools = Record<string, string[]>

let cached: CoverPools | null = null
let inflight: Promise<CoverPools> | null = null

/**
 * Only fetched once per session, otherwise all 713 titles ask for it.
 * If it fails we just return an empty map and every card keeps its own
 * placeholder. The pools are a nice extra, not something we need to work.
 */
export function loadCoverPools(): Promise<CoverPools> {
  if (cached) return Promise.resolve(cached)
  if (inflight) return inflight

  inflight = getCoverPools()
    .then((pools) => {
      cached = pools
      inflight = null
      return pools
    })
    .catch(() => {
      cached = {}
      inflight = null
      return {} as CoverPools
    })

  return inflight
}

/** 32 bit FNV-1a. Quick, gives the same answer every time, no dependency. */
function hash(value: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/**
 * Picks the image for a title with no cover. Returns undefined if the fandom
 * has no artwork either, so the caller can just keep its own placeholder.
 */
export function pickCoverFallback(
  categorySlug: string,
  seed: number,
  pools: CoverPools | null,
): string | undefined {
  const pool = pools?.[categorySlug]
  if (pool && pool.length > 0) {
    return pool[hash(`${categorySlug}:${seed}`) % pool.length]
  }
  return categoryBanner(categorySlug)
}
