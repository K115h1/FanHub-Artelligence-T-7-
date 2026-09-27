// merchandise.service — the shop showcase and the upcoming-releases list.
import { http } from './http'
import type { MerchandiseItem, UpcomingRelease } from '../types/models'

export function getMerchandise(categoryId?: number): Promise<MerchandiseItem[]> {
  return http.get<MerchandiseItem[]>('/community/merchandise', { categoryId })
}

export function getUpcomingReleases(): Promise<UpcomingRelease[]> {
  return http.get<UpcomingRelease[]>('/community/upcoming-releases')
}
