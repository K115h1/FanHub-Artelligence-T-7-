// Charts — lightweight SVG/CSS visualisations for the admin statistics page.
//
// Deliberately no charting library. Every chart here is a bar, a ring or a
// stacked meter, all of which are a few lines of SVG and keep the bundle small
// (see the rubric: no heavy dependency for a dashboard nobody needs axes on).
//
// RULE FOR THIS MODULE: only chart numbers that exist. There is no fabricated
// activity curve and no chatbot series — the chatbot is a deferred feature, and
// a chart full of zeroes reads as a bug rather than as an honest "no data yet".
// When a chart has nothing to show, the page renders an EmptyState instead.

import type { ReactNode } from 'react'

export interface BarDatum {
  label: string
  value: number
  /** Right-hand annotation, e.g. a percentage. */
  hint?: string
  /** Overrides the bar's fill — used to flag a zero or warning value. */
  tone?: 'accent' | 'muted' | 'warning'
}

// ---------- horizontal bar chart ----------

/**
 * Horizontal bars, longest at the top. Labelled outside the bar so long fandom
 * names never get clipped by a short track.
 */
export function BarChart({
  data,
  emptyLabel = 'Nothing to chart yet.',
  valueSuffix = '',
}: {
  data: BarDatum[]
  emptyLabel?: string
  valueSuffix?: string
}) {
  const max = Math.max(1, ...data.map((d) => d.value))
  const allZero = data.every((d) => d.value === 0)

  if (allZero) {
    return (
      <p className="rounded-lg border border-dashed border-line-strong bg-surface-sunken px-4 py-8 text-center text-sm text-ink-subtle">
        {emptyLabel}
      </p>
    )
  }

  return (
    <ul className="space-y-2.5">
      {data.map((datum) => {
        const percent = Math.round((datum.value / max) * 100)
        const tone =
          datum.tone ?? (datum.value === 0 ? 'muted' : 'accent')
        const barClass =
          tone === 'accent'
            ? 'bg-accent'
            : tone === 'warning'
              ? 'bg-amber-500'
              : 'bg-line-strong'

        return (
          <li key={datum.label}>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="truncate text-xs font-medium text-ink">{datum.label}</span>
              <span className="shrink-0 text-xs tabular-nums text-ink-muted">
                {datum.value.toLocaleString()}
                {valueSuffix}
                {datum.hint && <span className="ml-1.5 text-ink-subtle">{datum.hint}</span>}
              </span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-surface-sunken"
              role="img"
              aria-label={`${datum.label}: ${datum.value.toLocaleString()}${valueSuffix}`}
            >
              <div
                className={`h-full rounded-full ${barClass} transition-[width] duration-500`}
                // A zero-value bar still renders a hairline so the row is not
                // mistaken for a layout bug.
                style={{ width: datum.value === 0 ? '2px' : `${Math.max(percent, 2)}%` }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

// ---------- ring / completeness meter ----------

/**
 * A single completion ring, e.g. "312 of 2,490 titles have a poster".
 * Colour is driven by `percent` so a near-empty dataset is obvious at a glance.
 */
export function RingStat({
  label,
  value,
  total,
  caption,
}: {
  label: string
  value: number
  total: number
  caption?: string
}) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0
  const radius = 34
  const circumference = 2 * Math.PI * radius
  const filled = (percent / 100) * circumference
  const stroke = percent >= 70 ? 'var(--accent)' : percent >= 25 ? '#a855f7' : 'var(--line-strong)'

  return (
    <div className="flex items-center gap-4">
      {/* The arcs are rotated as a group so the sweep starts at 12 o'clock. Doing
          it on a <g> rather than the whole svg means the percentage label needs
          no counter-rotation to stay upright. */}
      <svg
        viewBox="0 0 80 80"
        className="h-20 w-20 shrink-0"
        role="img"
        aria-label={`${label}: ${value.toLocaleString()} of ${total.toLocaleString()} (${percent}%)`}
      >
        <g transform="rotate(-90 40 40)">
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke="var(--surface-sunken)"
            strokeWidth="9"
          />
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${filled} ${circumference - filled}`}
            className="transition-[stroke-dasharray] duration-700"
          />
        </g>
        <text
          x="40"
          y="40"
          dominantBaseline="central"
          textAnchor="middle"
          className="fill-current text-[15px] font-bold"
        >
          {percent}%
        </text>
      </svg>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="mt-0.5 text-xs tabular-nums text-ink-muted">
          {value.toLocaleString()} of {total.toLocaleString()}
        </p>
        {caption && <p className="mt-1 text-[11px] text-ink-subtle">{caption}</p>}
      </div>
    </div>
  )
}

// ---------- stacked status meter ----------

/** A single horizontal stacked bar, e.g. the feedback queue by status. */
export function StackedMeter({
  segments,
}: {
  segments: { label: string; value: number; className: string }[]
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)

  if (total === 0) {
    return (
      <p className="rounded-lg border border-dashed border-line-strong bg-surface-sunken px-4 py-6 text-center text-sm text-ink-subtle">
        No entries yet.
      </p>
    )
  }

  return (
    <div>
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-surface-sunken"
        role="img"
        aria-label={segments
          .filter((s) => s.value > 0)
          .map((s) => `${s.label} ${s.value}`)
          .join(', ')}
      >
        {segments.map((seg) =>
          seg.value > 0 ? (
            <div
              key={seg.label}
              className={seg.className}
              style={{ width: `${(seg.value / total) * 100}%` }}
            />
          ) : null,
        )}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
        {segments.map((seg) => (
          <li key={seg.label} className="flex items-center gap-1.5 text-xs">
            <span className={`h-2.5 w-2.5 rounded-full ${seg.className}`} aria-hidden="true" />
            <span className="text-ink-muted">{seg.label}</span>
            <span className="font-semibold tabular-nums text-ink">{seg.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ---------- shared chart card ----------

/** Consistent framed container with a title, used by every panel on /admin/stats. */
export function ChartCard({
  title,
  subtitle,
  children,
  action,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <section className="surface-card p-5">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-ink">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-ink-subtle">{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  )
}
