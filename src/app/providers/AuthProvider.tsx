// AuthProvider — mock login state. Accounts live on the device:
//   fanhub-accounts → every account saved (the header dropdown list)
//   fanhub-session  → id of the active account (removed when signed out)
// Swapping in a real API only means replacing the helpers below.
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { AuthContext, type Account } from '../../context/AuthContext'
import { roleForEmail, DEMO_ACCOUNTS } from '../../lib/demoAccounts'
import type { UserRole } from '../../types/models'

const ACCOUNTS_KEY = 'fanhub-accounts'
const SESSION_KEY = 'fanhub-session'

// Falls back to "nobody signed in" if storage is blocked (private mode).
function readStorage(): { accounts: Account[]; currentId: string | null } {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? '[]')
    return {
      // Backfills `bio` and `role` for accounts saved before those fields existed.
      // An existing account keeps the role its own email grants, so upgrading
      // the app doesn't silently demote an admin who was signed in before.
      accounts: Array.isArray(parsed)
        ? (parsed as Account[]).map((account) => ({
            ...account,
            bio: account.bio ?? '',
            role: account.role ?? roleForEmail(account.email),
          }))
        : [],
      currentId: localStorage.getItem(SESSION_KEY),
    }
  } catch {
    return { accounts: [], currentId: null }
  }
}

/**
 * The seeded accounts, present from the first visit so the account switcher and
 * the login page's quick sign-in have something to find. Nobody is signed in as
 * a result — a visitor still has to choose.
 */
function seededAccounts(): Account[] {
  return DEMO_ACCOUNTS.map((demo, index) => ({
    id: `acc_demo_${index + 1}`,
    name: demo.name,
    email: demo.email,
    bio: '',
    role: demo.role,
  }))
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  // One state object: the accounts list + which one is active.
  const [state, setState] = useState(readStorage)

  // First run on a device with no saved accounts: add the seeded ones. Written
  // on its own so an existing account list is never touched.
  useEffect(() => {
    if (state.accounts.length === 0) {
      setState((prev) => (prev.accounts.length === 0 ? { ...prev, accounts: seededAccounts() } : prev))
    }
    // Intentionally runs once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The active account, derived from the session id.
  const current = state.accounts.find((account) => account.id === state.currentId) ?? null

  // Persist every change (accounts list + active session).
  useEffect(() => {
    try {
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(state.accounts))
      if (state.currentId) localStorage.setItem(SESSION_KEY, state.currentId)
      else localStorage.removeItem(SESSION_KEY)
    } catch {
      // Ignore storage failures — the in-memory session still works.
    }
  }, [state])

  // Create an account and sign in as it. Refuses if the email is already
  // registered, which is what stops someone "signing up" over an existing
  // account and inheriting its role. Returns the id so the caller can react.
  const signUp = useCallback((name: string, email: string): string | null => {
    const cleanEmail = email.trim().toLowerCase()
    const already = state.accounts.some(
      (account) => account.email.toLowerCase() === cleanEmail,
    )
    if (already) return null

    const account: Account = {
      id: `acc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      email: email.trim(),
      bio: '',
      role: roleForEmail(email),
    }
    setState((prev) => ({ accounts: [...prev.accounts, account], currentId: account.id }))
    return account.id
  }, [state.accounts])

  // Log in to an EXISTING account, matched on email. The name is never asked
  // for at sign-in because the account already has one — that is what makes
  // Register and Login different pages rather than the same form twice.
  const signIn = useCallback((email: string): boolean => {
    const cleanEmail = email.trim().toLowerCase()
    const existing = state.accounts.find(
      (account) => account.email.toLowerCase() === cleanEmail,
    )
    if (!existing) return false
    setState((prev) => ({ ...prev, currentId: existing.id }))
    return true
  }, [state.accounts])

  // Swap the active account (only if it actually lives on this device).
  const switchTo = useCallback((id: string) => {
    setState((prev) =>
      prev.accounts.some((account) => account.id === id) ? { ...prev, currentId: id } : prev,
    )
  }, [])

  // Sign out — the session is cleared but the accounts stay on the device.
  const signOut = useCallback(() => setState((prev) => ({ ...prev, currentId: null })), [])

  // Edit the ACTIVE account. Only name and bio are editable here; email and id
  // are identity fields and would need a verification flow to change.
  const updateProfile = useCallback(
    (patch: Partial<Pick<Account, 'name' | 'bio'>>) => {
      setState((prev) => {
        if (!prev.currentId) return prev
        return {
          ...prev,
          accounts: prev.accounts.map((account) =>
            account.id === prev.currentId
              ? {
                  ...account,
                  // Ignore empty names so an account can't end up nameless.
                  name: patch.name?.trim() ? patch.name.trim() : account.name,
                  bio: patch.bio !== undefined ? patch.bio : account.bio,
                }
              : account,
          ),
        }
      })
    },
    [],
  )

  // Change a saved account's role. Refuses unless the ACTIVE account is an
  // admin, so a registered user can't promote themselves by calling this.
  const setAccountRole = useCallback(
    (id: string, role: UserRole) => {
      setState((prev) => {
        const active = prev.accounts.find((account) => account.id === prev.currentId)
        if (!active || active.role !== 'admin') return prev
        return {
          ...prev,
          accounts: prev.accounts.map((account) =>
            account.id === id ? { ...account, role } : account,
          ),
        }
      })
    },
    [],
  )

  return (
    <AuthContext.Provider
      value={{
        accounts: state.accounts,
        current,
        isAuthed: current !== null,
        isAdmin: current?.role === 'admin',
        signIn,
        signUp,
        switchTo,
        signOut,
        updateProfile,
        setAccountRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
