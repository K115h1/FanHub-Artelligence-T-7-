// BookmarksContext, the member's saved items.
//
// State lives in a provider rather than a hook because several bookmark buttons
// can be on screen at once (every card on the homepage). A per-component hook
// would give each its own copy of the list, so they'd disagree after a save.
import { createContext, useContext } from 'react'
import type { BookmarkKind, ResolvedBookmark } from '../lib/bookmarks'

export interface BookmarksContextValue {
  /** Resolved, newest first. Empty when signed out. */
  bookmarks: ResolvedBookmark[]
  categories: string[]
  count: number
  isSaved: (kind: BookmarkKind, refId: number) => boolean
  toggle: (kind: BookmarkKind, refId: number) => void
  remove: (id: string) => void
  clearAll: () => void
}

export const BookmarksContext = createContext<BookmarksContextValue>({
  bookmarks: [],
  categories: [],
  count: 0,
  isSaved: () => false,
  toggle: () => {},
  remove: () => {},
  clearAll: () => {},
})

export const useBookmarks = () => useContext(BookmarksContext)
