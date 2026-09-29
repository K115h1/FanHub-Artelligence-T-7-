// AuthProvider, sign-in state, API-backed with a device fallback.
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { AuthContext, type Account } from '../../context/AuthContext'
import { roleForEmail, DEMO_ACCOUNTS } from '../../lib/demoAccounts'
import { ApiError } from '../../types/api'
import * as api from '../../services/auth.service'

const ACCOUNTS_KEY = 'fanhub-accounts'
const SESSION_KEY = 'fanhub-session'

/** Emails are stored as typed, so compare them case-insensitively. */
function sameEmail(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

/** Collapse rows sharing an email, keeping the one with a userId. */
function dedupeByEmail(accounts: Account[]): Account[] {
  const out: Account[] = []
  for (const account of accounts) {
    const existing = out.findIndex((a) => sameEmail(a.email, account.email))
    if (existing === -1) {
      out.push(account)
      continue
    }
    const keep = out[existing].userId !== null ? out[existing] : account
    const drop = keep === out[existing] ? account : out[existing]
    out[existing] = { ...drop, ...keep, id: out[existing].id }
  }
  return out
}

function readStorage(): { accounts: Account[]; currentId: string | null } {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? '[]')
    const restored: Account[] = Array.isArray(parsed)
      ? (parsed as Account[]).map((account) => ({
          ...account,
          userId: account.userId ?? null,
          avatarPath: account.avatarPath ?? null,
          isVerified: account.isVerified ?? false,
          bio: account.bio ?? '',
          source: account.source ?? 'local',
          role: account.role ?? roleForEmail(account.email),
        }))
      : []

    const accounts = dedupeByEmail(restored)
    return { accounts, currentId: localStorage.getItem(SESSION_KEY) }
  } catch {
    return { accounts: [], currentId: null }
  }
}

/** Device-only rows, so the switcher has something to list. */
function seededAccounts(): Account[] {
  return DEMO_ACCOUNTS.map((demo, index) => ({
    id: `acc_demo_${index + 1}`,
    userId: null,
    name: demo.name,
    email: demo.email,
    bio: '',
    avatarPath: null,
    isVerified: false,
    role: demo.role,
    source: 'local',
  }))
}

