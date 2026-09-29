// useCoverPools — one shared fetch of the per-fandom cover samples.
//
// Every card needs the map, so it is fetched once at module level and read from
// here. A card that rendered before the pools arrive uses its own placeholder and
// swaps when they land, which is why the hook returns null rather than an empty
// object for "not loaded yet".
import { useEffect, useState } from 'react'
import { loadCoverPools, type CoverPools } from '../lib/coverFallback'

export function useCoverPools(): CoverPools | null {
  const [pools, setPools] = useState<CoverPools | null>(null)

  useEffect(() => {
    let cancelled = false
    void loadCoverPools().then((loaded) => {
      if (!cancelled) setPools(loaded)
    })
    return () => { cancelled = true }
  }, [])

  return pools
}
