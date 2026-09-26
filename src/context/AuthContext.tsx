// AuthContext — carries the logged-in account(s) across the app.
// Provides: accounts (every account saved on this device), current
// (the active account), isAuthed, signIn(), switchTo(), signOut().
// The real state + persistence lives in src/app/providers/AuthProvider.tsx.
import { createContext, useContext } from 'react'

// One account saved on the device.
export interface Account {
  id: string
  name: string
  email: string
  /** Short self-description, edited from the Profile page. */
  bio: string
}

export interface AuthContextValue {
  accounts: Account[] // the dropdown list ("accounts on device")
  current: Account | null // active account (null = logged out)
  isAuthed: boolean // shorthand for current !== null
  signIn: (name: string, email: string) => void // log in / add an account
  switchTo: (id: string) => void // swap the active account
  signOut: () => void // clear the session (accounts stay on device)
  /** Edit the active account's name / bio. Ignored when signed out. */
  updateProfile: (patch: Partial<Pick<Account, 'name' | 'bio'>>) => void
}

// Default value only matters if someone renders UI outside <AuthProvider>.
export const AuthContext = createContext<AuthContextValue>({
  accounts: [],
  current: null,
  isAuthed: false,
  signIn: () => {},
  switchTo: () => {},
  signOut: () => {},
  updateProfile: () => {},
})

// Convenience hook: const { current, signIn } = useAuth()
export const useAuth = () => useContext(AuthContext)
