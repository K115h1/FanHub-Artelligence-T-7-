// feedback.service — sending feedback from the public form, and reading back
// what the signed-in visitor has already sent.
//
// Reading the moderation queue lives in admin.service; this is the visitor's
// side of the same `feedback` table.
import { http } from './http'
import type { FeedbackEntry } from '../types/models'

export interface SubmitFeedbackPayload {
  type: 'bug' | 'suggestion' | 'query' | 'content'
  message: string
  email?: string
  /** Optional 1–5 score. Only meaningful for `content`. */
  rating?: number
}

/**
 * POST /community/feedback.
 *
 * The bearer token is deliberately sent even though the endpoint is
 * [AllowAnonymous]. It used to pass `auth: false`, which dropped the
 * Authorization header entirely — so a signed-in fan's report reached the
 * database with a null user_id and the admin queue showed every entry as
 * anonymous, with no way to tell who sent what. http.ts only attaches the
 * header when a token exists, so an anonymous submit is unaffected and still
 * works signed out; the server just reads no claim and stores a null author.
 */
export function submitFeedback(payload: SubmitFeedbackPayload): Promise<FeedbackEntry> {
  return http.post<FeedbackEntry>('/community/feedback', payload)
}

/**
 * GET /community/feedback/mine — the caller's own entries, newest first.
 *
 * Requires an account: anonymous rows have no user id, so there is nothing to
 * scope the query to. Returns a bare array, not a page.
 */
export function getMyFeedback(pageSize = 25): Promise<FeedbackEntry[]> {
  return http.get<FeedbackEntry[]>('/community/feedback/mine', { pageSize })
}
