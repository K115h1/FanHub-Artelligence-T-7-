// Submissions — route: /admin/submissions.
//
// The moderation queue for user fan-content. Each pending entry is read in full
// and then approved or rejected; a rejection is confirmed because the fan wrote
// the thing. Mirrors fan_submissions in database/01_schema.sql.
//
// The queue filters on `kind` as well as status, because the SRS names three
// kinds of user-created content (articles, character profiles, event
// highlights) and they are not interchangeable: a character card is reviewed
// against a different bar than an article.

import { useMemo, useState } from 'react'
import { CheckCircle2, Inbox, SearchX, XCircle } from 'lucide-react'
import { useAdminData, FANDOM_LABELS } from '../../features/admin/AdminDataProvider'
import type { SubmissionEntry, SubmissionStatus } from '../../types/models'
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

// The API sends kind and status in the same lowercase snake_case the columns
// store, so these are the wire values, not the enum member names.
const KIND_FILTERS = [
  { value: 'all', label: 'All kinds' },
  { value: 'article', label: 'Articles' },
  { value: 'character_profile', label: 'Character profiles' },
  { value: 'event_highlight', label: 'Event highlights' },
]

const KIND_LABEL: Record<string, string> = {
  article: 'Article',
  character_profile: 'Character profile',
  event_highlight: 'Event highlight',
}

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
  const [kind, setKind] = useState('all')
  const [rejecting, setRejecting] = useState<SubmissionEntry | null>(null)
  const [note, setNote] = useState('')

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
        if (kind !== 'all' && item.kind !== kind) return false
        if (needle && !item.title.toLowerCase().includes(needle)) return false
        if (needle && !item.userName.toLowerCase().includes(needle)) return false
        return true
      })
      .sort((a, b) => {
        if ((a.status === 'pending') !== (b.status === 'pending')) {
          return a.status === 'pending' ? -1 : 1
        }
        return b.createdAt.localeCompare(a.createdAt)
      })
  }, [submissions, search, status, kind])

  function applyStatus(item: SubmissionEntry, next: SubmissionStatus) {
    if (next === 'rejected') {
      // Reset the note each time, so a previous reason is not silently reused.
      setNote(item.moderatorNote ?? '')
      setRejecting(item)
      return
    }
    void setSubmissionStatus(item.id, next)
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
        <FilterSelect value={kind} onChange={setKind} label="Kind" options={KIND_FILTERS} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={submissions.length === 0 ? 'No submissions yet' : 'Nothing matches those filters'}
          body={
            submissions.length === 0
              ? 'Fan submissions sent from the site will queue up here for approval.'
              : 'Clear the search, or switch back to all statuses and kinds.'
          }
          actionText={submissions.length > 0 ? 'Clear filters' : undefined}
          onAction={
            submissions.length > 0
              ? () => { setSearch(''); setStatus('all'); setKind('all') }
              : undefined
          }
        />
      ) : (
        <ul className="space-y-3">
          {filtered.map((item) => {
            // Narrow before indexing: the API sends status as a string, and an
            // unrecognised value must not read NEXT_ACTIONS[undefined].
            const actions = NEXT_ACTIONS[item.status as SubmissionStatus] ?? []

            return (
              <li key={item.id} className="surface-card p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <StatusPill value={item.status} />
                  {/* What kind of fan content this is — the thing the SRS asks
                      the queue to distinguish between. */}
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
                    {KIND_LABEL[item.kind] ?? item.kind}
                  </span>
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

                {/* A decision note, if one was given. */}
                {item.moderatorNote && (
                  <p className="mt-2 rounded-md bg-surface-sunken px-3 py-2 text-xs text-ink-muted">
                    <span className="font-semibold text-ink">Reviewer note: </span>
                    {item.moderatorNote}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                  {actions.map((action) => (
                    <AdminButton
                      key={action.to + action.label}
                      variant={
                        action.to === 'rejected'
                          ? 'danger'
                          : action.to === 'approved'
                            ? 'primary'
                            : 'secondary'
                      }
                      onClick={() => applyStatus(item, action.to)}
                    >
                      {action.label}
                    </AdminButton>
                  ))}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <RejectDialog
        submission={rejecting}
        note={note}
        onNoteChange={setNote}
        onConfirm={() => {
          if (rejecting) void setSubmissionStatus(rejecting.id, 'rejected', note)
          setRejecting(null)
          setNote('')
        }}
        onCancel={() => {
          setRejecting(null)
          setNote('')
        }}
      />
    </>
  )
}

/**
 * A rejection with a reason rather than a bare confirmation.
 *
 * The fan wrote the thing; telling them no without saying why is the worst
 * outcome available. The note is optional so the dialog cannot be blocked, but
 * it is offered in the same place as the decision.
 */
function RejectDialog({
  submission,
  note,
  onNoteChange,
  onConfirm,
  onCancel,
}: {
  submission: SubmissionEntry | null
  note: string
  onNoteChange: (value: string) => void
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!submission) return null

  return (
    <ConfirmDialog
      isOpen
      title="Reject this submission?"
      body={`"${submission.title}" will be marked rejected. You can move it back to pending later. Your note is shown to the fan alongside the decision.`}
      confirmText="Reject"
      isWarning
      onConfirm={onConfirm}
      onCancel={onCancel}
      // Rendered inside the dialog body, below its own message.
      extra={
        <label className="mt-3 block text-left">
          <span className="mb-1 block text-xs font-medium text-ink-muted">
            Reason <span className="font-normal text-ink-subtle">(optional)</span>
          </span>
          <textarea
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            rows={3}
            maxLength={500}
            placeholder="e.g. Needs a bio and a series to attach it to."
            className="w-full resize-y rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:border-accent"
          />
        </label>
      }
    />
  )
}
