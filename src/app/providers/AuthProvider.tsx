// AuthProvider — login state for the whole app (mock auth for now).
// Accounts live on the device (localStorage):
//   fanhub-accounts → every account saved here (the header dropdown list)
//   fanhub-session  → id of the active account (removed when signed out)
// Swapping in a real API later only means replacing the helpers below.
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { AuthContext, type Account } from '../../context/AuthContext'

const ACCOUNTS_KEY = 'fanhub-accounts'
const SESSION_KEY = 'fanhub-session'

// Reads the device accounts + active session.
// Storage can be blocked (private mode) → fall back to "nobody signed in".
function readStorage(): { accounts: Account[]; currentId: string | null } {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? '[]')
    return {
      accounts: Array.isArray(parsed) ? (parsed as Account[]) : [],
      currentId: localStorage.getItem(SESSION_KEY),
    }
  } catch {
    return { accounts: [], currentId: null }
  }
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  // One state object: the accounts list + which one is active.
  const [state, setState] = useState(readStorage)

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

  // Log in. If this name already exists on the device we just switch to
  // that account; otherwise it's created and saved for next time.
  const signIn = useCallback((name: string, email: string) => {
    setState((prev) => {
      const existing = prev.accounts.find(
        (account) => account.name.toLowerCase() === name.trim().toLowerCase(),
      )
      if (existing) return { ...prev, currentId: existing.id }

      const account: Account = {
        id: `acc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: name.trim(),
        email: email.trim(),
      }
      return { accounts: [...prev.accounts, account], currentId: account.id }
    })
  }, [])

  // Swap the active account (only if it actually lives on this device).
  const switchTo = useCallback((id: string) => {
    setState((prev) =>
      prev.accounts.some((account) => account.id === id) ? { ...prev, currentId: id } : prev,
    )
  }, [])

  // Sign out — the session is cleared but the accounts stay on the device.
  const signOut = useCallback(() => setState((prev) => ({ ...prev, currentId: null })), [])

  return (
    <AuthContext.Provider
      value={{
        accounts: state.accounts,
        current,
        isAuthed: current !== null,
        signIn,
        switchTo,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
