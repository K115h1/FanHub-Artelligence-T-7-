// AdminDataProvider, the admin panel's data layer, backed by the API.
//
// The catalogue is paged in SQL (useCatalog in hooks.ts) rather than held in the
// browser, so an edit is a real row the public site reads. The moderation queues
// keep their array shape: both are small enough that one fetch beats paging, and
// mutations are optimistic so working a queue does not wait on a round trip per
// click. A 403 here means the session lost the admin role.
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
