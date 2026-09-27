// AuthContext — carries the logged-in account(s) across the app.
// Provides: accounts (every account saved on this device), current
// (the active account), isAuthed, signIn(), switchTo(), signOut().
// The real state + persistence lives in src/app/providers/AuthProvider.tsx.
import { createContext, useContext } from 'react'
import type { UserRole } from '../types/models'

// One account saved on the device.
export interface Account {
  id: string
  name: string
  email: string
  /** Short self-description, edited from the Profile page. */
  bio: string
  /** Assigned on sign-in from the demo account list; the API will own this. */
  role: UserRole
}

export interface AuthContextValue {
  accounts: Account[] // the dropdown list ("accounts on device")
  current: Account | null // active account (null = logged out)
  isAuthed: boolean // shorthand for current !== null
  isAdmin: boolean // shorthand for current?.role === 'admin'
  /** Sign in to an existing account by email. False if no such account. */
  signIn: (email: string) => boolean
  /** Create a new account and sign in as it. Null if the email is taken. */
  signUp: (name: string, email: string) => string | null
  switchTo: (id: string) => void // swap the active account
  signOut: () => void // clear the session (accounts stay on device)
  /** Edit the active account's name / bio. Ignored when signed out. */
  updateProfile: (patch: Partial<Pick<Account, 'name' | 'bio'>>) => void
  /** Change a saved account's role. Admin only; ignored otherwise. */
  setAccountRole: (id: string, role: UserRole) => void
}

// Default value only matters if someone renders UI outside <AuthProvider>.
export const AuthContext = createContext<AuthContextValue>({
  accounts: [],
  current: null,
  isAuthed: false,
  isAdmin: false,
  signIn: () => false,
  signUp: () => null,
  switchTo: () => {},
  signOut: () => {},
  updateProfile: () => {},
  setAccountRole: () => {},
})

// Convenience hook: const { current, signIn } = useAuth()
export const useAuth = () => useContext(AuthContext)
