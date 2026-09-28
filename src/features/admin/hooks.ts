// Feature: Admin Control Panel — business logic layer.
//
// Pages under pages/admin/ read through these hooks, so the data source is
// swappable in one file. Filtering and paging happen in SQL.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getGenres, getCategories } from '../../services/content.service'
import * as adminApi from '../../services/admin.service'
import { FANDOM_LABELS, FANDOM_ORDER, useAdminData } from './AdminDataProvider'
import { FANDOM_BY_SLUG, SLUG_BY_FANDOM } from './categorySlugs'
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
  /** Rows matching the current filters, according to the server. */
  total: number
  page: number
  pageCount: number
  pageSize: number
  query: CatalogQuery
  setQuery: (patch: Partial<CatalogQuery>) => void
  resetQuery: () => void
  goToPage: (page: number) => void
  isFiltered: boolean
  loading: boolean
  error: string | null
  /** Re-read the current page. Called after a create/update/delete. */
  refresh: () => void
}

/** Map a browse row onto the admin's row shape. */
function toCatalogRow(row: adminApi.BrowseRow): CatalogRow {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    fandom: FANDOM_BY_SLUG[row.categorySlug] ?? 'movies',
    categorySlug: row.categorySlug,
    contentType: row.contentType,
    releaseYear: row.releaseYear,
    genres: row.genres,
    posterPath: row.posterPath,
    synopsis: row.shortSynopsis,
    status: row.status as ContentStatus,
  }
}

