// submission.service, fan submissions that need an administrator's approval.
import { http } from './http'
import type { SubmissionEntry } from '../types/models'

// The three kinds of user-created content the SRS names: rich-text articles,
// card-based character profiles, and timeline-style event highlights. These are
// the exact strings the API's SubmissionKind enum parses.
export const SUBMISSION_KINDS = [
  {
    value: 'article',
    label: 'Article',
    blurb: 'A review, theory, guide or retrospective.',
  },
  {
    value: 'character_profile',
    label: 'Character profile',
    blurb: 'A card for a character, with a bio and a series to attach it to.',
  },
  {
    value: 'event_highlight',
    label: 'Event highlight',
    blurb: 'A write-up of a convention, screening or meetup.',
  },
] as const

export type SubmissionKind = (typeof SUBMISSION_KINDS)[number]['value']

export interface CreateSubmissionPayload {
  categoryId: number
  /** Required, the moderation queue filters and routes on this. */
  kind: SubmissionKind
  title: string
  body: string
}

/** A human label for a kind, for the member's own list of what they sent. */
export function submissionKindLabel(value: string): string {
  return SUBMISSION_KINDS.find((kind) => kind.value === value)?.label ?? value
}

export function submitContent(payload: CreateSubmissionPayload): Promise<SubmissionEntry> {
  return http.post<SubmissionEntry>('/community/submissions', payload)
}

export function getMySubmissions(page = 1, pageSize = 25): Promise<SubmissionEntry[]> {
  return http.get<SubmissionEntry[]>('/community/submissions/mine', { page, pageSize })
}
