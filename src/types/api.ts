// API contracts shared by every service in src/services/.
// Pages never see a raw fetch response — they see these shapes.

// The API's paged list response. Field names match what the C# PagedResponse<T>
// actually returns, so a service can return it without reshaping.
export interface Paginated<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  pageCount: number
}

// A normalised failure. Every service rejects with this rather than a raw
// Response, so callers can show `error.message` without inspecting status codes.
export class ApiError extends Error {
  readonly status: number
  /** Field-level messages, when the API returned a validation problem. */
  readonly errors?: Record<string, string[]>
  /** True when the request never reached the API (server down, CORS, timeout). */
  readonly isNetworkError: boolean

  constructor(
    message: string,
    status = 0,
    options: { errors?: Record<string, string[]>; isNetworkError?: boolean } = {},
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = options.errors
    this.isNetworkError = options.isNetworkError ?? false
  }
}

// Wraps a single-item payload, for endpoints that answer 200 with an object.
export interface ApiResponse<T> {
  data: T
}

// --- shared query options ---

export interface PageQuery {
  page?: number
  pageSize?: number
}

export interface SortOption {
  value: string
  label: string
}

// The sort keys /api/contents accepts. Kept here so the Explorer filter and the
// service cannot drift apart.
export const CONTENT_SORTS: SortOption[] = [
  { value: 'popular', label: 'Most popular' },
  { value: 'title', label: 'A–Z' },
  { value: 'year', label: 'Newest first' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'newest', label: 'Recently added' },
]
