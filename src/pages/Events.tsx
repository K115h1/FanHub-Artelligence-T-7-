// Events — conventions, festivals, meetups and screenings.
//
// Three views over one dataset: a featured highlight, a filterable list, and a
// "near you" block driven by the geolocation hook. Which events are on is
// remembered per device, so marking interest survives a reload.
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarDays,
  MapPin,
  Users,
  Ticket,
  Globe,
  Check,
  Sparkles,
  ArrowRight,
  MapPinned,
} from 'lucide-react'
import PageHero from '../components/common/PageHero'
import SectionHeader from '../components/common/SectionHeader'
import { EmptyState } from '../components/common/EmptyState'
import { SearchBar } from '../components/common/SearchBar'
import { CategoryDot } from '../components/common/CategoryArt'
import { useGeolocation } from '../hooks/useGeolocation'
import { useLocalStorage } from '../hooks/useLocalStorage'
import {
  EVENTS,
  EVENT_CITIES,
  EVENTS_BY_CATEGORY,
  byDate,
  formatGoing,
  type FanEvent,
} from '../lib/events'
import { CATEGORIES, toSlug } from '../lib/mockData'

/** Event ids the visitor marked as interested. */
const INTEREST_KEY = 'fanhub-event-interest'

type Mode = 'all' | 'online' | 'in-person'

// ---------- Card ----------

function EventPanel({
  event,
  going,
  onToggleInterest,
  wide = false,
}: {
  event: FanEvent
  going: boolean
  onToggleInterest: (id: number) => void
  wide?: boolean
}) {
  return (
    <article
      className={`surface-card flex flex-col gap-3 p-4 ${wide ? 'sm:flex-row sm:items-start sm:gap-5' : ''}`}
    >
      {/* Date block. */}
      <div
        className={`accent-wash flex shrink-0 flex-col items-center justify-center rounded-lg text-white ${
          wide ? 'h-20 w-20' : 'h-16 w-16'
        }`}
      >
        <span className={`${wide ? 'text-2xl' : 'text-xl'} leading-none font-bold`}>{event.day}</span>
        <span className="mt-0.5 text-[11px] font-semibold tracking-wider uppercase">
          {event.month}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-ink">
            <Link to={`/events/${event.id}`} className="transition hover:text-accent">
              {event.title}
            </Link>
          </h3>
          {event.featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
              <Sparkles size={10} aria-hidden="true" /> Featured
            </span>
          )}
        </div>

        <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{event.summary}</p>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-subtle">
          <span className="inline-flex items-center gap-1 font-medium text-accent">
            <CategoryDot slug={toSlug(event.tag)} />
            {event.tag}
          </span>
          <span className="inline-flex items-center gap-1">
            {event.isOnline ? (
              <>
                <Globe size={12} aria-hidden="true" /> Online
              </>
            ) : (
              <>
                <MapPin size={12} aria-hidden="true" /> {event.location}
              </>
            )}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users size={12} aria-hidden="true" /> {formatGoing(event.going)} going
          </span>
          <span className="inline-flex items-center gap-1">
            <Ticket size={12} aria-hidden="true" /> {event.price}
          </span>
        </div>
      </div>

      {/* Interest toggle. Stands in for RSVP / ticket link until the API lands. */}
      <button
        type="button"
        onClick={() => onToggleInterest(event.id)}
        aria-pressed={going}
        className={`shrink-0 self-start rounded-lg border px-3 py-2 text-xs font-semibold transition ${
          going
            ? 'border-accent bg-accent text-accent-ink'
            : 'border-line text-ink-muted hover:border-accent hover:text-accent'
        }`}
      >
        {going ? (
          <span className="inline-flex items-center gap-1.5">
            <Check size={13} aria-hidden="true" /> Going
          </span>
        ) : (
          'Interested'
        )}
      </button>
    </article>
  )
}

// ---------- Page ----------

