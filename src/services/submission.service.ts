// submission.service — fan submissions that need an administrator's approval.
import { http } from './http'
import type { SubmissionEntry } from '../types/models'

export interface CreateSubmissionPayload {
  categoryId: number
  title: string
  body: string
}

export function submitContent(payload: CreateSubmissionPayload): Promise<SubmissionEntry> {
  return http.post<SubmissionEntry>('/community/submissions', payload)
}

export function getMySubmissions(page = 1, pageSize = 25): Promise<SubmissionEntry[]> {
  return http.get<SubmissionEntry[]>('/community/submissions/mine', { page, pageSize })
}
