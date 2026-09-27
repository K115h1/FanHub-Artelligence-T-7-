// Home page data.
//
// The home page needs the same handful of slices — trending, a discovery set,
// categories, events — so they are fetched here rather than repeated in each
// section component. Every call goes through a service; nothing reads mockData.
//
// Articles are the exception: there is no articles table in the schema, so the
// Latest Articles and Recent Activity sections still use the local list. They
// are marked in Home.tsx and need a table before they can move.
import { useMemo } from 'react'
import { useAsync } from '../../hooks/useAsync'
import { getCategories, getContents } from '../../services/content.service'
import { getEvents } from '../../services/event.service'
import type { ContentSummary } from '../../types/models'

/** How many cards each home section shows. */
const CARD_COUNT = 4

export function useTrending() {
  const { data, loading, error } = useAsync(
    () => getContents({ sort: 'popular', pageSize: CARD_COUNT }),
    [],
  )
  return { items: data?.items ?? [], loading, error }
}

/** Highest-rated, so the "Featured" row is not the same four as Trending. */
export function useFeatured() {
  const { data, loading, error } = useAsync(
    () => getContents({ sort: 'rating', pageSize: CARD_COUNT }),
    [],
  )
  return { items: data?.items ?? [], loading, error }
}

/**
 * "Try Something New" — deliberately outside the fandoms the rest of the page
 * leans towards. Pulls a wider page and drops anything already shown, so the
 * row genuinely differs rather than repeating Trending.
 */
export function useDiscovery(exclude: string[] = ['anime', 'gaming', 'k-pop']) {
  const { data, loading, error } = useAsync(
    () => getContents({ sort: 'popular', pageSize: 24 }),
    [],
  )

  const items = useMemo(() => {
    const all = data?.items ?? []
    const seen = new Set(exclude)
    const fresh = all.filter((item) => !seen.has(item.categorySlug))
    // If the exclusions emptied the row, fall back to the full list rather than
    // rendering an empty section.
    return (fresh.length >= CARD_COUNT ? fresh : all).slice(0, CARD_COUNT)
  }, [data, exclude])

  return { items, loading, error }
}

export function useHomeCategories() {
  const { data, loading, error } = useAsync(() => getCategories(), [])
  return { categories: data ?? [], loading, error }
}

export function useHomeEvents() {
  const { data, loading, error } = useAsync(() => getEvents(), [])
  return { events: data ?? [], loading, error }
}

/**
 * Small helper for the skeleton rows. A section that is still loading shows the
 * right number of empty cards so the page does not jump when the data lands.
 */
export function placeholders(count = CARD_COUNT): ContentSummary[] {
  return Array.from({ length: count }, (_, i) => ({
    id: -1 - i,
    title: '',
    slug: '',
    contentType: '',
    status: '',
    categorySlug: '',
    shortSynopsis: null,
    posterPath: null,
    releaseYear: null,
    communityRating: null,
    viewCount: 0,
    genres: [],
  }))
}
