// BookmarksProvider — the saved-items store, scoped to the signed-in account.
//
// Reads and writes localStorage per account, so two accounts on one device keep
// separate lists. Signed out, the store is empty and every control is disabled
// rather than silently accepting saves that would vanish.
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { BookmarksContext } from '../../context/BookmarksContext'
import { useAuth } from '../../context/AuthContext'
import {
  makeBookmarkId,
  readBookmarks,
  resolveAll,
  storageKey,
  type Bookmark,
  type BookmarkKind,
} from '../../lib/bookmarks'

export default function BookmarksProvider({ children }: { children: ReactNode }) {
  const { current } = useAuth()
  // Remounts on account change so the list reloads from that account's key.
  // Doing it with an effect instead would re-seed mid-render.
  return <BookmarksStore key={current?.id ?? 'guest'} accountId={current?.id ?? null}>{children}</BookmarksStore>
}

function BookmarksStore({
  accountId,
  children,
}: {
  accountId: string | null
  children: ReactNode
}) {
  const [items, setItems] = useState<Bookmark[]>(() =>
    accountId ? readBookmarks(accountId) : [],
  )

  // Persist on every change; signed out there is nothing to save.
  const update = useCallback(
    (next: Bookmark[]) => {
      setItems(next)
      if (!accountId) return
      try {
        localStorage.setItem(storageKey(accountId), JSON.stringify(next))
      } catch {
        // Ignore quota/private-mode failures — the in-memory list still works.
      }
    },
    [accountId],
  )

  const bookmarks = useMemo(() => (accountId ? resolveAll(items) : []), [items, accountId])

  const categories = useMemo(
    () => [...new Set(bookmarks.map((b) => b.type))].sort(),
    [bookmarks],
  )

  const isSaved = useCallback(
    (kind: BookmarkKind, refId: number) => items.some((b) => b.kind === kind && b.refId === refId),
    [items],
  )

  const toggle = useCallback(
    (kind: BookmarkKind, refId: number) => {
      const id = makeBookmarkId(kind, refId)
      update(
        items.some((b) => b.id === id)
          ? items.filter((b) => b.id !== id)
          : [{ id, kind, refId, savedAt: new Date().toISOString() }, ...items],
      )
    },
    [items, update],
  )

  const remove = useCallback((id: string) => update(items.filter((b) => b.id !== id)), [items, update])
  const clearAll = useCallback(() => update([]), [update])

  const value = useMemo(
    () => ({ bookmarks, categories, count: bookmarks.length, isSaved, toggle, remove, clearAll }),
    [bookmarks, categories, isSaved, toggle, remove, clearAll],
  )

  return <BookmarksContext.Provider value={value}>{children}</BookmarksContext.Provider>
}
