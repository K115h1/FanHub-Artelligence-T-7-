// http.ts — the shared fetch wrapper. Every service in this folder goes through
// it, and nothing else calls fetch() directly.
//
// Responsibilities, in order:
//   * prefix VITE_API_URL (never a hardcoded host)
//   * attach the bearer token the API expects
//   * JSON encode/decode, and build query strings
//   * turn any failure into an ApiError, so pages never inspect status codes
//   * time out instead of hanging forever
//
// The API returns 400 with { message } for validation problems and 401/403 for
// auth, so those are translated into wording a visitor can act on.

import { ApiError } from '../types/api'

// The fallback must match the backend's launch profile, or a missing .env
// produces a silent "nothing loads" rather than an obvious misconfiguration.
// Kept in step with:
//   backend/src/FanHubPlus.Api/Properties/launchSettings.json -> http :5068
// and the "/api" suffix comes from [Route("api/[controller]")] on
// ApiControllerBase. Both move together — change one, change this.
const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:5068/api'

/** Where the bearer token lives between reloads. */
const TOKEN_KEY = 'fanhub-token'

/** Requests that hang longer than this are treated as failures. */
const TIMEOUT_MS = 15000

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Storage blocked (private mode). The session just won't survive a reload.
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  /** Sent as a JSON body. Omit for GET and DELETE. */
  body?: unknown
  /** Query values; null and undefined entries are dropped. */
  query?: Record<string, string | number | boolean | null | undefined>
  /** Set false for the endpoints that work signed out. Defaults to true. */
  auth?: boolean
  signal?: AbortSignal
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(`${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`)

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === null || value === undefined || value === '') continue
      url.searchParams.set(key, String(value))
    }
  }

  return url.toString()
}

/** Turns a status code into something worth showing a visitor. */
function friendlyMessage(status: number, body: unknown): string {
  // The API's Guarded() helper already sends { message } for validation errors,
  // so prefer that over anything invented here.
  if (body && typeof body === 'object' && 'message' in body) {
    const message = (body as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
  }

  switch (status) {
    case 401:
      return 'Please log in to continue.'
    case 403:
      return 'You do not have permission to do that.'
    case 404:
      return 'We could not find that.'
    case 409:
      return 'That already exists.'
    case 500:
      return 'Something went wrong on our side. Please try again.'
    default:
      return `Request failed (${status}).`
  }
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, auth = true, signal } = options

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  // Combine the caller's signal with our own timeout so either can abort.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true })

  let response: Response
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (error) {
    // fetch only rejects for network-level problems, never for a 4xx/5xx.
    const aborted = error instanceof DOMException && error.name === 'AbortError'
    throw new ApiError(
      aborted
        ? 'The request timed out. Check that the API is running.'
        : 'Cannot reach the API. Is it running on port 5000?',
      0,
      { isNetworkError: true },
    )
  } finally {
    clearTimeout(timer)
  }

  // 204 and empty bodies are successes with nothing to return.
  if (response.status === 204) return undefined as T

  const text = await response.text()
  let parsed: unknown = null
  if (text) {
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = text
    }
  }

  if (!response.ok) {
    throw new ApiError(friendlyMessage(response.status, parsed), response.status)
  }

  return parsed as T
}

// Thin verbs, so a service reads as a list of endpoints rather than fetch calls.
export const http = {
  get: <T>(path: string, query?: RequestOptions['query'], options: RequestOptions = {}) =>
    request<T>(path, { ...options, method: 'GET', query }),

  post: <T>(path: string, body?: unknown, options: RequestOptions = {}) =>
    request<T>(path, { ...options, method: 'POST', body }),

  put: <T>(path: string, body?: unknown, options: RequestOptions = {}) =>
    request<T>(path, { ...options, method: 'PUT', body }),

  delete: <T>(path: string, options: RequestOptions = {}) =>
    request<T>(path, { ...options, method: 'DELETE' }),
}

/** True when the API is reachable. Used by the profile and admin pages. */
export async function ping(): Promise<boolean> {
  try {
    // The health endpoint sits at the root, outside the /api prefix.
    const base = BASE_URL.replace(/\/api\/?$/, '')
    const response = await fetch(`${base}/health`, { signal: AbortSignal.timeout(4000) })
    return response.ok
  } catch {
    return false
  }
}
