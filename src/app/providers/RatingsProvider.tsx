// RatingsProvider, per-account star ratings, persisted to localStorage.
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { RatingsContext, type RatingKind } from '../../context/RatingsContext'
import { useAuth } from '../../context/AuthContext'

const KEY_PREFIX = 'fanhub-ratings'
const storageKey = (accountId: string) => `${KEY_PREFIX}:${accountId}`

/** "content:12" → 4 */
type RatingMap = Record<string, number>

export default function RatingsProvider({ children }: { children: ReactNode }) {
  const { current } = useAuth()
  return (
    <RatingsStore key={current?.id ?? 'guest'} accountId={current?.id ?? null}>
      {children}
    </RatingsStore>
  )
}

function RatingsStore({ accountId, children }: { accountId: string | null; children: ReactNode }) {
  const [map, setMap] = useState<RatingMap>(() => {
    if (!accountId) return {}
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(storageKey(accountId)) ?? '{}')
      return parsed && typeof parsed === 'object' ? (parsed as RatingMap) : {}
    } catch {
      return {}
    }
  })

  const get = useCallback(
    (kind: RatingKind, refId: number) => map[`${kind}:${refId}`] ?? 0,
    [map],
  )

  const set = useCallback(
    (kind: RatingKind, refId: number, value: number) => {
      if (!accountId) return
      const key = `${kind}:${refId}`
      const next = { ...map }
      // Re-picking the same stars clears the rating, so a misclick undoes itself.
      if (next[key] === value) delete next[key]
      else next[key] = value
      setMap(next)
      try {
        localStorage.setItem(storageKey(accountId), JSON.stringify(next))
      } catch {
        // Ignore storage failures, the in-memory rating still works.
      }
    },
    [map, accountId],
  )

  const value = useMemo(() => ({ get, set, ratedCount: Object.keys(map).length }), [get, set, map])

  return <RatingsContext.Provider value={value}>{children}</RatingsContext.Provider>
}
