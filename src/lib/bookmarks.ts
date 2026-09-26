// Bookmarks — the saved-items model and its per-account storage format.
//
// State lives in app/providers/BookmarksProvider.tsx so every button on a page
// shares one source of truth; this file holds the shape, the seed and the
// lookup that resolves a saved id against the current fixtures.
import { ARTICLES, FEATURED_CONTENT, type Article, type ContentItem } from './mockData'

/** What kind of thing was saved — decides which dataset resolves it. */
export type BookmarkKind = 'content' | 'article'

export interface Bookmark {
  id: string
  kind: BookmarkKind
  refId: number
  /** ISO timestamp, used for the "recently added" sort. */
  savedAt: string
}

export interface ResolvedBookmark extends Bookmark {
  title: string
  blurb: string
  type: string
  meta: string
  href: string
}

const KEY_PREFIX = 'fanhub-bookmarks'

export const storageKey = (accountId: string): string => `${KEY_PREFIX}:${accountId}`

/**
 * Seeded on a signed-in account's first visit so the page demonstrates itself
 * instead of showing an empty shell. Replaced by the real list from the API.
 */
const SEED: Bookmark[] = [
  { id: 'seed-1', kind: 'content', refId: 1, savedAt: '2026-09-20T10:00:00.000Z' },
  { id: 'seed-2', kind: 'content', refId: 7, savedAt: '2026-09-21T14:30:00.000Z' },
  { id: 'seed-3', kind: 'article', refId: 1, savedAt: '2026-09-22T08:15:00.000Z' },
  { id: 'seed-4', kind: 'article', refId: 7, savedAt: '2026-09-24T19:45:00.000Z' },
]

// Resolves a saved id against the current fixtures, returning null if the
// target is gone (a deleted post shouldn't leave a broken row).
function resolve(bookmark: Bookmark): ResolvedBookmark | null {
  if (bookmark.kind === 'content') {
    const item = FEATURED_CONTENT.find((c: ContentItem) => c.id === bookmark.refId)
    if (!item) return null
    return {
      ...bookmark,
      title: item.title,
      blurb: item.description,
      type: item.type,
      meta: `${item.views} views`,
      href: `/content/${item.id}`,
    }
  }

  const article = ARTICLES.find((a: Article) => a.id === bookmark.refId)
  if (!article) return null
  return {
    ...bookmark,
    title: article.title,
    blurb: article.excerpt,
    type: article.type,
    meta: article.readMeta,
    href: `/articles/${article.id}`,
  }
}

/** Raw read, used by the provider to initialise its state. */
export function readBookmarks(accountId: string): Bookmark[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(storageKey(accountId)) ?? 'null')
    if (Array.isArray(parsed)) return parsed as Bookmark[]
  } catch {
    // fall through to the seed
  }
  return SEED
}

/** Newest first, unresolved rows dropped. */
export function resolveAll(bookmarks: Bookmark[]): ResolvedBookmark[] {
  return bookmarks
    .map(resolve)
    .filter((b): b is ResolvedBookmark => b !== null)
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
}

/** Builds a stable id for a new bookmark. */
export function makeBookmarkId(kind: BookmarkKind, refId: number): string {
  return `${kind}-${refId}`
}
