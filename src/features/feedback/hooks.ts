// Feature: Feedback, business logic layer.
//
// Owns the submit-and-track behaviour for pages/Feedback.tsx. The page used to
// keep its own list in localStorage, which meant a submitted report lived only
// in the browser that wrote it: no row reached MySQL, and the admin panel at
// /admin/feedback, which reads that table through GET /admin/feedback, had
// nothing to show. Both halves now go through feedback.service.
//
// The type categorisation (bug / suggestion / query / content) stays on the
// page, because it is presentation: it decides which icon and which question to
// ask, not what gets sent.
import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../../types/api'
import type { FeedbackEntry } from '../../types/models'
import { getMyFeedback, submitFeedback, type SubmitFeedbackPayload } from '../../services/feedback.service'

interface SubmitState {
  /** True while the POST is in flight, so the button cannot be double-submitted. */
  submitting: boolean
  /** The server's wording for a rejected submission, or null. */
  error: string | null
  submit: (payload: SubmitFeedbackPayload) => Promise<FeedbackEntry | null>
  /** Dismiss the error without resubmitting. */
  clearError: () => void
}

/**
 * Sends one piece of feedback and reports what the server stored.
 *
 * Resolves to the created entry, or null when the call failed, the reason is
 * on `error`. Returning the entry rather than only throwing lets the page add
 * it to the list immediately instead of refetching to discover what it just
 * wrote.
 */
export function useSubmitFeedback(): SubmitState {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = useCallback(async (payload: SubmitFeedbackPayload) => {
    setSubmitting(true)
    setError(null)
    try {
      return await submitFeedback(payload)
    } catch (err) {
      // The API answers 400 with { message }, and http.ts already prefers that
      // over invented wording, so this is the validation text as written.
      setError(err instanceof ApiError || err instanceof Error
        ? err.message
        : 'That could not be sent. Please try again.')
      return null
    } finally {
      setSubmitting(false)
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return { submitting, error, submit, clearError }
}

interface MyFeedbackState {
  entries: FeedbackEntry[]
  loading: boolean
  error: string | null
  /** Dropped when the visitor signs out, so one fan's list is never shown to another. */
  signedIn: boolean
  refresh: () => void
}

/**
 * The signed-in visitor's own feedback, newest first.
 *
 * The API filters on the user id in the token, so this cannot return anyone
 * else's rows. Loading is skipped entirely when there is no session: the
 * endpoint requires one, and calling it signed out would only ever produce a
 * 401. Anonymous visitors see the form and a prompt to sign in instead, and
 * lose the history they had under the old localStorage key.
 */
export function useMyFeedback(userId: string | null): MyFeedbackState {
  const [entries, setEntries] = useState<FeedbackEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    if (userId === null) {
      setEntries([])
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    void getMyFeedback()
      .then((rows) => {
        if (cancelled) return
        // The server already orders by created_at desc, but the client sorts
        // too: entries added by submit() go in at the front optimistically and
        // this list is rendered as one array.
        setEntries([...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Your feedback history could not be loaded.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [userId])

  useEffect(() => load(), [load])

  return { entries, loading, error, signedIn: userId !== null, refresh: load }
}
