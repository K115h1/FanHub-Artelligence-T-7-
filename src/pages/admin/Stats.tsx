// Stats — route: /admin/stats.
//
// Usage statistics for the catalogue and the moderation queues.
//
// SCOPE NOTE, because the SRS asks for more than this page can honestly show:
// it wants active-user counts, view counts and chatbot interaction volume. None
// of those can be measured yet. There is no API collecting events, `contents`
// has no view data populated, and the chatbot is a deferred feature. Rather
// than draw a chart of zeroes — which reads as a bug to a reviewer — those
// panels are listed as unavailable with the reason. They get filled in when the
// API starts recording them.

import { BarChart, ChartCard, RingStat, StackedMeter } from '../../components/charts'
import { AdminPageHeader, StatTile } from '../../components/admin/shared'
import { useAdminData } from '../../features/admin/AdminDataProvider'
import { useAdminStats } from '../../features/admin/hooks'
import { BookMarked, Image, Layers, ScrollText } from 'lucide-react'

/** The twenty most-used genre tags across the catalogue. */
function useTopGenres() {
  const { rows } = useAdminData()
  const counts = new Map<string, number>()
  for (const row of rows) {
    for (const genre of row.genres) counts.set(genre, (counts.get(genre) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 20)
    .map(([label, value]) => ({ label, value }))
}

export default function Stats() {
  const stats = useAdminStats()
  const { feedback, submissions } = useAdminData()
  const topGenres = useTopGenres()

  const completeness = [
    { label: 'Release year', value: stats.withYear },
    { label: 'Poster image', value: stats.withPoster },
    { label: 'Synopsis', value: stats.withSynopsis },
  ]

  // Per-fandom coverage, so you can see which fandom needs enriching first.
  const perFandom = stats.perCategory.map((category) => {
    const pct = category.total ? Math.round((category.withSynopsis / category.total) * 100) : 0
    return {
      label: category.name,
      value: category.withSynopsis,
      hint: `of ${category.total}`,
      tone: (pct === 0 ? 'muted' : 'accent') as 'muted' | 'accent',
    }
  })

  return (
    <>
      <AdminPageHeader
        title="Statistics"
        description="Catalogue size, metadata coverage and moderation volume."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile icon={Layers} label="Titles" value={stats.totalTitles.toLocaleString()} />
        <StatTile icon={BookMarked} label="Genres" value={stats.totalGenres} tone="plain" />
        <StatTile
          icon={ScrollText}
          label="Moderation items"
          value={feedback.length + submissions.length}
          tone="plain"
          hint="Feedback and submissions"
        />
        <StatTile
          icon={BookMarked}
          label="Avg titles / genre"
          value={stats.totalGenres ? Math.round(stats.totalTitles / stats.totalGenres) : 0}
          tone="plain"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Catalogue by category"
          subtitle="Rows per fandom. These are the five entries in the categories table."
        >
          <BarChart
            data={stats.perCategory.map((category) => ({
              label: category.name,
              value: category.total,
            }))}
          />
        </ChartCard>

        <ChartCard
          title="Titles per genre"
          subtitle="The twenty most-used tags."
        >
          <BarChart data={topGenres} />
        </ChartCard>

        <ChartCard
          title="Metadata coverage"
          subtitle="How much of the catalogue has been filled in."
        >
          {completeness.every((item) => item.value === 0) ? (
            <div className="rounded-lg border border-dashed border-line-strong bg-surface-sunken px-4 py-8 text-center">
              <p className="text-sm font-medium text-ink">Awaiting details</p>
              <p className="mx-auto mt-1 max-w-sm text-xs text-ink-muted">
                Every title and genre is in place. Release years, artwork and synopses can be
                added from the Content Manager.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <RingStat
                label="Release year"
                value={stats.withYear}
                total={stats.totalTitles}
                caption="Only titles whose source list included a year"
              />
              <RingStat
                label="Poster image"
                value={stats.withPoster}
                total={stats.totalTitles}
                caption="Titles that have artwork assigned"
              />
              <RingStat
                label="Synopsis"
                value={stats.withSynopsis}
                total={stats.totalTitles}
              />
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Synopses by fandom"
          subtitle="Which category needs enriching first."
        >
          <BarChart
            data={perFandom}
            emptyLabel="No synopses yet, so there is nothing to compare."
          />
        </ChartCard>

        <ChartCard title="Feedback by status" subtitle={`${feedback.length} entries total.`}>
          <StackedMeter
            segments={(
              [
                ['open', 'bg-amber-500'],
                ['reviewed', 'bg-sky-500'],
                ['resolved', 'bg-emerald-500'],
                ['dismissed', 'bg-line-strong'],
              ] as const
            ).map(([label, className]) => ({
              label,
              value: feedback.filter((item) => item.status === label).length,
              className,
            }))}
          />
        </ChartCard>

        <ChartCard title="Submissions by status" subtitle={`${submissions.length} entries total.`}>
          <StackedMeter
            segments={(
              [
                ['pending', 'bg-amber-500'],
                ['approved', 'bg-emerald-500'],
                ['rejected', 'bg-rose-500'],
              ] as const
            ).map(([label, className]) => ({
              label,
              value: submissions.filter((item) => item.status === label).length,
              className,
            }))}
          />
        </ChartCard>
      </div>

      {/* Usage metrics that need recorded activity before they mean anything.
          Listing them as pending keeps the page honest instead of drawing
          charts of zeroes. */}
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-bold text-ink">Coming into view</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Unavailable
            title="Active users"
            body="Sign-in activity is recorded as it happens, then charted here."
          />
          <Unavailable
            title="Content view counts"
            body="Every title view is tallied, giving you the most-watched list."
          />
          <Unavailable
            title="Chatbot interactions"
            body="Questions asked and answered, grouped by topic."
          />
        </div>
      </section>
    </>
  )
}

function Unavailable({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-line-strong bg-surface-sunken p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink-muted">
        <Image size={14} aria-hidden="true" />
        {title}
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-ink-subtle">{body}</p>
    </div>
  )
}
