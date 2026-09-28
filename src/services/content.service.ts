// content.service — the Content Explorer and the detail page.
//
// Thin by design: call the API, hand back the typed result. No caching, no
// retry, no state — those belong in the page that owns the data.
import { http } from './http'
import type { Paginated, SortOption } from '../types/api'
import type { CategoryDto, ContentDetail, ContentSummary, Genre } from '../types/models'

export interface ContentFilters {
  search?: string
  /** Category slug, e.g. "anime". */
  category?: string
  genreId?: number
  /** ContentType values as the API names them: movie, series, game, comic… */
  type?: string
  status?: string
  /**
   * Inclusive release-year bounds. Either alone is a half-open range; setting
   * either one excludes titles with no release year, since a title with no year
   * cannot be inside any range.
   */
  yearFrom?: number
  yearTo?: number
  page?: number
  pageSize?: number
  sort?: string
}

export const CONTENT_SORT_OPTIONS: SortOption[] = [
  { value: 'popular', label: 'Most popular' },
  { value: 'title', label: 'A–Z' },
  { value: 'year', label: 'Newest first' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'newest', label: 'Recently added' },
]

/** One page of titles. `pageSize` is capped at 100 by the API. */
export function getContents(filters: ContentFilters = {}): Promise<Paginated<ContentSummary>> {
  return http.get<Paginated<ContentSummary>>('/contents', {
    search: filters.search,
    category: filters.category,
    genre: filters.genreId,
    type: filters.type,
    status: filters.status,
    yearFrom: filters.yearFrom,
    yearTo: filters.yearTo,
    page: filters.page,
    pageSize: filters.pageSize,
    sort: filters.sort,
  })
}

/**
 * A title by slug. Slug is unique per category, not globally — "akira" exists
 * under movies, anime and comics — so pass `category` when it could be ambiguous.
 */
export function getContentBySlug(slug: string, category?: string): Promise<ContentDetail> {
  return http.get<ContentDetail>(`/contents/${encodeURIComponent(slug)}`, { category })
}

export function getContentById(id: number): Promise<ContentDetail> {
  return http.get<ContentDetail>(`/contents/id/${id}`)
}

export function getCategories(): Promise<CategoryDto[]> {
  return http.get<CategoryDto[]>('/contents/categories')
}

export function getGenres(categoryId?: number): Promise<Genre[]> {
  return http.get<Genre[]>('/contents/genres', { categoryId })
}

// --- per-user actions, all of these need a token ---

/** Rate 1–5. Re-rating replaces the previous value rather than adding a row. */
export function rateContent(contentId: number, stars: number): Promise<{ contentId: number; stars: number }> {
  return http.post(`/contents/${contentId}/rating`, { stars })
}

export function clearRating(contentId: number): Promise<void> {
  return http.delete(`/contents/${contentId}/rating`)
}

/**
 * Bookmark toggle. The API returns the resulting state, so the button can flip
 * to whatever is now true rather than assuming.
 */
export function toggleBookmark(
  contentId: number,
  note?: string,
): Promise<{ contentId: number; saved: boolean }> {
  return http.post(`/contents/${contentId}/bookmark`, { note: note ?? null })
}

export function getBookmarks(): Promise<ContentSummary[]> {
  return http.get<ContentSummary[]>('/contents/bookmarks')
}
