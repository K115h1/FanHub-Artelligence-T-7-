// EventDetail — one event in full.
//
// The Events list links here, which is where the interest toggle, a shareable
// link and the "what's on around the same time" list live.
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MapPin, Ticket, Globe, Check, Share2, CalendarDays, ArrowRight } from 'lucide-react'
import PageHero from '../components/common/PageHero'
import SectionHeader from '../components/common/SectionHeader'
import EventCard from '../components/common/EventCard'
import { CategoryDot } from '../components/common/CategoryArt'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useAsync } from '../hooks/useAsync'
import { getEventById, getEvents } from '../services/event.service'
import { CATEGORY_MAP, toSlug } from '../lib/mockData'

const INTEREST_KEY = 'fanhub-event-interest'

/** "Saturday 22 October 2026" — fuller than the card's day/month tiles. */
// An event with no confirmed date shows as such rather than as "Invalid Date".
function longDate(iso: string | null): string {
  if (!iso) return 'Date to be announced'
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function EventDetail() {
  const { id } = useParams()
  const [interest, setInterest] = useLocalStorage<number[]>(INTEREST_KEY, [])
  const [copied, setCopied] = useState(false)

  const { data: event, loading, error } = useAsync(
    () => getEventById(Number(id)),
    [id],
  )

  // All events, so the "similar" row can be built from real rows: same fandom
  // first, then anything else coming up.
  const { data: allEvents } = useAsync(() => getEvents(), [])

  const similar = useMemo(() => {
    if (!event) return []
    const others = (allEvents ?? []).filter((e) => e.id !== event.id)
    const sameTag = others.filter((e) => e.categorySlug === event.categorySlug)
    return [...sameTag, ...others.filter((e) => e.categorySlug !== event.categorySlug)].slice(0, 4)
  }, [event, allEvents])

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-10 sm:px-6">
        <div className="h-56 animate-pulse rounded-xl border border-line bg-surface-sunken" />
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold text-ink">We couldn’t find that event</h1>
        <p className="text-sm text-ink-muted">
          {error ?? 'It may have been cancelled or rescheduled.'}
        </p>
        <Link to="/events" className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
          All events <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    )
  }

  // Captured as a const so the closures below don't re-narrow `event`.
  const eventId = event.id
  const going = interest.includes(eventId)
  const category = CATEGORY_MAP[toSlug(event.categorySlug)]

  function toggleInterest() {
    setInterest((current) =>
      current.includes(eventId) ? current.filter((x) => x !== eventId) : [...current, eventId],
    )
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard can be blocked in an insecure context.
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHero
        kicker={category?.name ?? event.categorySlug}
        title={event.title}
        icon={category?.icon ?? CalendarDays}
        blurb={event.summary ?? undefined}
      >
        <button
          type="button"
          onClick={toggleInterest}
          aria-pressed={going}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold shadow-lg shadow-black/20 transition ${
            going ? 'bg-accent text-accent-ink' : 'bg-white text-purple-700 hover:bg-purple-50'
          }`}
        >
          {going ? <Check size={15} aria-hidden="true" /> : <CalendarDays size={15} aria-hidden="true" />}
          {going ? "You're going" : "I'm interested"}
        </button>
        <button
          type="button"
          onClick={copyLink}
          className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-black/25 px-3 py-2.5 text-sm font-medium text-white backdrop-blur-md transition hover:bg-black/40"
        >
          {copied ? <Check size={15} aria-hidden="true" /> : <Share2 size={15} aria-hidden="true" />}
          {copied ? 'Link copied' : 'Share'}
        </button>
      </PageHero>

      <div className="grid gap-6 lg:grid-cols-3">
        <section aria-labelledby="event-details" className="surface-card p-5 lg:col-span-2">
          <h2 id="event-details" className="text-sm font-semibold text-ink">
            Details
          </h2>

          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <CalendarDays size={16} className="mt-0.5 shrink-0 text-ink-subtle" aria-hidden="true" />
              <div>
                <dt className="text-xs text-ink-subtle">Date</dt>
                <dd className="text-sm text-ink">{longDate(event.startsAt)}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              {event.isOnline ? (
                <Globe size={16} className="mt-0.5 shrink-0 text-ink-subtle" aria-hidden="true" />
              ) : (
                <MapPin size={16} className="mt-0.5 shrink-0 text-ink-subtle" aria-hidden="true" />
              )}
              <div>
                <dt className="text-xs text-ink-subtle">Where</dt>
                <dd className="text-sm text-ink">
                  {event.isOnline ? 'Online' : (event.city ?? event.location ?? 'TBA')}
                </dd>
              </div>
            </div>
            {/* Attendance and ticket price have no column in fan_events, so
                they are omitted rather than shown as "0 people" / "—". */}
            {event.priceNote && (
              <div className="flex items-start gap-2">
                <Ticket size={16} className="mt-0.5 shrink-0 text-ink-subtle" aria-hidden="true" />
                <div>
                  <dt className="text-xs text-ink-subtle">Tickets</dt>
                  <dd className="text-sm text-ink">{event.priceNote}</dd>
                </div>
              </div>
            )}
          </dl>

          <p className="mt-5 border-t border-line pt-4 text-sm leading-relaxed text-ink-muted">
            {event.summary}
          </p>

          {event.ticketUrl && (
            <a
              href={event.ticketUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent"
            >
              <Ticket size={14} aria-hidden="true" />
              Get tickets
            </a>
          )}
        </section>

        <div className="space-y-4">
          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold text-ink">Fandom</h2>
            <Link
              to={`/category/${event.categorySlug}`}
              className="mt-3 flex items-center gap-2 text-sm text-ink transition hover:text-accent"
            >
              <CategoryDot slug={event.categorySlug} />
              {category?.name ?? event.categorySlug}
            </Link>
            <Link
              to={`/events?category=${event.categorySlug}`}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-accent transition hover:gap-2"
            >
              All {category?.name ?? event.categorySlug} events{' '}
              <ArrowRight size={12} aria-hidden="true" />
            </Link>
          </section>

          {going && (
            <section className="surface-card p-5">
              <h2 className="text-sm font-semibold text-ink">You're on the list</h2>
              <p className="mt-1.5 text-xs text-ink-muted">
                {event.title} has been added to your interests.
              </p>
              <Link
                to="/events"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-accent transition hover:gap-2"
              >
                See everything you're going to <ArrowRight size={12} aria-hidden="true" />
              </Link>
            </section>
          )}
        </div>
      </div>

      {similar.length > 0 && (
        <section aria-labelledby="other-events">
          <SectionHeader
            id="other-events"
            title="Other events coming up"
            icon={CalendarDays}
            viewAllHref="/events"
          />
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {similar.map((other) => (
              <EventCard key={other.id} event={other} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
