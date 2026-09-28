// useAdminUsers — the account list and role changes, from the API.
//
// This used to read the accounts saved in localStorage on the administrator's
// own browser and change their role there. That list is per-device: it holds
// whoever happened to sign in on this machine, so "manage accounts" showed a
// different set of people to each administrator, and demoting a user only
// removed the badge from this browser until it reloaded. The panel's role gate
// is enforced by the API, so a local change never actually granted or revoked
// anything.
//
// It now lists real users and writes through PUT /admin/users/{id}/role, which
// is the call the API's [Authorize(Roles = "admin")] check reads.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as adminApi from '../../services/admin.service'
import type { Account } from '../../types/models'
import type { UserRole } from '../../types/models'

export interface AdminUsers {
  users: Account[]
  loading: boolean
  error: string | null
  /** Change a user's role. Throws so the caller can show why it failed. */
  setRole: (userId: number, role: UserRole) => Promise<void>
  refresh: () => void
}

export function useAdminUsers(): AdminUsers {
  const [users, setUsers] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Bumped by refresh() so an in-flight load knows it has been superseded.
  const runId = useRef(0)

  const load = useCallback(() => {
    const mine = ++runId.current
    setLoading(true)
    setError(null)
    void adminApi
      .getUsers()
      .then((all) => {
        if (mine !== runId.current) return
        setUsers(all)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (mine !== runId.current) return
        setError(err instanceof Error ? err.message : 'The account list could not be loaded.')
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const setRole = useCallback(
    async (userId: number, role: UserRole) => {
      // The server validates this, but sending the known-bad value would turn a
      // typo into a 400 rather than a client-side message.
      if (role !== 'admin' && role !== 'registered') {
        throw new Error('A role must be admin or registered.')
      }
      await adminApi.updateUserRole(userId, role)
      // Re-read rather than patch locally: the API is the authority on roles,
      // and a rejected change must not leave a badge the server disagrees with.
      load()
    },
    [load],
  )

  return useMemo(
    () => ({ users, loading, error, setRole, refresh: load }),
    [users, loading, error, setRole, load],
  )
}
