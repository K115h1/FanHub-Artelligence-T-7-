// UserManager — route: /admin/users.
//
// Lists the accounts saved on this device and lets an administrator change a
// role. The current SRS asks for suspension as well, but there is no `suspended`
// column on Account yet and the API has no endpoint to enforce it, so this page
// does role changes only rather than shipping a toggle that does nothing.

import { useState } from 'react'
import { ShieldCheck, UserCog, Users } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import type { Account } from '../../context/AuthContext'
import { useAdminStats } from '../../features/admin/hooks'
import {
  AdminButton,
  AdminPageHeader,
  FilterInput,
  StatTile,
  StatusPill,
} from '../../components/admin/shared'
import { EmptyState } from '../../components/common/EmptyState'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import type { UserRole } from '../../types/models'

export default function UserManager() {
  const { accounts, current, setAccountRole, signOut } = useAuth()
  const stats = useAdminStats()
  const [search, setSearch] = useState('')
  // The role change being confirmed, held until the dialog is accepted.
  const [pending, setPending] = useState<{ account: Account; role: UserRole } | null>(null)

  const needle = search.trim().toLowerCase()
  const filtered = accounts    .filter(
      (account) =>
        !needle ||
        account.name.toLowerCase().includes(needle) ||
        account.email.toLowerCase().includes(needle),
    )
    // Admins first, so the accounts that can act are never below the fold.
    .sort((a, b) => Number(b.role === 'admin') - Number(a.role === 'admin'))

  // Demoting the final admin locks everyone out of this panel, so say so.
  const isLastAdmin =
    current?.role === 'admin' && accounts.filter((a) => a.role === 'admin').length === 1

  // Role changes go through the confirmation dialog. Your own row is handled
  // separately (signing out) because demoting yourself in place would leave you
  // signed in with no way back into the panel.
  function requestRoleChange(account: Account, role: UserRole) {
    setPending({ account, role })
  }

  function confirmRoleChange() {
    if (pending) setAccountRole(pending.account.id, pending.role)
    setPending(null)
  }

  return (
    <>
      <AdminPageHeader
        title="User Manager"
        description="Every account, and the role each one signs in with."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile icon={Users} label="Accounts" value={stats.accountCount} />
        <StatTile icon={ShieldCheck} label="Administrators" value={stats.adminCount} tone="plain" />
        <StatTile
          icon={UserCog}
          label="Registered users"
          value={stats.accountCount - stats.adminCount}
          tone="plain"
        />
        <StatTile
          icon={UserCog}
          label="Your role"
          value={<span className="capitalize">{current?.role ?? 'visitor'}</span>}
          hint={current?.email}
          tone="plain"
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <FilterInput
          value={search}
          onChange={setSearch}
          label="Search accounts"
          placeholder="Search by name or email…"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={accounts.length === 0 ? 'No accounts yet' : 'No accounts match'}
          body={
            accounts.length === 0
              ? 'Accounts created from the register page will appear here.'
              : 'Try a different name or email address.'
          }
          actionText={accounts.length === 0 ? 'Go to the site' : undefined}
          onAction={accounts.length === 0 ? () => window.location.assign('/') : undefined}
        />
      ) : (
        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-subtle">
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Account
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Role
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Bio
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    Change role
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((account) => {
                  const isSelf = account.id === current?.id
                  return (
                    <tr key={account.id} className="align-middle">
                      <td className="px-4 py-3">
                        <p className="flex items-center gap-2 font-medium text-ink">
                          {account.name}
                          {isSelf && (
                            <span className="rounded-full bg-surface-sunken px-1.5 py-0.5 text-[10px] font-semibold text-ink-muted">
                              You
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-ink-subtle">{account.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill value={account.role} />
                      </td>
                      <td className="max-w-[16rem] px-4 py-3 text-xs text-ink-muted">
                        <span className="line-clamp-2">{account.bio || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isSelf ? (
                          <AdminButton
                            variant="danger"
                            onClick={() => {
                              // Signing out is the only way to hand the panel
                              // over without leaving a stale admin session.
                              if (account.role === 'admin') signOut()
                            }}
                            disabled={account.role !== 'admin'}
                            title="Sign out to switch to another account"
                          >
                            {account.role === 'admin' ? 'Sign out' : 'Registered user'}
                          </AdminButton>
                        ) : (
                          <AdminButton
                            variant={account.role === 'admin' ? 'danger' : 'primary'}
                            onClick={() =>
                              requestRoleChange(
                                account,
                                account.role === 'admin' ? 'registered' : 'admin',
                              )
                            }
                          >
                            Make {account.role === 'admin' ? 'registered' : 'admin'}
                          </AdminButton>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isLastAdmin && (
        <p className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-ink">
          <span className="font-semibold">You are the only administrator.</span> That is why
          your own row offers &ldquo;Sign out&rdquo; instead of a demote button. If you sign
          out, every remaining account is a registered user and nobody can reach this panel
          again until another administrator is created.
        </p>
      )}

      <ConfirmDialog
        isOpen={pending !== null}
        title={
          pending?.role === 'admin' ? 'Grant administrator access?' : 'Remove administrator access?'
        }
        body={
          pending
            ? pending.role === 'admin'
              ? `${pending.account.name} (${pending.account.email}) will be able to edit the catalogue, moderate content and manage accounts.`
              : `${pending.account.name} (${pending.account.email}) will lose access to the control panel. Their account and bookmarks are kept.`
            : ''
        }
        confirmText={pending?.role === 'admin' ? 'Grant access' : 'Remove access'}
        isWarning
        onConfirm={confirmRoleChange}
        onCancel={() => setPending(null)}
      />
    </>
  )
}
