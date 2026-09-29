// event.service, fan events and the location-aware listing.
import { http } from './http'
import type { FanEvent } from '../types/models'

export interface EventFilters {
  categoryId?: number
}

/** Upcoming first. Events with no date sort last rather than being dropped. */
export function getEvents(filters: EventFilters = {}): Promise<FanEvent[]> {
  return http.get<FanEvent[]>('/community/events', { categoryId: filters.categoryId })
}

export function getEventById(id: number): Promise<FanEvent> {
  return http.get<FanEvent>(`/community/events/${id}`)
}
