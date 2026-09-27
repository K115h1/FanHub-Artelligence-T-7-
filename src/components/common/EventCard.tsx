// EventCard — used by the "Upcoming events" and "Events near you" rows.
//
// Takes the API's FanEvent. The date tile is derived from startsAt here rather
// than stored pre-formatted, so the database keeps one real date instead of a
// day string and a month string that could disagree with each other.
import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import type { FanEvent } from '../../types/models'
import { CategoryDot } from './CategoryArt'

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

/** ISO string -> { day, month }, or a blank tile when there is no date. */
function dateParts(startsAt: string | null): { day: string; month: string } {
  if (!startsAt) return { day: '--', month: 'TBA' }

  const date = new Date(startsAt)
  if (Number.isNaN(date.getTime())) return { day: '--', month: 'TBA' }

  return { day: String(date.getDate()), month: MONTHS[date.getMonth()] }
}

// `near` relabels the location, so the two sections stay distinguishable.
export default function EventCard({
  event,
  near = false,
}: {
  event: FanEvent
  near?: boolean
}) {
  const { day, month } = dateParts(event.startsAt)
  const place = event.isOnline ? 'Online' : (event.city ?? event.location ?? 'TBA')

  return (
    <Link
      to={`/events/${event.id}`}
      className="surface-card flex items-center gap-4 p-4 hover:-translate-y-0.5"
    >
      {/* Date block — the anchor of the card, so the eye lands on it first. */}
      <div className="accent-wash flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-lg text-white">
        <span className="text-xl leading-none font-bold">{day}</span>
        <span className="mt-0.5 text-[11px] font-semibold tracking-wider uppercase">{month}</span>
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate font-semibold text-ink">{event.title}</h3>
        <p className="mt-1 flex items-center gap-1 truncate text-sm text-ink-muted">
          <MapPin size={13} aria-hidden="true" className="shrink-0" />
          {near && !event.isOnline ? 'Near you' : place}
        </p>
        <span className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-accent">
          <CategoryDot slug={event.categorySlug} />
          {event.categorySlug}
        </span>
      </div>
    </Link>
  )
}
