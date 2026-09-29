// AdminDashboard, route: /admin.
//
// Overview of the catalogue and the two moderation queues, with shortcuts into
// each section. Every figure is derived from real data by useAdminStats(); the
// dashboard invents nothing, and where a metric genuinely has no data yet it
// says so rather than showing a zero.

import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  CalendarClock,
  Database,
  Inbox,
  Layers,
  Library,
  MessageSquare,
  Sparkles,
  Tags,
  Users,
} from 'lucide-react'
import { BarChart, ChartCard, StackedMeter } from '../../components/charts'
import { AdminPageHeader, StatTile, StatusPill } from '../../components/admin/shared'
import { useAdminData, FANDOM_LABELS } from '../../features/admin/AdminDataProvider'
import { useAdminStats } from '../../features/admin/hooks'
import type { FandomKey } from '../../features/admin/types'

const FEEDBACK_TONE: Record<string, string> = {
  open: 'bg-amber-500',
  reviewed: 'bg-sky-500',
  resolved: 'bg-emerald-500',
  dismissed: 'bg-line-strong',
}

const SUBMISSION_TONE: Record<string, string> = {
  pending: 'bg-amber-500',
  approved: 'bg-emerald-500',
  rejected: 'bg-rose-500',
}

export default function AdminDashboard() {
  const stats = useAdminStats()
  const { feedback, submissions } = useAdminData()

  const recentFeedback = [...feedback]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4)
  const waitingSubmissions = submissions
    .filter((item) => item.status === 'pending')
    .slice(0, 4)

  const fandomBars = stats.perCategory.map((category) => ({
    label: category.name,
    value: category.total,
  }))

  // Coverage as a share of the whole catalogue, not per fandom, the point is
  // "how much of the site is still empty", which is one number.
  const coverage = [
    { label: 'Release year', value: stats.withYear },
    { label: 'Poster image', value: stats.withPoster },
    { label: 'Synopsis', value: stats.withSynopsis },
  ]

  return (
    <>
      <AdminPageHeader
        title="Overview"
        description="Catalogue size, data completeness and what is waiting for review."
      />

      {/* Headline numbers. The first four link to the section that owns them. */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile
          icon={Library}
          label="Titles in catalogue"
          value={stats.totalTitles.toLocaleString()}
          hint={`${stats.totalGenres} genres`}
          to="/admin/content"
        />
        <StatTile
          icon={Inbox}
          label="Submissions pending"
          value={stats.pendingSubmissions}
          hint="Fan content awaiting a decision"
          to="/admin/submissions"
          tone={stats.pendingSubmissions > 0 ? 'warning' : 'plain'}
        />
        <StatTile
          icon={MessageSquare}
          label="Feedback open"
          value={stats.openFeedback}
          hint={`${feedback.length} entries in total`}
          to="/admin/feedback"
          tone={stats.openFeedback > 0 ? 'warning' : 'plain'}
        />
        <StatTile
          icon={Users}
          label="Accounts on device"
          value={stats.accountCount}
          hint={`${stats.adminCount} administrator${stats.adminCount === 1 ? '' : 's'}`}
          to="/admin/users"
        />
      </div>

      {/* Alerts, only rendered when there is genuinely something to act on.
          This used to count un-committed localStorage edits waiting to be
          "published". Writes go straight to the database now, so there is no
          such queue; the moderation alerts below are the real pending work. */}
      {stats.error && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3">
          <AlertTriangle size={16} className="text-rose-600 dark:text-rose-400" aria-hidden="true" />
          <p className="flex-1 text-sm text-ink">{stats.error}</p>
          <button
            type="button"
            onClick={stats.refresh}
            className="rounded-lg border border-rose-500/50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-500/10 dark:text-rose-300"
          >
            Retry
          </button>
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Titles by category" subtitle="Rows in the contents table, per fandom.">
          <BarChart data={fandomBars} valueSuffix="" />
        </ChartCard>

        <ChartCard
          title="Data completeness"
          subtitle="How much of the catalogue has been filled in."
        >
          {stats.withPoster === 0 && stats.withSynopsis === 0 ? (
            <div className="rounded-lg border border-dashed border-line-strong bg-surface-sunken px-4 py-8 text-center">
              <Sparkles size={20} className="mx-auto mb-2 text-ink-subtle" aria-hidden="true" />
              <p className="text-sm font-medium text-ink">Awaiting details</p>
              <p className="mx-auto mt-1 max-w-xs text-xs text-ink-muted">
                Every title and genre is in place. Add release years, artwork and synopses from
                the Content Manager to fill this in.
              </p>
            </div>
          ) : (
            <BarChart
              data={coverage.map((item) => ({
                ...item,
                hint: stats.totalTitles ? `${Math.round((item.value / stats.totalTitles) * 100)}%` : '',
              }))}
            />
          )}
        </ChartCard>

        <ChartCard
          title="Feedback queue"
          subtitle="Every feedback entry by status."
          action={
            <Link to="/admin/feedback" className="text-xs font-semibold text-accent hover:underline">
              Moderate
            </Link>
          }
        >
          <StackedMeter
            segments={(['open', 'reviewed', 'resolved', 'dismissed'] as const).map((status) => ({
              label: status,
              value: feedback.filter((item) => item.status === status).length,
              className: FEEDBACK_TONE[status],
            }))}
          />
        </ChartCard>

        <ChartCard
          title="Submission queue"
          subtitle="Fan content by moderation decision."
          action={
            <Link to="/admin/submissions" className="text-xs font-semibold text-accent hover:underline">
              Review
            </Link>
          }
        >
          <StackedMeter
            segments={(['pending', 'approved', 'rejected'] as const).map((status) => ({
              label: status,
              value: submissions.filter((item) => item.status === status).length,
              className: SUBMISSION_TONE[status],
            }))}
          />
        </ChartCard>
      </div>

      {/* Shortcuts. Each names what the page actually does, not just its route. */}
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-bold text-ink">Management sections</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ShortcutCard
            to="/admin/content"
            icon={Layers}
            title="Content Manager"
            body="Search, tag, edit and add titles across all five fandoms."
          />
          <ShortcutCard
            to="/admin/submissions"
            icon={Inbox}
            title="Submissions"
            body="Approve or reject fan-written content before it goes live."
          />
          <ShortcutCard
            to="/admin/feedback"
            icon={MessageSquare}
            title="Feedback Moderator"
            body="Work through bug reports, suggestions and queries."
          />
          <ShortcutCard
            to="/admin/users"
            icon={Users}
            title="User Manager"
            body="Review accounts and change roles."
          />
          <ShortcutCard
            to="/admin/stats"
            icon={Database}
            title="Statistics"
            body="Catalogue size, coverage and queue breakdowns."
          />
        </div>
      </section>

      {/* Waiting work, so the dashboard is actionable rather than decorative. */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="surface-card p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
            <Inbox size={15} className="text-accent" aria-hidden="true" />
            Waiting for review
          </h2>
          {waitingSubmissions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line-strong bg-surface-sunken px-4 py-6 text-center text-xs text-ink-subtle">
              Nothing pending. The submission queue is clear.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {waitingSubmissions.map((item) => (
                <li key={item.id} className="py-2.5 first:pt-0 last:pb-0">
                  <p className="truncate text-sm font-medium text-ink">{item.title}</p>
                  <p className="mt-0.5 flex items-center gap-2 text-xs text-ink-subtle">
                    <span className="capitalize">{FANDOM_LABELS[item.categorySlug as FandomKey] ?? item.categorySlug}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.userName}</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Link
            to="/admin/submissions"
            className="mt-3 inline-block text-xs font-semibold text-accent hover:underline"
          >
            Open the queue
          </Link>
        </section>

        <section className="surface-card p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
            <CalendarClock size={15} className="text-accent" aria-hidden="true" />
            Newest feedback
          </h2>
          <ul className="divide-y divide-line">
            {recentFeedback.map((item) => (
              <li key={item.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                <StatusPill value={item.type} />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-xs leading-relaxed text-ink">{item.message}</p>
                  <p className="mt-1 text-[11px] text-ink-subtle">
                    {item.userName} · {formatDay(item.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <Link
            to="/admin/feedback"
            className="mt-3 inline-block text-xs font-semibold text-accent hover:underline"
          >
            Open the queue
          </Link>
        </section>
      </div>
    </>
  )
}

function ShortcutCard({
  to,
  icon: Icon,
  title,
  body,
}: {
  to: string
  icon: typeof Tags
  title: string
  body: string
}) {
  return (
    <Link to={to} className="surface-card group block p-4 transition hover:border-accent">
      <span className="mb-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
        <Icon size={16} aria-hidden="true" />
      </span>
      <p className="text-sm font-semibold text-ink group-hover:text-accent">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-ink-muted">{body}</p>
    </Link>
  )
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}
