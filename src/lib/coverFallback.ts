// coverFallback — an image for titles that ship without one.
//
// WHY NOT A PLAIN PLACEHOLDER
//   Manga has 449 titles and no cover files at all, and comics has 101 more, so
//   713 of 3,388 titles render as placeholder tiles. That is a fifth of the
//   catalogue looking unfinished.
//
// WHY NOT A TRULY RANDOM IMAGE FROM THE CATALOGUE
//   A manga card labelled with a manga title showing an anime film poster is
//   worse than no image: it asserts the poster belongs to that title. So the
//   pool is scoped to the title's own fandom, and a fandom with no covers at all
//   (only manga, today) gets its category banner instead — which is deliberately
//   abstract artwork rather than a claimed title's cover.
//
// WHY DETERMINISTIC
//   Math.random() would reshuffle on every render, so a grid would visibly
//   flicker and a shared link would show different art for the same title. The
//   seed is the row's own id, so a title always resolves to the same image.
import { getCoverPools } from '../services/content.service'
import { categoryBanner } from './categoryBanners'

export type CoverPools = Record<string, string[]>

let cached: CoverPools | null = null
let inflight: Promise<CoverPools> | null = null

/**
 * Fetched once per session. 713 titles would otherwise each ask for the pool.
 * A failed fetch resolves to an empty map, which leaves every caller on its own
 * placeholder — the pools are an improvement, not a dependency.
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

/** 32-bit FNV-1a. Cheap, stable across reloads, no dependency. */
function hash(value: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/**
 * The image to use for a title that has none of its own.
 * Returns undefined when even the fandom has no artwork, so the caller keeps
 * whatever placeholder it already had.
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
