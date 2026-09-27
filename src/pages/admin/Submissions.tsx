// Submissions — route: /admin/submissions.
//
// The moderation queue for user fan-content. Each pending entry is read in full
// and then approved or rejected; a rejection is confirmed because the fan wrote
// the thing. Mirrors `fan_submissions.status` in database/01_schema.sql.

import { useMemo, useState } from 'react'
import { CheckCircle2, Inbox, SearchX, XCircle } from 'lucide-react'
import { useAdminData, FANDOM_LABELS } from '../../features/admin/AdminDataProvider'
import type { FanSubmission, SubmissionStatus } from '../../types/models'
import type { FandomKey } from '../../features/admin/types'
import {
  AdminButton,
  AdminPageHeader,
  FilterInput,
  FilterSelect,
  StatTile,
  StatusPill,
  formatDate,
  formatRelative,
} from '../../components/admin/shared'
import { EmptyState } from '../../components/common/EmptyState'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'

const STATUSES: SubmissionStatus[] = ['pending', 'approved', 'rejected']

const NEXT_ACTIONS: Record<SubmissionStatus, { label: string; to: SubmissionStatus }[]> = {
  pending: [
    { label: 'Approve', to: 'approved' },
    { label: 'Reject', to: 'rejected' },
  ],
  approved: [{ label: 'Move back to pending', to: 'pending' }],
  rejected: [
    { label: 'Move back to pending', to: 'pending' },
    { label: 'Approve', to: 'approved' },
  ],
}

export default function Submissions() {
  const { submissions, setSubmissionStatus } = useAdminData()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<SubmissionStatus | 'all'>('all')
  const [rejecting, setRejecting] = useState<FanSubmission | null>(null)

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: submissions.length }
    for (const item of submissions) map[item.status] = (map[item.status] ?? 0) + 1
    return map
  }, [submissions])

  // Pending first — it is the queue the admin is here to clear. Everything else
  // is history, so it sorts by date underneath.
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return submissions
      .filter((item) => {
        if (status !== 'all' && item.status !== status) return false
        if (needle && !item.title.toLowerCase().includes(needle)) return false
        if (needle && !item.userName.toLowerCase().includes(needle)) return false
        return true
      })
      .sort((a, b) => {
        if (a.status === 'pending' !== (b.status === 'pending')) return a.status === 'pending' ? -1 : 1
        return b.createdAt.localeCompare(a.createdAt)
      })
  }, [submissions, search, status])

  function applyStatus(item: FanSubmission, next: SubmissionStatus) {
    if (next === 'rejected') {
      setRejecting(item)
      return
    }
    setSubmissionStatus(item.id, next)
  }

  return (
    <>
      <AdminPageHeader
        title="Fan Submissions"
        description="Articles and artwork sent in by fans. Nothing appears on the public site until it is approved."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile icon={Inbox} label="Total submissions" value={submissions.length} tone="plain" />
        <StatTile
          icon={Inbox}
          label="Pending"
          value={counts.pending ?? 0}
          tone={counts.pending ? 'warning' : 'plain'}
          hint="Awaiting a decision"
        />
        <StatTile
          icon={CheckCircle2}
          label="Approved"
          value={counts.approved ?? 0}
          tone="plain"
        />
        <StatTile icon={XCircle} label="Rejected" value={counts.rejected ?? 0} tone="plain" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <FilterInput
          value={search}
          onChange={setSearch}
          label="Search submissions"
          placeholder="Search titles and submitters…"
        />
        <FilterSelect
          value={status}
          onChange={(value) => setStatus(value as SubmissionStatus | 'all')}
          label="Status"
          options={[
            { value: 'all', label: `All statuses (${submissions.length})` },
            ...STATUSES.map((value) => ({
              value,
              label: `${value[0].toUpperCase()}${value.slice(1)} (${counts[value] ?? 0})`,
            })),
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={submissions.length === 0 ? 'No submissions yet' : 'Nothing matches those filters'}
          body={
            submissions.length === 0
              ? 'Fan submissions sent from the site will queue up here for approval.'
              : 'Clear the search or switch back to all statuses.'
          }
          actionText={submissions.length > 0 ? 'Clear filters' : undefined}
          onAction={submissions.length > 0 ? () => { setSearch(''); setStatus('all') } : undefined}
        />
      ) : (
        <ul className="space-y-3">
          {filtered.map((item) => (
            <li key={item.id} className="surface-card p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <StatusPill value={item.status} />
                <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-[11px] font-semibold text-ink-muted">
                  {FANDOM_LABELS[item.categorySlug as FandomKey] ?? item.categorySlug}
                </span>
                <span className="text-xs text-ink-subtle">
                  {item.userName} · {formatRelative(item.createdAt)}
                </span>
              </div>

              <h2 className="text-base font-bold text-ink">{item.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{item.body}</p>
              <p className="mt-2 text-[11px] text-ink-subtle">
                Submitted {formatDate(item.createdAt)} · reference {item.id}
              </p>

              <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                {NEXT_ACTIONS[item.status].map((action) => (
                  <AdminButton
                    key={action.to + action.label}
                    variant={
                      action.to === 'rejected' ? 'danger' : action.to === 'approved' ? 'primary' : 'secondary'
                    }
                    onClick={() => applyStatus(item, action.to)}
                  >
                    {action.label}
                  </AdminButton>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        isOpen={rejecting !== null}
        title="Reject this submission?"
        body={
          rejecting
            ? `"${rejecting.title}" will be marked rejected. The fan can see the decision in their dashboard, and you can move it back to pending later.`
            : ''
        }
        confirmText="Reject"
        isWarning
        onConfirm={() => {
          if (rejecting) setSubmissionStatus(rejecting.id, 'rejected')
          setRejecting(null)
        }}
        onCancel={() => setRejecting(null)}
      />
    </>
  )
}
