// FeedbackModerator, route: /admin/feedback.
//
// Works the feedback queue: filter by status or type, read the entry, and move
// it through open -> reviewed -> resolved / dismissed. Mirrors the `feedback`
// table's status enum in database/01_schema.sql.

import { useMemo, useState } from 'react'
import { Inbox, MessageSquare, SearchX } from 'lucide-react'
import { useAdminData } from '../../features/admin/AdminDataProvider'
import type { FeedbackEntry, FeedbackStatus } from '../../types/models'
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

const STATUSES: FeedbackStatus[] = ['open', 'reviewed', 'resolved', 'dismissed']
const TYPES = ['bug', 'suggestion', 'query', 'content'] as const

/** The transitions offered for each status. Dismissed and resolved are ends. */
const NEXT_ACTIONS: Record<FeedbackStatus, { label: string; to: FeedbackStatus }[]> = {
  open: [
    { label: 'Mark reviewed', to: 'reviewed' },
    { label: 'Resolve', to: 'resolved' },
    { label: 'Dismiss', to: 'dismissed' },
  ],
  reviewed: [
    { label: 'Reopen', to: 'open' },
    { label: 'Resolve', to: 'resolved' },
    { label: 'Dismiss', to: 'dismissed' },
  ],
  resolved: [{ label: 'Reopen', to: 'open' }],
  dismissed: [{ label: 'Reopen', to: 'open' }],
}

export default function FeedbackModerator() {
  const { feedback, setFeedbackStatus } = useAdminData()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<FeedbackStatus | 'all'>('all')
  const [type, setType] = useState<string>('all')
  const [expanded, setExpanded] = useState<number | null>(null)
  // Dismissal is the one irreversible-sounding action, so it is confirmed.
  const [dismissing, setDismissing] = useState<FeedbackEntry | null>(null)

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: feedback.length }
    for (const item of feedback) map[item.status] = (map[item.status] ?? 0) + 1
    return map
  }, [feedback])

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return feedback
      .filter((item) => {
        if (status !== 'all' && item.status !== status) return false
        if (type !== 'all' && item.type !== type) return false
        if (needle && !item.message.toLowerCase().includes(needle)) return false
        // userName is nullable, feedback can be submitted without an account,
        // and the local seed had no anonymous rows, so this was never a null.
        if (needle && !(item.userName ?? '').toLowerCase().includes(needle)) return false
        return true
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [feedback, search, status, type])

  function applyStatus(item: FeedbackEntry, next: FeedbackStatus) {
    if (next === 'dismissed') {
      setDismissing(item)
      return
    }
    void setFeedbackStatus(item.id, next)
  }

  return (
    <>
      <AdminPageHeader
        title="Feedback Moderator"
        description="Bug reports, suggestions and queries submitted from the feedback page."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile icon={MessageSquare} label="Total entries" value={feedback.length} tone="plain" />
        <StatTile
          icon={Inbox}
          label="Open"
          value={counts.open ?? 0}
          tone={counts.open ? 'warning' : 'plain'}
          hint="Waiting for a first response"
        />
        <StatTile icon={MessageSquare} label="Resolved" value={counts.resolved ?? 0} tone="plain" />
        <StatTile icon={MessageSquare} label="Dismissed" value={counts.dismissed ?? 0} tone="plain" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <FilterInput
          value={search}
          onChange={setSearch}
          label="Search feedback"
          placeholder="Search messages and names…"
        />
        <FilterSelect
          value={status}
          onChange={(value) => setStatus(value as FeedbackStatus | 'all')}
          label="Status"
          options={[
            { value: 'all', label: `All statuses (${feedback.length})` },
            ...STATUSES.map((value) => ({
              value,
              label: `${value[0].toUpperCase()}${value.slice(1)} (${counts[value] ?? 0})`,
            })),
          ]}
        />
        <FilterSelect
          value={type}
          onChange={setType}
          label="Type"
          options={[
            { value: 'all', label: 'All types' },
            ...TYPES.map((value) => ({
              value,
              label: value[0].toUpperCase() + value.slice(1),
            })),
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={feedback.length === 0 ? 'No feedback yet' : 'Nothing matches those filters'}
          body={
            feedback.length === 0
              ? 'Entries submitted through the public feedback page will appear here.'
              : 'Clear the search or widen the status and type filters.'
          }
          actionText={feedback.length > 0 ? 'Clear filters' : undefined}
          onAction={feedback.length > 0 ? () => { setSearch(''); setStatus('all'); setType('all') } : undefined}
        />
      ) : (
        <ul className="space-y-3">
          {filtered.map((item) => {
            const open = expanded === item.id
            return (
              <li key={item.id} className="surface-card overflow-hidden">
                <div className="flex flex-wrap items-start gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <StatusPill value={item.type} />
                      <StatusPill value={item.status} />
                      <span className="text-xs text-ink-subtle">
                        {item.userName} · {formatRelative(item.createdAt)}
                      </span>
                    </div>
                    <p
                      className={
                        open
                          ? 'text-sm leading-relaxed text-ink'
                          : 'line-clamp-2 text-sm leading-relaxed text-ink'
                      }
                    >
                      {item.message}
                    </p>
                    <p className="mt-1.5 text-[11px] text-ink-subtle">
                      {item.email} · submitted {formatDate(item.createdAt)}
                    </p>
                  </div>

                  {/* Satisfaction, only meaningful when the visitor rated it. */}
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] uppercase tracking-wide text-ink-subtle">Rated</p>
                    <p className="text-sm font-bold tabular-nums text-ink">
                      {item.rating}
                      <span className="text-ink-subtle">/5</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-line bg-surface-sunken/60 px-4 py-2.5">
                  <AdminButton variant="secondary" onClick={() => setExpanded(open ? null : item.id)}>
                    {open ? 'Show less' : 'Show full message'}
                  </AdminButton>
                  <div className="ml-auto flex flex-wrap gap-2">
                    {/*
                      status arrives as a plain string from the API rather than a
                      union, so a value outside the four the table knows (a row
                      written by an older build, say) would index to undefined and
                      throw on.map. Falling back to no actions shows the entry
                      read-only instead of taking the queue down.
                    */}
                    {(item.status in NEXT_ACTIONS
                      ? NEXT_ACTIONS[item.status as FeedbackStatus]
                      : []
                    ).map((action) => (
                      <AdminButton
                        key={action.to + action.label}
                        variant={action.to === 'dismissed' ? 'danger' : 'primary'}
                        onClick={() => applyStatus(item, action.to)}
                      >
                        {action.label}
                      </AdminButton>
                    ))}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <ConfirmDialog
        isOpen={dismissing !== null}
        title="Dismiss this feedback?"
        body={
          dismissing
            ? `"${dismissing.message.slice(0, 90)}${dismissing.message.length > 90 ? '…' : ''}" will be marked dismissed. It stays in the queue and can be reopened.`
            : ''
        }
        confirmText="Dismiss"
        isWarning
        onConfirm={() => {
          if (dismissing) setFeedbackStatus(dismissing.id, 'dismissed')
          setDismissing(null)
        }}
        onCancel={() => setDismissing(null)}
      />
    </>
  )
}
