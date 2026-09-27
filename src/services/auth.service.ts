// auth.service — registration, sign-in, the signed-in profile, and the
// password-reset flow.
//
// The token is stored by http.setToken, so no other service has to think about
// it. The frontend AuthProvider is being retired in favour of this; until then
// these calls are the source of truth for anything session-shaped.
import { http, setToken, getToken } from './http'
import type { Account } from '../types/models'

export interface AuthResult {
  token: string
  expiresAt: string
  Account: Account
}

export function register(name: string, email: string, password: string): Promise<AuthResult> {
  // Storing the token here rather than in the caller keeps every sign-in path
  // (form, quick sign-in, reset) behaving the same.
  return http
    .post<AuthResult>('/auth/register', { name, email, password }, { auth: false })
    .then((result) => {
      setToken(result.token)
      return result
    })
}

export function login(email: string, password: string): Promise<AuthResult> {
  return http
    .post<AuthResult>('/auth/login', { email, password }, { auth: false })
    .then((result) => {
      setToken(result.token)
      return result
    })
}

export function signOut(): void {
  setToken(null)
}

export function isSignedIn(): boolean {
  return getToken() !== null
}

/** The signed-in account. Rejects with ApiError(401) if the token is stale. */
export function getProfile(): Promise<Account> {
  return http.get<Account>('/auth/me')
}

export function updateProfile(patch: { name?: string; bio?: string }): Promise<Account> {
  return http.put<Account>('/auth/me', patch)
}

export function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  return http.post('/auth/change-password', { currentPassword, newPassword })
}

/**
 * Asks for a reset link. The API currently returns the token in the body so the
 * flow can be demonstrated without a mail server — treat that field as
 * development-only and ignore it once real email is wired up.
 */
export function forgotPassword(email: string): Promise<{ token: string; delivered: boolean }> {
  return http.post('/auth/forgot-password', { email }, { auth: false })
}

export function resetPassword(token: string, newPassword: string): Promise<void> {
  return http.post('/auth/reset-password', { token, newPassword }, { auth: false })
}