/** Email is a person's identity here; userId is data the record carries. */
function deviceKey(email: string): string {
  return `acc_${email.trim().toLowerCase()}`
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(readStorage)
  const [lastError, setLastError] = useState<string | null>(null)

  useEffect(() => {
    if (state.accounts.length === 0) {
      setState((prev) => (prev.accounts.length === 0 ? { ...prev, accounts: seededAccounts() } : prev))
    }
    // Once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const current = state.accounts.find((account) => account.id === state.currentId) ?? null

  useEffect(() => {
    try {
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(state.accounts))
      if (state.currentId) localStorage.setItem(SESSION_KEY, state.currentId)
      else localStorage.removeItem(SESSION_KEY)
    } catch {
      // Storage blocked; the in-memory session still works.
    }
  }, [state])

  /** Insert-or-update by email, then make it the active account. */
  const adopt = useCallback((account: Account) => {
    setState((prev) => {
      const wanted = account.email.trim().toLowerCase()
      const index = prev.accounts.findIndex(
        (a) => a.id === account.id || a.email.trim().toLowerCase() === wanted,
      )

      if (index === -1) {
        return { accounts: [...prev.accounts, account], currentId: account.id }
      }

      const existing = prev.accounts[index]
      const merged: Account = { ...existing, ...account, id: existing.id }
      const accounts = prev.accounts.map((a, i) => (i === index ? merged : a))
      return { accounts, currentId: merged.id }
    })
  }, [])

  const signIn = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      setLastError(null)
      const clean = email.trim().toLowerCase()

      try {
        const { account } = await api.login(email.trim(), password)
        adopt({
          id: deviceKey(account.email),
          userId: account.id,
          name: account.name,
          email: account.email,
          bio: account.bio ?? '',
          avatarPath: account.avatarPath,
          isVerified: account.isVerified,
          role: account.role,
          source: 'api',
        })
        return true
      } catch (error) {
        // A rejection stands. Only an unreachable API falls back to the device,
        // so a typo can never read as a successful sign-in.
        if (error instanceof ApiError && !error.isNetworkError) {
          setLastError(error.message)
          return false
        }

        const existing = state.accounts.find((account) => sameEmail(account.email, clean))
        if (!existing) {
          setLastError('Could not reach the sign-in service, and no saved account matches that email.')
          return false
        }
        setState((prev) => ({ ...prev, currentId: existing.id }))
        return true
      }
    },
    [adopt, state.accounts],
  )

  const signUp = useCallback(
    async (name: string, email: string, password: string): Promise<string | null> => {
      setLastError(null)
      const clean = email.trim().toLowerCase()

      try {
        const { account } = await api.register(name, email, password)
        const next: Account = {
          id: deviceKey(account.email),
          userId: account.id,
          name: account.name,
          email: account.email,
          bio: account.bio ?? '',
          avatarPath: account.avatarPath,
          isVerified: account.isVerified,
          role: account.role,
          source: 'api',
        }
        adopt(next)
        return next.id
      } catch (error) {
        if (error instanceof ApiError && !error.isNetworkError) {
          setLastError(error.message)
          return null
        }

        const already = state.accounts.some((account) => sameEmail(account.email, clean))
        if (already) return null

        const account: Account = {
          id: deviceKey(email),
          userId: null,
          name: name.trim(),
          email: email.trim(),
          bio: '',
          avatarPath: null,
          isVerified: false,
          role: roleForEmail(email),
          source: 'local',
        }
        setState((prev) => ({ accounts: [...prev.accounts, account], currentId: account.id }))
        return account.id
      }
    },
    [adopt, state.accounts],
  )

  const switchTo = useCallback((id: string) => {
    setState((prev) =>
      prev.accounts.some((account) => account.id === id) ? { ...prev, currentId: id } : prev,
    )
  }, [])

  const signOut = useCallback(() => {
    api.signOut()
    setState((prev) => ({ ...prev, currentId: null }))
  }, [])

  /** Optimistic local update, then told to the API. */
  const updateProfile = useCallback((patch: Partial<Pick<Account, 'name' | 'bio'>>) => {
    setState((prev) => {
      if (!prev.currentId) return prev
      return {
        ...prev,
        accounts: prev.accounts.map((account) =>
          account.id === prev.currentId
            ? {
                ...account,
                name: patch.name?.trim() ? patch.name.trim() : account.name,
                bio: patch.bio !== undefined ? patch.bio : account.bio,
              }
            : account,
        ),
      }
    })

    if (!api.isSignedIn()) return
    const clean: { name?: string; bio?: string } = {}
    if (patch.name?.trim()) clean.name = patch.name.trim()
    if (patch.bio !== undefined) clean.bio = patch.bio ?? ''

    if (Object.keys(clean).length === 0) return

    api.updateProfile(clean).catch((error: unknown) => {
      setLastError(error instanceof Error ? error.message : 'That change could not be saved.')
    })
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!api.isSignedIn() || !current) return
    try {
      const account = await api.getProfile()
      setState((prev) => ({
        ...prev,
        accounts: prev.accounts.map((a) =>
          a.id === prev.currentId
            ? {
                ...a,
                name: account.name,
                email: account.email,
                bio: account.bio ?? '',
                avatarPath: account.avatarPath,
                isVerified: account.isVerified,
                role: account.role,
              }
            : a,
        ),
      }))
    } catch (error) {
      // 401 means the token expired; clear it so the guards stop treating the
      // visitor as signed in.
      if (error instanceof ApiError && error.status === 401) {
        api.signOut()
        setState((prev) => ({ ...prev, currentId: null }))
        return
      }
      setLastError(error instanceof Error ? error.message : 'Could not refresh your profile.')
    }
  }, [current])

  useEffect(() => {
    if (api.isSignedIn() && current?.source === 'api') void refreshProfile()
    // Once on mount: revalidation, not a subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
        refreshProfile,
        lastError,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
