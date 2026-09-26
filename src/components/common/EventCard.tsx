// EventCard — used by the "Upcoming events" and "Events near you" rows.
import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import type { UpcomingEvent } from '../../lib/mockData'
import { CategoryDot } from './CategoryArt'
import { toSlug } from '../../lib/mockData'

// "Online" and "Near you" events get a different treatment from a named city,
// so the two sections are visually distinguishable at a glance.
export default function EventCard({
  event,
  near = false,
}: {
  event: UpcomingEvent
  near?: boolean
}) {
  const isOnline = event.location === 'Online'

  return (
    <Link
      to="/events"
      className="surface-card flex items-center gap-4 p-4 hover:-translate-y-0.5"
    >
      {/* Date block — the anchor of the card, so the eye lands on it first. */}
      <div className="accent-wash flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-lg text-white">
        <span className="text-xl leading-none font-bold">{event.day}</span>
        <span className="mt-0.5 text-[11px] font-semibold tracking-wider uppercase">
          {event.month}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate font-semibold text-ink">{event.title}</h3>
        <p className="mt-1 flex items-center gap-1 truncate text-sm text-ink-muted">
          <MapPin size={13} aria-hidden="true" className="shrink-0" />
          {near && !isOnline ? 'Near you' : event.location}
        </p>
        <span className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-accent">
          <CategoryDot slug={toSlug(event.tag)} />
          {event.tag}
        </span>
      </div>
    </Link>
  )
}
