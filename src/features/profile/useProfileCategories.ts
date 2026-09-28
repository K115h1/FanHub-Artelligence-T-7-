// useProfileCategories — the member's two category lists, backed by the API.
//
// Favourites and interests are deliberately separate on the server, so they are
// separate state here too. Each PUT returns BOTH lists, and this replaces its
// state with that response rather than merging optimistically: it means the UI
// can never drift from what the server actually stored, and it costs nothing
// extra because the response is already there.
//
// A device-only account (signed in while the API was unreachable) has nothing
// server-side to read, so the hook reports `unavailable` and the picker shows
// an explanation rather than pretending an empty list is a real answer.
import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../../types/api'
import * as api from '../../services/auth.service'
import type { CategoryChip, ProfileCategories } from '../../services/auth.service'

export interface UseProfileCategories {
  /** Every category, for the picker. Loaded once from /contents/categories. */
  all: CategoryChip[]
  favorites: CategoryChip[]
  interests: CategoryChip[]
  loading: boolean
  saving: boolean
  error: string | null
  /** True when there is no API session, so the lists are not editable. */
  unavailable: boolean
  setFavorites: (ids: number[]) => Promise<void>
  setInterests: (ids: number[]) => Promise<void>
  reload: () => Promise<void>
}

export function useProfileCategories(enabled: boolean): UseProfileCategories {
  const [all, setAll] = useState<CategoryChip[]>([])
  const [favorites, setFavoritesState] = useState<CategoryChip[]>([])
  const [interests, setInterestsState] = useState<CategoryChip[]>([])
  const [loading, setLoading] = useState(enabled)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unavailable, setUnavailable] = useState(false)

  const apply = useCallback((data: ProfileCategories) => {
    setFavoritesState(data.favorites)
    setInterestsState(data.interests)
  }, [])

  const reload = useCallback(async () => {
    if (!enabled || !api.isSignedIn()) {
      setUnavailable(true)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      // The category list is the same endpoint the sidebar uses, so it is
      // cached by http.ts; this is normally free.
      const { getCategories } = await import('../../services/content.service')
      const categories = await getCategories()
      setAll(
        categories.map((c) => ({ id: c.id, slug: c.slug, name: c.name })),
      )
      apply(await api.getCategories())
      setUnavailable(false)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setUnavailable(true)
      else setError(err instanceof Error ? err.message : 'Could not load your categories.')
    } finally {
      setLoading(false)
    }
  }, [apply, enabled])

  useEffect(() => {
    void reload()
  }, [reload])

  const save = useCallback(
    async (kind: 'favorites' | 'interests', ids: number[]) => {
      setSaving(true)
      setError(null)
      // Optimistic so the chips don't lag a round trip behind the click.
      const previous = kind === 'favorites' ? favorites : interests
      const optimistic = all.filter((c) => ids.includes(c.id))
      if (kind === 'favorites') setFavoritesState(optimistic)
      else setInterestsState(optimistic)

      try {
        const data =
          kind === 'favorites' ? await api.setFavorites(ids) : await api.setInterests(ids)
        // The server returns both lists; trust it over the guess above.
        apply(data)
      } catch (err) {
        // Roll back to what was actually stored, so the UI cannot claim a
        // change that did not happen.
        if (kind === 'favorites') setFavoritesState(previous)
        else setInterestsState(previous)
        setError(err instanceof Error ? err.message : 'That change could not be saved.')
      } finally {
        setSaving(false)
      }
    },
    [all, apply, favorites, interests],
  )

  return {
    all,
    favorites,
    interests,
    loading,
    saving,
    error,
    unavailable,
    setFavorites: (ids) => save('favorites', ids),
    setInterests: (ids) => save('interests', ids),
    reload,
  }
}
