// auth.service, registration, sign-in, the signed-in profile, and the
// tokenized email flows.
//
// The token is stored by http.setToken, so no other service has to think about
// it and every sign-in path (form, quick sign-in, reset) behaves the same.
//
// SHAPE NOTE: the API returns { token, expiresAt, user }. An earlier version of
// this file expected the account under a capital `Account`, which never matched
// the API and would have silently produced `undefined` for the signed-in user.
// Every response goes through `toAccount` below so the DTO is mapped once, in
// one place, rather than at each call site.
import { http, setToken, getToken } from './http'
import type { Account, UserRole } from '../types/models'

/** One category a member has picked. `slug` is what the frontend routes on. */
export interface CategoryChip {
  id: number
  slug: string
  name: string
}

export interface ProfileCategories {
  favorites: CategoryChip[]
  interests: CategoryChip[]
}

/** One row of the member's activity feed. `createdAt` has no zone suffix, the
 *  API serialises DateTime without one, so it is UTC and gets a Z appended
 *  before parsing. */
export interface ActivityDto {
  logId: number
  action: string
  targetId: number | null
  createdAt: string
}

/** The API's own field names, before mapping. */
interface UserDto {
  id: number
  name: string
  email: string
  avatarPath: string | null
  bio: string | null
  isVerified: boolean
  role: string
  createdAt: string
}

interface AuthResponseDto {
  token: string
  expiresAt: string
  user: UserDto
}

/**
 * The API's `role` is a free string; the app's is a narrow union. Anything
 * unrecognised becomes 'registered' rather than being cast through, so a role
 * added on the server cannot smuggle an unexpected value into the UI.
 */
function toRole(value: string): UserRole {
  return value === 'admin' ? 'admin' : 'registered'
}

function toAccount(dto: UserDto): Account {
  return {
    id: dto.id,
    name: dto.name,
    email: dto.email,
    avatarPath: dto.avatarPath,
    bio: dto.bio ?? '',
    isVerified: dto.isVerified,
    role: toRole(dto.role),
    createdAt: dto.createdAt,
  }
}

export interface AuthResult {
  account: Account
  expiresAt: string
}

export async function register(
  name: string,
  email: string,
  password: string,
): Promise<AuthResult> {
  const result = await http.post<AuthResponseDto>(
    '/auth/register',
    { name, email, password },
    { auth: false },
  )
  setToken(result.token)
  return { account: toAccount(result.user), expiresAt: result.expiresAt }
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const result = await http.post<AuthResponseDto>('/auth/login', { email, password }, { auth: false })
  setToken(result.token)
  return { account: toAccount(result.user), expiresAt: result.expiresAt }
}

export function signOut(): void {
  setToken(null)
}

export function isSignedIn(): boolean {
  return getToken() !== null
}

/** The signed-in account. Rejects with ApiError(401) if the token is stale. */
export async function getProfile(): Promise<Account> {
  return toAccount(await http.get<UserDto>('/auth/me'))
}

export async function updateProfile(patch: {
  name?: string
  bio?: string
}): Promise<Account> {
  return toAccount(await http.put<UserDto>('/auth/me', patch))
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await http.post('/auth/change-password', { currentPassword, newPassword })
}

// ---------- Favourites and interests ----------
//
// Two separate lists. Editing one must not touch the other, so each PUT returns
// both and the caller replaces its state wholesale rather than merging.

export async function getCategories(): Promise<ProfileCategories> {
  return http.get<ProfileCategories>('/auth/categories')
}

export async function setFavorites(categoryIds: number[]): Promise<ProfileCategories> {
  return http.put<ProfileCategories>('/auth/categories/favorites', { categoryIds })
}

export async function setInterests(categoryIds: number[]): Promise<ProfileCategories> {
  return http.put<ProfileCategories>('/auth/categories/interests', { categoryIds })
}

// ---------- Avatar ----------

/**
 * Uploads an avatar as multipart/form-data under the field name `file`, which
 * is what the API's IFormFile parameter binds to.
 *
 * Not sent through http.ts: that wrapper is JSON-only, and a FormData body must
 * not have Content-Type set by hand or the boundary is lost and the server sees
 * a malformed part. Returns the API-relative path, e.g.
 * "/images/avatars/FILE.png", where FILE is the stored name, which the caller resolves against the API base.
 */
export async function uploadAvatar(file: File): Promise<{ avatarPath: string | null }> {
  const { validateImage } = await import('./upload.service')
  const problem = validateImage(file)
  if (problem) throw new Error(problem)

  const base = ((import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:5068/api')
    .replace(/\/api\/?$/, '')

  const form = new FormData()
  form.append('file', file)

  const response = await fetch(`${base}/api/auth/avatar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken() ?? ''}` },
    body: form,
  })

  if (!response.ok) {
    // Reuse the API's own wording where it sent one, so the member sees the
    // same message whether the rejection came from the browser or the server.
    const body = (await response.json().catch(() => null)) as { message?: string } | null
    throw new Error(body?.message ?? 'That image could not be uploaded.')
  }

  return (await response.json()) as { avatarPath: string | null }
}

export async function removeAvatar(): Promise<void> {
  await http.delete('/auth/avatar')
}

/**
 * The member's recent actions, newest first. `take` is clamped server-side;
 * this is the number the dashboard asks for, not a limit it can exceed.
 */
export async function getActivity(take = 8): Promise<ActivityDto[]> {
  return http.get<ActivityDto[]>(`/auth/activity?take=${take}`)
}

// ---------- Tokenized email flows ----------

/**
 * Asks for a reset link. There is no mail server, so the API returns the token
 * in the body and also writes the link to its log, that is what makes the flow
 * demonstrable. Treat `token` as development-only.
 */
export async function forgotPassword(email: string): Promise<{ token: string; delivered: boolean }> {
  return http.post('/auth/forgot-password', { email }, { auth: false })
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await http.post('/auth/reset-password', { token, newPassword }, { auth: false })
}

/** Same dev-only caveat as forgotPassword: the token comes back in the body. */
export async function sendVerification(
  email: string,
): Promise<{ token: string; delivered: boolean }> {
  return http.post('/auth/send-verification', { email }, { auth: false })
}

export async function confirmVerification(token: string): Promise<void> {
  await http.post('/auth/confirm-verification', { token }, { auth: false })
}
