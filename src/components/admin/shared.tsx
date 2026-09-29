// Shared UI for the admin pages.
//
// Small presentational pieces the six pages all need: the KPI tile, the status
// pill, the pagination bar and the filter field. They live here rather than in
// pages/admin/ because a page file should read as page layout, not as a second
// component library.

import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Skeleton } from '../ui/Skeleton'

// ---------- page header ----------

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-muted">{description}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  )
}

// ---------- KPI tile ----------

export function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  to,
  tone = 'accent',
}: {
  icon: LucideIcon
  label: string
  value: ReactNode
  hint?: string
  /** Makes the whole tile a link, for the dashboard's shortcuts. */
  to?: string
  tone?: 'accent' | 'warning' | 'plain'
}) {
  const iconClass =
    tone === 'warning'
      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
      : tone === 'plain'
        ? 'bg-surface-sunken text-ink-muted'
        : 'bg-accent-soft text-accent'

  const body = (
    <>
      <span
        className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${iconClass}`}
      >
        <Icon size={17} aria-hidden="true" />
      </span>
      <p className="text-2xl font-bold leading-none tabular-nums text-ink">{value}</p>
      <p className="mt-1.5 text-xs font-semibold text-ink-muted">{label}</p>
      {hint && <p className="mt-0.5 text-[11px] text-ink-subtle">{hint}</p>}
    </>
  )

  if (!to) return <div className="surface-card p-4">{body}</div>

  return (
    <a
      href={to}
      className="surface-card block p-4 transition hover:border-accent"
    >
      {body}
      <span className="sr-only">Open {label}</span>
    </a>
  )
}

// ---------- status pill ----------

const PILL_TONES = {
  // Feedback
  open: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  reviewed: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  resolved: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  dismissed: 'bg-line-strong/40 text-ink-muted',
  // Submissions
  pending: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  approved: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  rejected: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  // Content, the contents.status column:
  // ENUM('released','upcoming','ongoing','ended','cancelled').
  // 'announced' and 'discontinued' were here and matched no column, so a title
  // in any real non-released state fell through to the muted default.
  released: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  upcoming: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  ongoing: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  ended: 'bg-line-strong/40 text-ink-muted',
  cancelled: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  // Roles
  admin: 'bg-accent-soft text-accent',
  registered: 'bg-line-strong/40 text-ink-muted',
  // Feedback type
  bug: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  suggestion: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  query: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  content: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
} as const

export type PillTone = keyof typeof PILL_TONES

export function StatusPill({ value, label }: { value: string; label?: string }) {
  const tone = PILL_TONES[value as PillTone] ?? 'bg-line-strong/40 text-ink-muted'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${tone}`}
    >
      {label ?? value}
    </span>
  )
}

// ---------- search field ----------

export function FilterInput({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  label: string
}) {
  return (
    <div className="relative flex-1 min-w-[200px]">
      <label htmlFor="admin-filter" className="sr-only">
        {label}
      </label>
      <Search
        size={15}
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle"
      />
      <input
        id="admin-filter"
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-sm text-ink transition placeholder:text-ink-subtle focus:border-accent"
      />
    </div>
  )
}

/** A select element styled to match FilterInput. */
export function FilterSelect({
  value,
  onChange,
  label,
  options,
}: {
  value: string
  onChange: (value: string) => void
  label: string
  options: { value: string; label: string }[]
}) {
  return (
    <label className="flex items-center gap-2 text-xs font-medium text-ink-muted">
      <span className="sr-only sm:not-sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink transition focus:border-accent"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

// ---------- pagination ----------

export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  onChange,
}: {
  page: number
  pageCount: number
  total: number
  pageSize: number
  onChange: (page: number) => void
}) {
  if (total === 0) return null

  const first = (page - 1) * pageSize + 1
  const last = Math.min(total, page * pageSize)

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-col items-center justify-between gap-3 border-t border-line px-4 py-3 sm:flex-row"
    >
      <p className="text-xs tabular-nums text-ink-muted">
        Showing <span className="font-semibold text-ink">{first.toLocaleString()}</span>–
        <span className="font-semibold text-ink">{last.toLocaleString()}</span> of{' '}
        <span className="font-semibold text-ink">{total.toLocaleString()}</span>
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-ink-muted transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink-muted"
        >
          <ChevronLeft size={14} aria-hidden="true" />
          Previous
        </button>
        <span className="px-1 text-xs tabular-nums text-ink-subtle">
          {page} / {pageCount}
        </span>
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page >= pageCount}
          className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-ink-muted transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink-muted"
        >
          Next
          <ChevronRight size={14} aria-hidden="true" />
        </button>
      </div>
    </nav>
  )
}

// ---------- small buttons ----------

const BUTTON_VARIANTS = {
  primary:
    'bg-accent text-accent-ink hover:bg-accent-hover disabled:opacity-40',
  secondary:
    'border border-line text-ink-muted hover:border-accent hover:text-accent disabled:opacity-40',
  danger:
    'border border-rose-500/40 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400 disabled:opacity-40',
} as const

export function AdminButton({
  variant = 'secondary',
  className = '',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof BUTTON_VARIANTS
}) {
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition disabled:cursor-not-allowed ${BUTTON_VARIANTS[variant]} ${className}`}
    />
  )
}

/** Formats an ISO timestamp as a short date, for the moderation queues. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** "3 days ago" style relative time, falling back to the absolute date. */
export function formatRelative(iso: string): string {
  const then = new Date(iso).getTime()
  const days = Math.round((Date.now() - then) / 86_400_000)
  if (Number.isNaN(days)) return formatDate(iso)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days} days ago`
  return formatDate(iso)
}

/**
 * Placeholder rows for a table awaiting its first page.
 *
 * The admin tables fetch on mount, so without this they render an
 * "EmptyState, no titles match those filters" for the duration of the request,
 * which reads as "your filters matched nothing" and invites the administrator to
 * clear filters that were fine. Showing table-shaped rows is the honest state.
 */
export function TableSkeleton({ rows = 8, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <div className="surface-card overflow-hidden" aria-busy="true" aria-live="polite">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <caption className="sr-only">Loading</caption>
          <tbody className="divide-y divide-line">
            {Array.from({ length: rows }, (_, r) => (
              <tr key={r}>
                {Array.from({ length: columns }, (_, c) => (
                  <td key={c} className="px-4 py-3">
                    <Skeleton className="h-4 w-full max-w-24" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="sr-only">Loading rows</p>
    </div>
  )
}