/** Server-paged, server-filtered view of the catalogue. */
export function useCatalog(): CatalogResult {
  const [query, setQueryState] = useState<CatalogQuery>(DEFAULT_QUERY)
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<adminApi.BrowseResult | null>(null)
  const [genres, setGenres] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Bumped on every query/page change so a slow request cannot overwrite a newer one.
  const runId = useRef(0)

  // The server's own slugs, since the database and the seed file disagree about
  // TV Shows. Falls back to the hardcoded map if the request failed.
  const [serverSlugByFandom, setServerSlugByFandom] = useState<Partial<Record<FandomKey, string>>>({})
  useEffect(() => {
    let cancelled = false
    void getCategories()
      .then((all) => {
        if (cancelled) return
        setServerSlugByFandom(
          Object.fromEntries(
            all
              .map((c) => [FANDOM_BY_SLUG[c.slug], c.slug] as const)
              .filter((pair): pair is [FandomKey, string] => pair[0] !== undefined),
          ),
        )
      })
      .catch(() => {
        if (!cancelled) setServerSlugByFandom({})
      })
    return () => {
      cancelled = true
    }
  }, [])

  const slugFor = useCallback(
    (fandom: FandomKey) => serverSlugByFandom[fandom] ?? SLUG_BY_FANDOM[fandom],
    [serverSlugByFandom],
  )

  // Genre names for the dropdown, plus the name->id map the query needs. Fetched
  // once: the genre set is a property of the catalogue, not of the filters.
  const [genreIdByName, setGenreIdByName] = useState<Record<string, number>>({})
  useEffect(() => {
    let cancelled = false
    void getGenres()
      .then((all) => {
        if (cancelled) return
        setGenres(all.map((g) => g.name).sort((a, b) => a.localeCompare(b)))
        setGenreIdByName(Object.fromEntries(all.map((g) => [g.name, g.id])))
      })
      .catch(() => {
        // A missing dropdown beats an error banner over a working table.
        if (!cancelled) {
          setGenres([])
          setGenreIdByName({})
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  // The query holds a genre NAME (what the dropdown shows) while the API filters
  // by id. Null until the list loads, so the first fetch returns everything
  // rather than a wrong subset.
  const genreId = useMemo(
    () => (query.genre ? (genreIdByName[query.genre] ?? null) : null),
    [query.genre, genreIdByName],
  )

  useEffect(() => {
    const mine = ++runId.current
    setLoading(true)
    setError(null)

    void adminApi
      .browseContent({
        search: query.search.trim() || undefined,
        category: query.fandom === 'all' ? undefined : slugFor(query.fandom),
        status: query.status === 'all' ? undefined : query.status,
        genreId: genreId ?? undefined,
        page,
        pageSize: PAGE_SIZE,
        sort: 'title',
      })
      .then((res) => {
        if (mine !== runId.current) return
        setResult(res)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (mine !== runId.current) return
        setError(err instanceof Error ? err.message : 'The catalogue could not be loaded.')
        setLoading(false)
      })
  }, [query, page, genreId, slugFor])

  // Any filter change returns to page 1.
  const setQuery = useCallback((patch: Partial<CatalogQuery>) => {
    setQueryState((prev) => ({ ...prev, ...patch }))
    setPage(1)
  }, [])

  const resetQuery = useCallback(() => {
    setQueryState(DEFAULT_QUERY)
    setPage(1)
  }, [])

  const refresh = useCallback(() => {
    ++runId.current
    setLoading(true)
    void adminApi
      .browseContent({
        search: query.search.trim() || undefined,
        category: query.fandom === 'all' ? undefined : slugFor(query.fandom),
        status: query.status === 'all' ? undefined : query.status,
        genreId: genreId ?? undefined,
        page,
        pageSize: PAGE_SIZE,
        sort: 'title',
      })
      .then((res) => {
        setResult(res)
        setLoading(false)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'The catalogue could not be loaded.')
        setLoading(false)
      })
  }, [query, page, genreId, slugFor])

  return {
    rows: result ? result.items.map(toCatalogRow) : [],
    genres,
    total: result?.totalCount ?? 0,
    page,
    pageCount: Math.max(1, result?.pageCount ?? 1),
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
    loading,
    error,
    refresh,
  }
}

// ---------- statistics ----------

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
  loading: boolean
  error: string | null
  refresh: () => void
}

/** Dashboard figures, from /admin/stats. */
export function useAdminStats(): AdminStats {
  const { accounts } = useAuth()
  const { feedback, submissions, refresh: refreshQueues } = useAdminData()
  const [stats, setStats] = useState<adminApi.AdminStats | null>(null)
  const [perCategory, setPerCategory] = useState<adminApi.AdminCategoryStat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const runId = useRef(0)

  const load = useCallback(() => {
    const mine = ++runId.current
    setLoading(true)
    setError(null)
    void Promise.allSettled([adminApi.getStats(), adminApi.getCategoryStats()]).then(
      ([s, cats]) => {
        if (mine !== runId.current) return
        if (s.status === 'fulfilled') setStats(s.value)
        else setError('The figures could not be loaded.')
        if (cats.status === 'fulfilled') setPerCategory(cats.value)
        setLoading(false)
      },
    )
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Rows arrive keyed by slug; the table wants canonical order with display
  // names. Matched through FANDOM_BY_SLUG so the live 'tv-shows' and the seed's
  // 'tvshows' land on one row instead of doubling it.
  const categoryRows = useMemo<CategoryStat[]>(() => {
    const grouped = new Map<FandomKey, adminApi.AdminCategoryStat>()
    for (const row of perCategory) {
      const fandom = FANDOM_BY_SLUG[row.slug]
      if (fandom && !grouped.has(fandom)) grouped.set(fandom, row)
    }

    const ordered = FANDOM_ORDER.map((fandom) => {
      const row = grouped.get(fandom)
      return {
        categorySlug: row?.slug ?? SLUG_BY_FANDOM[fandom],
        name: FANDOM_LABELS[fandom],
        total: row?.total ?? 0,
        withPoster: row?.withPoster ?? 0,
        withSynopsis: row?.withSynopsis ?? 0,
      }
    })

    // Manga and Cosplay are categories but not panel fandoms; appended, not dropped.
    const extra = perCategory
      .filter((c) => FANDOM_BY_SLUG[c.slug] === undefined)
      .map((c) => ({
        categorySlug: c.slug,
        name: c.name,
        total: c.total,
        withPoster: c.withPoster,
        withSynopsis: c.withSynopsis,
      }))
    return [...ordered, ...extra]
  }, [perCategory])

  const refresh = useCallback(() => {
    load()
    refreshQueues()
  }, [load, refreshQueues])

  return {
    totalTitles: stats?.totalContents ?? 0,
    totalGenres: stats?.totalGenres ?? 0,
    withPoster: stats?.contentsWithPoster ?? 0,
    withSynopsis: stats?.contentsWithSynopsis ?? 0,
    withYear: stats?.contentsWithYear ?? 0,
    perCategory: categoryRows,
    openFeedback: stats?.openFeedback ?? feedback.filter((f) => f.status === 'open').length,
    pendingSubmissions:
      stats?.pendingSubmissions ?? submissions.filter((s) => s.status === 'pending').length,
    accountCount: stats?.totalUsers ?? accounts.length,
    adminCount: accounts.filter((a) => a.role === 'admin').length,
    loading,
    error,
    refresh,
  }
}

/** Most-used genres, from /admin/stats/genres. */
export function useTopGenres(): { label: string; value: number }[] {
  const [genres, setGenres] = useState<adminApi.AdminGenreStat[]>([])

  useEffect(() => {
    let cancelled = false
    void adminApi
      .getGenreStats(20)
      .then((all) => {
        if (!cancelled) setGenres(all)
      })
      .catch(() => {
        // The page renders its other panels fine without this.
        if (!cancelled) setGenres([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  return useMemo(() => genres.map((g) => ({ label: g.name, value: g.count })), [genres])
}

// ---------- moderation ----------

export interface ModerationResult {
  feedback: ReturnType<typeof useAdminData>['feedback']
  submissions: ReturnType<typeof useAdminData>['submissions']
  setFeedbackStatus: ReturnType<typeof useAdminData>['setFeedbackStatus']
  setSubmissionStatus: ReturnType<typeof useAdminData>['setSubmissionStatus']
  deleteFeedback: ReturnType<typeof useAdminData>['deleteFeedback']
  loading: ReturnType<typeof useAdminData>['loading']
  error: ReturnType<typeof useAdminData>['error']
  refresh: ReturnType<typeof useAdminData>['refresh']
}

/** Both moderation queues in one place, for the dashboard summary. */
export function useModeration(): ModerationResult {
  const admin = useAdminData()
  return {
    feedback: admin.feedback,
    submissions: admin.submissions,
    setFeedbackStatus: admin.setFeedbackStatus,
    setSubmissionStatus: admin.setSubmissionStatus,
    deleteFeedback: admin.deleteFeedback,
    loading: admin.loading,
    error: admin.error,
    refresh: admin.refresh,
  }
}
