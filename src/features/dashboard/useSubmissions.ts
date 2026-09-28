// useSubmissions — the member's own fan submissions: listing them and adding one.
//
// The endpoint and the client service already existed; nothing was calling them
// from the member's side, so this is the first code path that actually creates a
// row in fan_submissions. The admin moderation queue reads the same table, which
// is why a submission lands as 'pending' and is invisible elsewhere until an
// administrator approves it.
//
// State lives here rather than in the form so the submitted item appears in the
// list immediately, from the server's response, instead of the form clearing
// itself and the list refetching a beat later. Both would work; this one does not
// flash an empty list in between.
import { useCallback, useEffect, useRef, useState } from 'react'
import { getMySubmissions, submitContent, type CreateSubmissionPayload } from '../../services/submission.service'
import { getCategories } from '../../services/content.service'
import { useAuth } from '../../context/AuthContext'
import type { CategoryDto, SubmissionEntry } from '../../types/models'

export interface UseSubmissions {
  /** Every category, for the form's picker. Empty while loading or signed out. */
  categories: CategoryDto[]
  /** Newest first, as the server returns them. */
  submissions: SubmissionEntry[]
  loading: boolean
  /** True once a load has finished and produced nothing. */
  isEmpty: boolean
  error: string | null
  /** Resolves to the created entry, or null when the submission was rejected. */
  submit(payload: CreateSubmissionPayload): Promise<SubmissionEntry | null>
  submitting: boolean
  /** Clears the error left by the last failed submit. */
  clearError(): void
}

export function useSubmissions(): UseSubmissions {
  const { isAuthed } = useAuth()
  const [submissions, setSubmissions] = useState<SubmissionEntry[]>([])
  const [categories, setCategories] = useState<CategoryDto[]>([])
  const [loading, setLoading] = useState(isAuthed)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  // A sign-out mid-flight must not be able to write results into a page that no
  // longer has a member. Mirrors the cancelled flag in useDashboardSummary.
  const runId = useRef(0)

  useEffect(() => {
    if (!isAuthed) {
      setSubmissions([])
      setCategories([])
      setLoading(false)
      setLoaded(true)
      return
    }

    const mine = ++runId.current
    setLoading(true)
    setError(null)

    // The category list is public and the same one the explorer uses, so it is
    // requested even for a signed-out visitor... except this panel is only
    // rendered when signed in, so there is nothing to request in that case.
    void Promise.allSettled([getMySubmissions(), getCategories()]).then(([subs, cats]) => {
      if (mine !== runId.current) return

      if (subs.status === 'fulfilled') setSubmissions(subs.value)
      else {
        setSubmissions([])
        setError('Your submissions could not be loaded.')
      }

      if (cats.status === 'fulfilled') setCategories(cats.value)
      setLoading(false)
      setLoaded(true)
    })
  }, [isAuthed])

  const submit = useCallback(async (payload: CreateSubmissionPayload) => {
    setSubmitting(true)
    setError(null)
    try {
      const created = await submitContent(payload)
      // Prepend rather than refetch: the server's response is the record, and a
      // refetch would be a second round trip to learn what we were just told.
      setSubmissions((prev) => [created, ...prev.filter((s) => s.id !== created.id)])
      return created
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That submission could not be saved.')
      return null
    } finally {
      setSubmitting(false)
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return {
    categories,
    submissions,
    loading: loading || (isAuthed && !loaded),
    isEmpty: loaded && !loading && submissions.length === 0,
    error,
    submit,
    submitting,
    clearError,
  }
}
