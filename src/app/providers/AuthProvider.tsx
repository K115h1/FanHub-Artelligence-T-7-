// AuthProvider — sign-in state, backed by the API with a device fallback.
//
// Two storage keys, as before:
//   fanhub-accounts -> every account known on this device (the header switcher,
//                      and the admin panel's role editor)
//   fanhub-session  -> id of the active account
// …plus fanhub-token, the JWT, owned by auth.service via http.setToken.
//
// WHY THERE IS A FALLBACK. The API is the source of truth and every sign-in
// tries it first. But the app is also demoed with the backend stopped, and a
// hard dependency on localhost:5068 would mean the Login button does nothing in
// that situation. So a NETWORK failure falls back to the old device-only match,
// while a REJECTION (wrong password, unknown email) does not — falling back
// there would make a typo look like a successful sign-in, which is the one
// outcome that must never happen.
//
// Accounts stay keyed by a device id even once they come from the API, because
// bookmarks, ratings and feedback all key their storage on it. That id is
// derived from the email, so one person is one row here no matter how they
// signed in — see dedupeByEmail for the devices that predate that.
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { AuthContext, type Account } from '../../context/AuthContext'
import { roleForEmail, DEMO_ACCOUNTS } from '../../lib/demoAccounts'
import { ApiError } from '../../types/api'
import * as api from '../../services/auth.service'

const ACCOUNTS_KEY = 'fanhub-accounts'
const SESSION_KEY = 'fanhub-session'

/** Case-insensitive identity comparison — emails are stored as typed. */
function sameEmail(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

/**
 * Collapse rows that share an email, keeping the most complete one.
 *
 * An earlier version keyed accounts on the API userId when it was known and on
 * the email when it wasn't, so signing in offline and then online left one
 * person with two rows — and the avatar only on one of them. Devices that
 * already hold that state would keep showing the duplicate forever, because
 * nothing else re-derives the list on load. Doing it here heals those devices
 * without asking anyone to clear their storage.
 *
 * The API row wins: it is the one with a userId, the server's name, the real
 * verification state and the uploaded picture.
 */
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

// Falls back to "nobody signed in" if storage is blocked (private mode).
function readStorage(): { accounts: Account[]; currentId: string | null } {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? '[]')
    const restored: Account[] = Array.isArray(parsed)
      ? (parsed as Account[]).map((account) => ({
          ...account,
          // Backfill for accounts saved by the pre-API mock, which had no
          // userId / avatarPath / isVerified and no `source`.
          userId: account.userId ?? null,
          avatarPath: account.avatarPath ?? null,
          isVerified: account.isVerified ?? false,
          bio: account.bio ?? '',
          source: account.source ?? 'local',
          // An existing account keeps the role its own email grants, so
          // upgrading the app doesn't silently demote an admin.
          role: account.role ?? roleForEmail(account.email),
        }))
      : []

    const accounts = dedupeByEmail(restored)
    return { accounts, currentId: localStorage.getItem(SESSION_KEY) }
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

/**
 * A stable device key for an account.
 *
 * Keyed on email alone, deliberately. The first version keyed on the API's user
 * id when it was known and on the email when it wasn't, which meant the same
 * person got two rows in the account switcher: one from signing in while the
 * API was unreachable, another from signing in normally afterwards. Both were
 * the same human, listed twice, with the avatar only on whichever row the API
 * happened to write. Email is what identifies a person here — the userId is
 * data the record carries, not part of its identity on this device.
 */
function deviceKey(email: string): string {
  return `acc_${email.trim().toLowerCase()}`
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(readStorage)
  const [lastError, setLastError] = useState<string | null>(null)

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

  /**
   * Insert-or-update, then make it the active account.
   *
   * Matched on email as well as id, so a device-only account is upgraded in
   * place when the API later recognises it — keeping the existing id means the
   * active session and anything holding that id stay valid. Without this, a
   * person who first signed in offline ended up listed twice.
   */
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
        // Rejected: bad credentials, unknown email, disabled account. The API
        // answered, so its answer stands.
        if (error instanceof ApiError && !error.isNetworkError) {
          setLastError(error.message)
          return false
        }

        // Unreachable. Fall back to the device so the demo still works.
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

        // Unreachable: create it on the device, as the old mock did. Keyed by
        // email like every other account, so signing up here and then signing
        // in against the API once it is reachable updates this row instead of
        // adding a second one.
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

  // Swap the active account (only if it actually lives on this device).
  const switchTo = useCallback((id: string) => {
    setState((prev) =>
      prev.accounts.some((account) => account.id === id) ? { ...prev, currentId: id } : prev,
    )
  }, [])

  const signOut = useCallback(() => {
    api.signOut()
    setState((prev) => ({ ...prev, currentId: null }))
  }, [])

  /**
   * Edit the ACTIVE account's name / bio.
   *
   * Local state updates first so typing never waits on a round trip, then the
   * API is told. Without a token there is nothing to tell, which is the case for
   * a device-only account.
   */
  const updateProfile = useCallback((patch: Partial<Pick<Account, 'name' | 'bio'>>) => {
    setState((prev) => {
      if (!prev.currentId) return prev
      return {
        ...prev,
        accounts: prev.accounts.map((account) =>
          account.id === prev.currentId
            ? {
                ...account,
                // Ignore a blank name so an account can't end up nameless.
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

  /** Re-read the active account from the API, e.g. after verifying the email. */
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
      // A 401 here means the token expired. Clear it so the guards stop
      // treating the visitor as signed in, rather than looping on a bad token.
      if (error instanceof ApiError && error.status === 401) {
        api.signOut()
        setState((prev) => ({ ...prev, currentId: null }))
        return
      }
      setLastError(error instanceof Error ? error.message : 'Could not refresh your profile.')
    }
  }, [current])

  // A saved session is only meaningful while the token is still valid, so ask
  // the API who we are on boot. A 401 is handled inside and clears the session.
  useEffect(() => {
    if (api.isSignedIn() && current?.source === 'api') void refreshProfile()
    // Once on mount: this is a revalidation, not a subscription.
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
