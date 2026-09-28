// AuthContext — carries the logged-in account across the app.
// The real state + persistence lives in src/app/providers/AuthProvider.tsx.
//
// `signIn`/`signUp` are async and take a password. They were synchronous and
// email-only while the whole thing was a localStorage mock; they now talk to the
// API and fall back to the device when it cannot be reached, so a demo with the
// backend down still signs in.
import { createContext, useContext } from 'react'
import type { UserRole } from '../types/models'

/**
 * An account as the UI knows it.
 *
 * `id` is a DEVICE key, not the API's user id, and the two are deliberately
 * separate. `id` is used for React keys and for per-account storage keys
 * (bookmarks, ratings, feedback), which must keep working for a locally-created
 * account that has never reached the API. `userId` is the API's id, or null
 * while the account exists only on this device.
 */
export interface Account {
  id: string
  /** The API's user id, once this account has authenticated against it. */
  userId: number | null
  name: string
  email: string
  bio: string
  /** API-relative path, e.g. /images/avatars/x.png. Null = initials avatar. */
  avatarPath: string | null
  isVerified: boolean
  role: UserRole
  /** 'api' once signed in against the API; 'local' for a device-only account. */
  source: 'local' | 'api'
}

export interface AuthContextValue {
  accounts: Account[] // the dropdown list ("accounts on device")
  current: Account | null // active account (null = logged out)
  isAuthed: boolean // shorthand for current !== null
  isAdmin: boolean // shorthand for current?.role === 'admin'
  /**
   * Sign in with a real password. Resolves false on bad credentials.
   *
   * Falls back to the previous email-only device match ONLY when the API could
   * not be reached at all (server down / CORS), never when it rejected the
   * credentials — otherwise a typo would appear to succeed.
   */
  signIn: (email: string, password: string) => Promise<boolean>
  /** Create an account and sign in. Null if the email is taken. */
  signUp: (name: string, email: string, password: string) => Promise<string | null>
  switchTo: (id: string) => void // swap the active account
  signOut: () => void // clear the session (accounts stay on device)
  /** Edit the active account's name / bio. Ignored when signed out. */
  updateProfile: (patch: Partial<Pick<Account, 'name' | 'bio'>>) => void
  /** Re-read the active account from the API. No-op without an API session. */
  refreshProfile: () => Promise<void>
  /** Set after a failed API save, so a form can offer "retry". */
  lastError: string | null
  // Role changes are deliberately NOT here. They used to be a localStorage edit
  // on this browser's account list, which the API's [Authorize(Roles = "admin")]
  // never saw — so the button promoted nobody. The admin panel now calls
  // PUT /admin/users/{id}/role; see useAdminUsers.
}

// Default value only matters if someone renders UI outside <AuthProvider>.
export const AuthContext = createContext<AuthContextValue>({
  accounts: [],
  current: null,
  isAuthed: false,
  isAdmin: false,
  signIn: async () => false,
  signUp: async () => null,
  switchTo: () => {},
  signOut: () => {},
  updateProfile: () => {},
  refreshProfile: async () => {},
  lastError: null,
})

// Convenience hook: const { current, signIn } = useAuth()
export const useAuth = () => useContext(AuthContext)
