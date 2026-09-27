// Feature: Admin Control Panel — business logic layer.
//
// Pages under pages/admin/ read data through these hooks and never touch
// AdminDataProvider or localStorage directly, so swapping the device-local
// store for the API means rewriting this file only.
//
// The catalogue is ~2,500 rows, so useCatalog does the filtering, sorting and
// paging in memory and returns a single page. Filtering 2,500 strings per
// keystroke is well under a frame; no debounce needed.

import { useCallback, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { allGenres, FANDOM_LABELS, useAdminData } from './AdminDataProvider'
import type { CatalogRow, CategoryStat, ContentStatus, FandomKey } from './types'

const PAGE_SIZE = 25

export type FandomFilter = FandomKey | 'all'
export type StatusFilter = ContentStatus | 'all'

export interface CatalogQuery {
  search: string
  fandom: FandomFilter
  genre: string
  status: StatusFilter
}

export const DEFAULT_QUERY: CatalogQuery = {
  search: '',
  fandom: 'all',
  genre: '',
  status: 'all',
}

export interface CatalogResult {
  rows: CatalogRow[]
  genres: string[]
  /** Rows matching the current filters, before paging. */
  total: number
  page: number
  pageCount: number
  pageSize: number
  query: CatalogQuery
  setQuery: (patch: Partial<CatalogQuery>) => void
  resetQuery: () => void
  goToPage: (page: number) => void
  /** True when any filter is narrowing the result set. */
  isFiltered: boolean
}

/** Filtered, sorted and paged view of the catalogue. */
export function useCatalog(): CatalogResult {
  const { rows } = useAdminData()
  const [query, setQueryState] = useState<CatalogQuery>(DEFAULT_QUERY)
  const [page, setPage] = useState(1)

  const genres = useMemo(() => allGenres(rows), [rows])

  const filtered = useMemo(() => {
    const needle = query.search.trim().toLowerCase()
    return rows.filter((row) => {
      if (query.fandom !== 'all' && row.fandom !== query.fandom) return false
      if (query.genre && !row.genres.includes(query.genre)) return false
      if (query.status !== 'all' && row.status !== query.status) return false
      if (needle && !row.title.toLowerCase().includes(needle)) return false
      return true
    })
  }, [rows, query])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  // Clamp rather than reset, so deleting the last row on the final page does
  // not leave the user staring at an empty page.
  const safePage = Math.min(page, pageCount)
  const start = (safePage - 1) * PAGE_SIZE

  // Any filter change returns to page 1 — staying on page 7 of a new,
  // much shorter result set is disorienting.
  const setQuery = useCallback((patch: Partial<CatalogQuery>) => {
    setQueryState((prev) => ({ ...prev, ...patch }))
    setPage(1)
  }, [])

  const resetQuery = useCallback(() => {
    setQueryState(DEFAULT_QUERY)
    setPage(1)
  }, [])

  return {
    rows: filtered.slice(start, start + PAGE_SIZE),
    genres,
    total: filtered.length,
    page: safePage,
    pageCount,
    pageSize: PAGE_SIZE,
    query,
    setQuery,
    resetQuery,
    goToPage: setPage,
    isFiltered:
      query.search.trim() !== '' ||
      query.fandom !== 'all' ||
      query.genre !== '' ||
      query.status !== 'all',
  }
}

/** Row counts per fandom, for the filter chips and the dashboard. */
export function useFandomCounts(): Record<string, number> {
  const { rows } = useAdminData()
  return useMemo(() => {
    const counts: Record<string, number> = {}
    for (const row of rows) counts[row.fandom] = (counts[row.fandom] ?? 0) + 1
    return counts
  }, [rows])
}

export interface AdminStats {
  totalTitles: number
  totalGenres: number
  withPoster: number
  withSynopsis: number
  withYear: number
  /** Per-category completeness, for the dashboard table. */
  perCategory: CategoryStat[]
  openFeedback: number
  pendingSubmissions: number
  accountCount: number
  adminCount: number
  changeCount: number
}

/**
 * Derived dashboard figures.
 *
 * Every number here is computed from data that actually exists. There are no
 * placeholder zeros and no invented activity charts — a stats panel full of
 * zeroes reads as a bug, and the chatbot is a deferred feature so it is not
 * counted at all.
 */
export function useAdminStats(): AdminStats {
  const { rows, baseCount, feedback, submissions, changeCount } = useAdminData()
  const { accounts } = useAuth()

  return useMemo(() => {
    const withPoster = rows.filter((row) => row.posterPath).length
    const withSynopsis = rows.filter((row) => row.synopsis).length
    const withYear = rows.filter((row) => row.releaseYear !== null).length

    // One row per fandom grouping, in the order the categories appear.
    // FANDOM_LABELS is the single source for the display names; a second copy
    // here is how "tvshows" ended up missing from the stats while every other
    // panel knew about it.
    const order: FandomKey[] = ['movies', 'anime', 'games', 'comics', 'kpop', 'tvshows']
    const names: Record<FandomKey, string> = FANDOM_LABELS
    const perCategory: CategoryStat[] = order.map((fandom) => {
      const subset = rows.filter((row) => row.fandom === fandom)
      return {
        categorySlug: subset[0]?.categorySlug ?? fandom,
        name: names[fandom],
        total: subset.length,
        withPoster: subset.filter((row) => row.posterPath).length,
        withSynopsis: subset.filter((row) => row.synopsis).length,
      }
    })

    return {
      totalTitles: rows.length,
      totalGenres: new Set(rows.flatMap((row) => row.genres)).size,
      withPoster,
      withSynopsis,
      withYear,
      perCategory,
      openFeedback: feedback.filter((item) => item.status === 'open').length,
      pendingSubmissions: submissions.filter((item) => item.status === 'pending').length,
      accountCount: accounts.length,
      adminCount: accounts.filter((account) => account.role === 'admin').length,
      changeCount,
    }
  }, [rows, baseCount, feedback, submissions, changeCount, accounts])
}

// ---------- moderation ----------

export interface ModerationResult {
  feedback: ReturnType<typeof useAdminData>['feedback']
  submissions: ReturnType<typeof useAdminData>['submissions']
  setFeedbackStatus: ReturnType<typeof useAdminData>['setFeedbackStatus']
  setSubmissionStatus: ReturnType<typeof useAdminData>['setSubmissionStatus']
}

/** Both moderation queues in one place, for the dashboard summary. */
export function useModeration(): ModerationResult {
  const admin = useAdminData()
  return {
    feedback: admin.feedback,
    submissions: admin.submissions,
    setFeedbackStatus: admin.setFeedbackStatus,
    setSubmissionStatus: admin.setSubmissionStatus,
  }
}
