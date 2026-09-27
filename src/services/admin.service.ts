// admin.service — the control panel's data layer.
//
// Every call here needs an admin token; the API enforces that with
// [Authorize(Roles = "admin")], so a 403 here means the session lost the role.
import { http } from './http'
import type { Paginated } from '../types/api'
import type { ContentDetail, ContentSummary, FeedbackEntry, SubmissionEntry, Account } from '../types/models'

// --- dashboard figures ---

export interface AdminStats {
  totalContents: number
  totalCategories: number
  totalGenres: number
  contentsWithPoster: number
  contentsWithSynopsis: number
  totalUsers: number
  openFeedback: number
  pendingSubmissions: number
}

export interface AdminCategoryStat {
  slug: string
  name: string
  total: number
  withPoster: number
  withSynopsis: number
}

export function getStats(): Promise<AdminStats> {
  return http.get<AdminStats>('/admin/stats')
}

export function getCategoryStats(): Promise<AdminCategoryStat[]> {
  return http.get<AdminCategoryStat[]>('/admin/stats/categories')
}

// --- accounts ---

export function getUsers(): Promise<Account[]> {
  return http.get<Account[]>('/admin/users')
}

/** Role is "admin" or "registered". The API rejects anything else. */
export function updateUserRole(userId: number, role: string): Promise<void> {
  return http.put(`/admin/users/${userId}/role`, { role })
}

// --- catalogue management ---

export interface AdminContentFilters {
  search?: string
  category?: string
  page?: number
  pageSize?: number
  sort?: string
}

export function browseContent(filters: AdminContentFilters = {}): Promise<Paginated<ContentSummary>> {
  return http.get<Paginated<ContentSummary>>('/admin/contents', {
    search: filters.search,
    category: filters.category,
    page: filters.page,
    pageSize: filters.pageSize,
    sort: filters.sort,
  })
}

export interface CreateContentPayload {
  title: string
  slug: string
  categoryId: number
  contentType: string
  status?: string
  shortSynopsis?: string
  synopsis?: string
  releaseYear?: number
  posterPath?: string
}

export function createContent(payload: CreateContentPayload): Promise<ContentDetail> {
  return http.post<ContentDetail>('/admin/contents', payload)
}

export function updateContent(
  id: number,
  patch: Partial<Omit<CreateContentPayload, 'slug' | 'categoryId' | 'contentType'>>,
): Promise<ContentDetail> {
  return http.put<ContentDetail>(`/admin/contents/${id}`, patch)
}

export function deleteContent(id: number): Promise<void> {
  return http.delete(`/admin/contents/${id}`)
}

// --- moderation queues ---

export function getFeedback(
  status?: string,
  page = 1,
  pageSize = 25,
): Promise<Paginated<FeedbackEntry>> {
  return http.get<Paginated<FeedbackEntry>>('/admin/feedback', { status, page, pageSize })
}

/** Status is open | reviewed | resolved | dismissed. */
export function updateFeedbackStatus(id: number, status: string): Promise<void> {
  return http.put(`/admin/feedback/${id}/status`, { status })
}

export function deleteFeedback(id: number): Promise<void> {
  return http.delete(`/admin/feedback/${id}`)
}

export function getSubmissions(
  status?: string,
  page = 1,
  pageSize = 25,
): Promise<Paginated<SubmissionEntry>> {
  return http.get<Paginated<SubmissionEntry>>('/admin/submissions', { status, page, pageSize })
}

/** Status is pending | approved | rejected. */
export function updateSubmissionStatus(id: number, status: string): Promise<void> {
  return http.put(`/admin/submissions/${id}/status`, { status })
}
