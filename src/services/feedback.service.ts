// feedback.service — sending feedback from the public form.
//
// Reading the moderation queue lives in admin.service; this is the write side
// the visitor uses.
import { http } from './http'
import type { FeedbackEntry } from '../types/models'

export interface SubmitFeedbackPayload {
  type: 'bug' | 'suggestion' | 'query' | 'content'
  message: string
  email?: string
  /** Optional 1–5 satisfaction score. */
  rating?: number
}

/**
 * Public by design, so `auth: false` — the form works signed out. When a
 * visitor is signed in the API records the account against the entry anyway.
 */
export function submitFeedback(payload: SubmitFeedbackPayload): Promise<FeedbackEntry> {
  return http.post<FeedbackEntry>('/community/feedback', payload, { auth: false })
}
