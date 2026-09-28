// merchandise.service — the shop showcase.
import { http } from './http'
import type { Paginated } from '../types/api'
import type {
  MerchandiseEdit,
  MerchandiseFilters,
  MerchandiseItem,
  MerchandisePayload,
  MerchandiseSort,
  UpcomingRelease,
} from '../types/models'

export const MERCHANDISE_SORT_OPTIONS: { value: MerchandiseSort; label: string }[] = [
  { value: 'name', label: 'A – Z' },
  { value: 'newest', label: 'Newest first' },
  { value: 'views', label: 'Most viewed' },
]

export function getMerchandise(filters: MerchandiseFilters = {}): Promise<Paginated<MerchandiseItem>> {
  return http.get<Paginated<MerchandiseItem>>('/community/merchandise', {
    categoryId: filters.categoryId,
    search: filters.search,
    isUpcoming: filters.isUpcoming,
    sort: filters.sort,
    page: filters.page,
    pageSize: filters.pageSize,
  })
}

export function getMerchandiseById(id: number): Promise<MerchandiseItem> {
  return http.get<MerchandiseItem>(`/community/merchandise/${id}`)
}

export function createMerchandise(payload: MerchandisePayload): Promise<MerchandiseItem> {
  return http.post<MerchandiseItem>('/admin/merchandise', payload)
}

export function updateMerchandise(id: number, edit: MerchandiseEdit): Promise<MerchandiseItem> {
  return http.put<MerchandiseItem>(`/admin/merchandise/${id}`, edit)
}

export function deleteMerchandise(id: number): Promise<void> {
  return http.delete<void>(`/admin/merchandise/${id}`)
}

export function getUpcomingReleases(): Promise<UpcomingRelease[]> {
  return http.get<UpcomingRelease[]>('/community/upcoming-releases')
}
