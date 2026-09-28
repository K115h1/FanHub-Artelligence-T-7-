// Feature: Admin Control Panel — business logic layer.
//
// Pages under pages/admin/ read data through these hooks and never touch
// services or localStorage directly, so the data source is swappable in one
// file. It used to be: a bundled 2,934-row catalogue JSON with edits layered on
// in localStorage, and seeded moderation queues. It is now the API, which means
// an administrator's edits are real rows that the public site reads and that the
// next administrator sees.
//
// The catalogue is paged in SQL. It is ~2,934 rows, and the content manager
// already showed 25 at a time, so filtering 2,934 strings per keystroke in the
// browser was paying for a bundle the server already indexes.

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

/**
 * The category slug to send when filtering by fandom is resolved from the
 * server's own category list, not hardcoded — see categorySlugs.ts for why the
 * database and the seed file disagree about the TV Shows slug.
 */

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
    // The list endpoint returns the short synopsis; the long one is only on the
    // detail endpoint, and the table shows a one-line preview either way.
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
  // Bumped on every query/page change so a slow request cannot overwrite a
  // newer one. Without it, typing quickly shows results for an earlier prefix.
  const runId = useRef(0)

  // The server's own category slugs, so a filter sends the slug the database
  // actually holds rather than the one the seed file writes. Falls back to the
  // hardcoded map only if the category request failed.
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

  // Genre names for the filter dropdown, plus the name->id map the query needs.
  // Fetched once and never re-fetched: the set of genres is a property of the
  // catalogue, not of the current filters.
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
        // A missing genre dropdown is a smaller problem than an error banner
        // over a working table, and the filter is optional.
        if (!cancelled) {
          setGenres([])
          setGenreIdByName({})
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  // The query holds a genre NAME because that is what the dropdown shows, while
  // the API filters by id. Until the genre list has loaded this is null, so the
  // first render with a genre selected fetches everything rather than the wrong
  // subset — a wrong answer that looked filtered was the worse failure.
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

  // Any filter change returns to page 1 — staying on page 7 of a new, much
  // shorter result set is disorienting.
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

/**
 * Dashboard figures, straight from /admin/stats.
 *
 * These used to be derived by counting a bundled array, which meant they
 * described the seed data rather than the database: a title an administrator had
 * added or deleted moved no number here. The API computes them with COUNTs.
 */
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

  // The per-category rows arrive keyed by slug; the table wants them in the
  // canonical fandom order with display names, and a category the API knows
  // about but FANDOM_ORDER does not still gets a row rather than vanishing.
  // Matched through FANDOM_BY_SLUG so the live database's 'tv-shows' and the
  // seed's 'tvshows' both land on the TV Shows row instead of doubling it.
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

    // Manga and Cosplay exist in the categories table but are not fandoms the
    // panel filters on, so they are appended rather than dropped.
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

/**
 * Most-used genres, from /admin/stats/genres.
 *
 * This used to be counted in the browser by walking every row of the bundled
 * catalogue. With paging in SQL the browser no longer holds the catalogue, so
 * counting what is on screen would report 25 rows' worth of genres as if it were
 * the whole thing. The server groups the join table instead.
 */
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
        // The page renders its other panels fine without this table.
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