export default function Events() {
  const [mode, setMode] = useState<Mode>('all')
  const [category, setCategory] = useState<string>('all')
  const [city, setCity] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [interest, setInterest] = useLocalStorage<number[]>(INTEREST_KEY, [])

  const { coordinates, error, loading, requestLocation } = useGeolocation()

  const sorted = useMemo(() => [...EVENTS].sort(byDate), [])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return sorted.filter((event) => {
      if (mode === 'online' && !event.isOnline) return false
      if (mode === 'in-person' && event.isOnline) return false
      if (category !== 'all' && toSlug(event.tag) !== category) return false
      if (city !== 'all' && event.location !== city) return false
      if (needle && ![event.title, event.summary, event.location, event.tag].some((f) => f.toLowerCase().includes(needle)))
        return false
      return true
    })
  }, [sorted, mode, category, city, query])

  // In-person events only — geolocation can only help with physical ones.
  const inPerson = useMemo(() => sorted.filter((e) => !e.isOnline), [sorted])

  const featured = sorted.find((e) => e.featured) ?? sorted[0]

  function toggleInterest(id: number) {
    setInterest((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    )
  }

  const filtersActive = mode !== 'all' || category !== 'all' || city !== 'all' || query.trim() !== ''

  function resetFilters() {
    setMode('all')
    setCategory('all')
    setCity('all')
    setQuery('')
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHero
        kicker="What's on"
        title="Events"
        icon={CalendarDays}
        blurb="Conventions, festivals, screenings and fan meetups across every fandom — in person and online."
      >
        <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur-md">
          <CalendarDays size={15} aria-hidden="true" />
          {EVENTS.length} upcoming
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur-md">
          <MapPinned size={15} aria-hidden="true" />
          {EVENT_CITIES.length} cities
        </span>
        {interest.length > 0 && (
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-purple-700">
            <Check size={15} aria-hidden="true" />
            {interest.length} marked
          </span>
        )}
      </PageHero>

      {/* ---- Featured ---- */}
      {featured && (
        <section aria-labelledby="event-featured">
          <SectionHeader id="event-featured" title="Featured" icon={Sparkles} />
          <EventPanel
            event={featured}
            wide
            going={interest.includes(featured.id)}
            onToggleInterest={toggleInterest}
          />
        </section>
      )}

      {/* ---- Filters ---- */}
      <section aria-label="Filter events" className="surface-card space-y-4 p-5">
        <div className="max-w-xl">
          <SearchBar value={query} onSearch={setQuery} placeholder="Search events by name, city or fandom…" />
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              { key: 'all', label: 'All events' },
              { key: 'in-person', label: 'In person' },
              { key: 'online', label: 'Online' },
            ] as { key: Mode; label: string }[]
          ).map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setMode(option.key)}
              aria-pressed={mode === option.key}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                mode === option.key
                  ? 'border-accent bg-accent text-accent-ink'
                  : 'border-line bg-surface-raised text-ink-muted hover:border-accent hover:text-accent'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="event-category" className="block text-xs font-medium text-ink-muted">
              Fandom
            </label>
            <select
              id="event-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm text-ink transition focus:border-accent"
            >
              <option value="all">All fandoms</option>
              {CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name} ({(EVENTS_BY_CATEGORY[c.slug] ?? []).length})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="event-city" className="block text-xs font-medium text-ink-muted">
              City
            </label>
            <select
              id="event-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm text-ink transition focus:border-accent"
            >
              <option value="all">All cities</option>
              {/* Online events have no city, so they're excluded from this
                  filter — pick "Online" in the mode row above instead. */}
              {EVENT_CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filtersActive && (
          <button
            type="button"
            onClick={resetFilters}
            className="text-xs font-semibold text-accent underline-offset-2 hover:underline"
          >
            Clear filters
          </button>
        )}
      </section>

      {/* ---- Full list ---- */}
      <section aria-labelledby="event-list">
        <SectionHeader
          id="event-list"
          title="All upcoming"
          icon={CalendarDays}
          subtitle={`${visible.length} ${visible.length === 1 ? 'event' : 'events'}`}
        />

        {visible.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No events match those filters"
            body="Try a different fandom, or clear the filters to see everything."
            actionText="Clear filters"
            onAction={resetFilters}
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {visible.map((event) => (
              <EventPanel
                key={event.id}
                event={event}
                going={interest.includes(event.id)}
                onToggleInterest={toggleInterest}
              />
            ))}
          </div>
        )}
      </section>

      {/* ---- Near you ---- */}
      <section aria-labelledby="event-nearby">
        <SectionHeader
          id="event-nearby"
          title="In person, near you"
          icon={MapPinned}
          subtitle="Physical events you could travel to"
        />

        <div className="grid gap-3 lg:grid-cols-2">
          {inPerson.slice(0, 4).map((event) => (
            <EventPanel
              key={event.id}
              event={event}
              going={interest.includes(event.id)}
              onToggleInterest={toggleInterest}
            />
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-ink-subtle">
          {loading ? (
            <span>Finding your location…</span>
          ) : coordinates ? (
            <span>
              Location found ({coordinates.latitude.toFixed(2)}, {coordinates.longitude.toFixed(2)}).
              Showing every city — pick a fandom to narrow it down.
            </span>
          ) : error === 'unsupported' ? (
            <span>Your browser does not support location sharing.</span>
          ) : (
            <>
              <span>Not sorted by distance yet.</span>
              <button
                type="button"
                onClick={requestLocation}
                className="inline-flex items-center gap-1 font-semibold text-accent underline-offset-2 hover:underline"
              >
                <MapPin size={12} aria-hidden="true" />
                Use my location
              </button>
            </>
          )}
        </div>
      </section>

      <section className="surface-card flex flex-wrap items-center justify-between gap-3 p-5">
        <p className="text-sm text-ink-muted">
          Fan running an event? The Events page is where it would be listed.
        </p>
        <Link
          to="/feedback"
          className="inline-flex items-center gap-2 text-sm font-semibold text-accent transition hover:gap-3"
        >
          Tell us about it <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </section>
    </div>
  )
}
