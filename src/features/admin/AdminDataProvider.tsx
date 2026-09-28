// AdminDataProvider — the admin panel's data layer, backed by the API.
//
// This used to hold everything on the device: the whole 2,934-title catalogue
// was bundled as JSON and layered with edits in localStorage, and the feedback
// and submission queues were seeded arrays. Every "edit" was a browser-local
// overlay that vanished for the next administrator and was never visible to a
// visitor. It now reads and writes the same tables the public site reads.
//
// What changed and why it is shaped this way:
//
//   * The catalogue is no longer held in memory. It is ~2,934 rows and the
//     content manager already paged it to 25 at a time, so paging now happens in
//     SQL (see useCatalog in hooks.ts) instead of filtering a bundled array.
//     That is what lets the 441KB JSON drop out of the bundle entirely.
//   * Moderation queues keep their array shape. The pages filter them by status
//     and free text across the whole set, and both queues are small enough that
//     a single fetch beats paging. Mutations are optimistic: the row updates
//     immediately and reverts if the API refuses, because a moderator working
//     through a queue should not wait on a round trip per click.
//
// Every call here is [Authorize(Roles = "admin")], so a 403 means the session
// lost the role rather than that the panel is broken.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import * as adminApi from '../../services/admin.service'
import type { FeedbackEntry, SubmissionEntry } from '../../types/models'
import type { FandomKey } from './types'

export interface AdminDataValue {
  /** The whole feedback queue, newest first as the server orders it. */
  feedback: FeedbackEntry[]
  /** The whole submission queue, newest first. */
  submissions: SubmissionEntry[]
  loading: boolean
  error: string | null

  /** Move a feedback entry to a new status. Optimistic, reverts on failure. */
  setFeedbackStatus: (id: number, status: string) => Promise<void>
  /** Remove a feedback entry. */
  deleteFeedback: (id: number) => Promise<void>
  /** Move a submission to pending/approved/rejected. */
  setSubmissionStatus: (id: number, status: string, note?: string) => Promise<void>
  /** Re-read both queues from the server. */
  refresh: () => void
}

const AdminDataContext = createContext<AdminDataValue | null>(null)

export function useAdminData(): AdminDataValue {
  const value = useContext(AdminDataContext)
  if (!value) throw new Error('useAdminData must be used inside <AdminDataProvider>')
  return value
}

/** Feedback and submissions are small; one page each is the whole queue. */
const QUEUE_SIZE = 100

export function AdminDataProvider({ children }: { children: ReactNode }) {
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([])
  const [submissions, setSubmissions] = useState<SubmissionEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Bumped by refresh() so an in-flight load knows it has been superseded. A
  // ref, not state: writing it must not itself schedule a render.
  const runId = useRef(0)

  const load = useCallback(() => {
    const mine = ++runId.current
    setLoading(true)
    setError(null)

    void Promise.allSettled([
      adminApi.getFeedback(undefined, 1, QUEUE_SIZE),
      adminApi.getSubmissions(undefined, 1, QUEUE_SIZE),
    ]).then(([fb, subs]) => {
      if (mine !== runId.current) return

      // One failure must not blank the other queue, so each is settled on its own.
      if (fb.status === 'fulfilled') setFeedback(fb.value.items)
      else setError('The feedback queue could not be loaded.')

      if (subs.status === 'fulfilled') setSubmissions(subs.value.items)
      else setError((prev) => prev ?? 'The submissions queue could not be loaded.')

      setLoading(false)
    })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const setFeedbackStatus = useCallback(async (id: number, status: string) => {
    const before = feedback
    // Optimistic: the queue is a work list, and waiting on the round trip to
    // move a card makes working a queue feel broken.
    setFeedback((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)))
    try {
      await adminApi.updateFeedbackStatus(id, status)
    } catch (err) {
      setFeedback(before)
      setError(err instanceof Error ? err.message : 'That status change did not save.')
    }
  }, [feedback])

  const deleteFeedback = useCallback(async (id: number) => {
    const before = feedback
    setFeedback((prev) => prev.filter((item) => item.id !== id))
    try {
      await adminApi.deleteFeedback(id)
    } catch (err) {
      setFeedback(before)
      setError(err instanceof Error ? err.message : 'That entry could not be deleted.')
    }
  }, [feedback])

  const setSubmissionStatus = useCallback(
    async (id: number, status: string, note?: string) => {
      const before = submissions
      const decidedAt = new Date().toISOString()

      // Optimistic, so the row moves out of the pending group immediately. The
      // note and decision time are applied here too rather than waiting for a
      // refetch, because the fan's own list shows them.
      setSubmissions((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, status, moderatorNote: note ?? item.moderatorNote, decidedAt }
            : item,
        ),
      )

      try {
        await adminApi.updateSubmissionStatus(id, status, note)
      } catch (err) {
        setSubmissions(before)
        setError(err instanceof Error ? err.message : 'That decision did not save.')
      }
    },
    [submissions],
  )

  const refresh = useCallback(() => {
    load()
  }, [load])

  const value = useMemo<AdminDataValue>(
    () => ({
      feedback,
      submissions,
      loading,
      error,
      setFeedbackStatus,
      deleteFeedback,
      setSubmissionStatus,
      refresh,
    }),
    [feedback, submissions, loading, error, setFeedbackStatus, deleteFeedback, setSubmissionStatus, refresh],
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

/**
 * The order categories appear in, for stats tables and filter dropdowns.
 *
 * One list, because FANDOM_LABELS being a separate map is how "tvshows" ended
 * up missing from the stats while every other panel knew about it.
 */
export const FANDOM_ORDER: FandomKey[] = ['movies', 'anime', 'games', 'comics', 'kpop', 'tvshows']
