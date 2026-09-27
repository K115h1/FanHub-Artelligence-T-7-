// AdminDataProvider — the admin panel's data layer.
//
// There is no API yet, so this holds everything the panel needs on the device:
//
//   * the 2,490-title catalogue generated from the same JSON that produced the
//     database (src/data/catalog.json, verified against the seed SQL by
//     scripts/verifyCatalog.mjs), plus any admin edits, additions and deletions
//   * the feedback and fan-submission moderation queues
//
// The catalogue itself is NOT persisted — it is 441KB of generated data. Only
// the admin's changes to it are, so a reload keeps your work without the
// bundle carrying two copies of the same titles.
//
// When the API lands this provider is deleted and the hooks fetch instead; the
// hook signatures are the seam.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import catalogJson from '../../data/catalog.json'
import type { FanSubmission, FeedbackItem, FeedbackStatus, SubmissionStatus } from '../../types/models'
import { SEED_FEEDBACK, SEED_SUBMISSIONS } from './seed'
import type { CatalogEdit, CatalogRow, ContentOverrides, FandomKey } from './types'

const OVERRIDES_KEY = 'fanhub.admin.content.v1'
const FEEDBACK_KEY = 'fanhub.admin.feedback.v1'
const SUBMISSIONS_KEY = 'fanhub.admin.submissions.v1'

const BASE_CATALOGUE = catalogJson as unknown as CatalogRow[]

export const EMPTY_OVERRIDES: ContentOverrides = { edits: {}, deleted: [], added: [] }

/** Reads a persisted key, falling back to the seed when absent or corrupt. */
function load<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export interface AdminDataValue {
  /** Catalogue with admin edits applied and deletions removed. */
  rows: CatalogRow[]
  /** Row count before deletions — the "original catalogue" figure for stats. */
  baseCount: number
  /** How many rows the admin has changed, added or removed. */
  changeCount: number

  updateRow: (id: number, patch: Partial<CatalogEdit>) => void
  addRow: (draft: Omit<CatalogRow, 'id'>) => void
  /** Remove a row from the catalogue. Reversible via revertRow. */
  deleteRow: (id: number) => void
  /** Restore a single deleted row, or drop an edit on a live row. */
  revertRow: (id: number) => void
  /** Remove every admin change, returning the catalogue to its loaded state. */
  resetContent: () => void

  feedback: FeedbackItem[]
  setFeedbackStatus: (id: string, status: FeedbackStatus) => void

  submissions: FanSubmission[]
  setSubmissionStatus: (id: string, status: SubmissionStatus) => void
}

const AdminDataContext = createContext<AdminDataValue | null>(null)

export function useAdminData(): AdminDataValue {
  const value = useContext(AdminDataContext)
  if (!value) throw new Error('useAdminData must be used inside <AdminDataProvider>')
  return value
}

export function AdminDataProvider({ children }: { children: React.ReactNode }) {
  const [overrides, setOverrides] = useState<ContentOverrides>(() =>
    load<ContentOverrides>(OVERRIDES_KEY, EMPTY_OVERRIDES),
  )
  const [feedback, setFeedback] = useState<FeedbackItem[]>(() =>
    load<FeedbackItem[]>(FEEDBACK_KEY, SEED_FEEDBACK),
  )
  const [submissions, setSubmissions] = useState<FanSubmission[]>(() =>
    load<FanSubmission[]>(SUBMISSIONS_KEY, SEED_SUBMISSIONS),
  )

  useEffect(() => {
    window.localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides))
  }, [overrides])
  useEffect(() => {
    window.localStorage.setItem(FEEDBACK_KEY, JSON.stringify(feedback))
  }, [feedback])
  useEffect(() => {
    window.localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions))
  }, [submissions])

  // Layer the admin's changes over the read-only catalogue.
  const rows = useMemo(() => {
    const removed = new Set(overrides.deleted)
    const merged = BASE_CATALOGUE.filter((row) => !removed.has(row.id)).map((row) => {
      const edit = overrides.edits[row.id]
      return edit ? { ...row, ...edit, genres: edit.genres ?? row.genres } : row
    })
    return [...merged, ...overrides.added]
  }, [overrides])

  const updateRow = useCallback((id: number, patch: Partial<CatalogEdit>) => {
    setOverrides((prev) => ({
      ...prev,
      edits: { ...prev.edits, [id]: { ...prev.edits[id], ...patch } },
    }))
  }, [])

  const addRow = useCallback((draft: Omit<CatalogRow, 'id'>) => {
    setOverrides((prev) => {
      // Ids continue past the end of the fandom's block so a new row can never
      // collide with a generated one.
      const highest = Math.max(0, ...prev.added.map((row) => row.id))
      const inFandom = BASE_CATALOGUE.filter((row) => row.fandom === draft.fandom)
      const base = inFandom.length ? Math.max(...inFandom.map((row) => row.id)) : highest
      return {
        ...prev,
        added: [...prev.added, { ...draft, id: Math.max(base, highest) + 1 }],
      }
    })
  }, [])

  const deleteRow = useCallback((id: number) => {
    setOverrides((prev) =>
      prev.deleted.includes(id)
        ? prev
        : { ...prev, deleted: [...prev.deleted, id] },
    )
  }, [])

  const revertRow = useCallback((id: number) => {    setOverrides((prev) => {
      const edits = { ...prev.edits }
      delete edits[id]
      return {
        edits,
        deleted: prev.deleted.filter((rowId) => rowId !== id),
        added: prev.added.filter((row) => row.id !== id),
      }
    })
  }, [])

  const resetContent = useCallback(() => setOverrides(EMPTY_OVERRIDES), [])

  const setFeedbackStatus = useCallback((id: string, status: FeedbackStatus) => {
    setFeedback((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)))
  }, [])

  const setSubmissionStatus = useCallback((id: string, status: SubmissionStatus) => {
    setSubmissions((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)))
  }, [])

  const changeCount = useMemo(
    () =>
      Object.keys(overrides.edits).length + overrides.deleted.length + overrides.added.length,
    [overrides],
  )

  const value = useMemo<AdminDataValue>(
    () => ({
      rows,
      baseCount: BASE_CATALOGUE.length,
      changeCount,
      updateRow,
      addRow,
      deleteRow,
      revertRow,
      resetContent,
      feedback,
      setFeedbackStatus,
      submissions,
      setSubmissionStatus,
    }),
    [
      rows,
      changeCount,
      updateRow,
      addRow,
      deleteRow,
      revertRow,
      resetContent,
      feedback,
      setFeedbackStatus,
      submissions,
      setSubmissionStatus,
    ],
  )

  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>
}

// ---------- shared derivations ----------

/** Display name for each fandom grouping, used in filters and stats. */
export const FANDOM_LABELS: Record<FandomKey, string> = {
  movies: 'Movies',
  anime: 'Anime',
  games: 'Gaming',
  comics: 'Comics',
  kpop: 'K-Pop',
  tvshows: 'TV Shows',
}

/** Every distinct genre in the catalogue, alphabetically. */
export function allGenres(rows: CatalogRow[]): string[] {
  return [...new Set(rows.flatMap((row) => row.genres))].sort((a, b) => a.localeCompare(b))
}
