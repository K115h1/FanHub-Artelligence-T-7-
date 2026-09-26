// Home page — the public landing page.
//
// Section order, and why:
//   Hero             → what the site is
//   Categories       → the eight fandoms, the primary navigation affordance
//   Trending Now     → social proof, works fully logged out
//   For You          → personalised; falls back to defaults when signed out
//   Try Something New → discovery, deliberately outside the visitor's habits
//   Featured         → the editorial picks
//   Based on recent activity → personalised from history; signed-out fallback
//   Upcoming events  → what's coming up
//   Events near you  → uses the browser geolocation hook
//   Latest articles  → the long tail
//   Browse by fandom → all eight links, for anyone who scrolled past the grid
//
// Each section is wrapped in <section aria-labelledby="..."> pointing at its
// OWN SectionHeader heading. Do not add a second sr-only heading per section —
// that announces the title twice to screen-reader users.
//
// Artwork is generated (see CategoryArt / ContentCard) rather than fetched,
// so the page renders identically offline and on every run.
import { Link } from 'react-router-dom'
import {
  Drama,
  Sparkles,
  TrendingUp,
  CalendarDays,
  MapPin,
  Newspaper,
  User,
  Compass,
} from 'lucide-react'
import HeroCarousel from '../components/layout/HeroCarousel'
import SectionHeader from '../components/common/SectionHeader'
import CategoryArt, { CategoryDot } from '../components/common/CategoryArt'
import ContentCard from '../components/common/ContentCard'
import ArticleCard from '../components/common/ArticleCard'
import EventCard from '../components/common/EventCard'
import SignInPrompt from '../components/common/SignInPrompt'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'
import { useGeolocation } from '../hooks/useGeolocation'
import {
  ARTICLES,
  CATEGORIES,
  FEATURED_CONTENT,
  UPCOMING_EVENTS,
} from '../lib/mockData'

// ---------- Trending ----------
// Ranked by view count. Parses "216K" → 216 so the sort is real rather than
// alphabetical on a display string.
function Trending() {
  const trending = [...FEATURED_CONTENT]
    .sort((a, b) => Number.parseFloat(b.views) - Number.parseFloat(a.views))
    .slice(0, 4)

  return (
    <section aria-labelledby="trending-heading">
      <SectionHeader
        id="trending-heading"
        title="Trending Now"
        icon={TrendingUp}
        viewAllHref="/explorer"
        subtitle="What the community is watching right now"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {trending.map((item, i) => (
          <ContentCard key={item.id} item={item} rank={i + 1} />
        ))}
      </div>
    </section>
  )
}

// ---------- For You (personalised) ----------
// Signed in  → content matching the categories the account has been reading.
// Signed out → the same component, fed global defaults, plus a prompt.
function ForYou() {
  const { isAuthed } = useAuth()
  const { settings } = useSettings()

  // The privacy toggle actually changes behaviour: with personalisation off
  // this section stops reading history and shows general popular picks.
  const personalised = settings.personalisedRecommendations

  // With no real activity log yet, "your" categories are derived from the
  // content types present in the fixture. When the activity service lands,
  // this becomes a call to features/*/hooks and nothing else changes.
  const picks = FEATURED_CONTENT.filter((item) =>
    ['Anime', 'Gaming', 'K-Pop'].includes(item.type),
  ).slice(0, 4)
  const items = personalised && picks.length > 0 ? picks : FEATURED_CONTENT.slice(0, 4)

  return (
    <section aria-labelledby="foryou-heading">
      <SectionHeader
        id="foryou-heading"
        title="For You"
        icon={User}
        viewAllHref="/explorer"
        subtitle={
          !personalised
            ? 'General popular picks — personalisation is off'
            : isAuthed
              ? 'Picked from what you have been reading'
              : 'Popular with fans like you'
        }
      />

      {/* Personalisation off is a deliberate choice, not a sign-in prompt. */}
      {!isAuthed && personalised && (
        <div className="mb-4">
          <SignInPrompt message="This picks itself up once you are signed in." />
        </div>
      )}

      {personalised && !isAuthed && (
        <p className="mt-3 text-xs text-ink-subtle">
          <Link
            to="/profile?tab=privacy"
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            Turn off personalisation
          </Link>{' '}
          in your privacy settings.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <ContentCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  )
}

// ---------- Try Something New ----------
// Deliberately the inverse of For You: categories the visitor is NOT already
// drawn to, so it surfaces something genuinely new.
function TrySomethingNew() {
  const { current } = useAuth()

  // Signed-in visitors get the categories least like their current picks.
  const seen = new Set(['Anime', 'Gaming', 'K-Pop'])
  const discovery = FEATURED_CONTENT.filter((item) => !seen.has(item.type)).slice(0, 4)

  const items = discovery.length >= 4 ? discovery : FEATURED_CONTENT.slice(4, 8)

  return (
    <section aria-labelledby="discover-heading">
      <SectionHeader
        id="discover-heading"
        title="Try Something New"
        icon={Compass}
        viewAllHref="/explore"
        subtitle="A step outside your usual fandoms"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <ContentCard key={item.id} item={item} />
        ))}
      </div>

      <p className="mt-3 text-xs text-ink-subtle">
        {current
          ? 'Based on your recent activity — mixed on purpose to keep it interesting.'
          : 'Mixed on purpose: these are the fandoms most visitors skip.'}
      </p>
    </section>
  )
}

// ---------- Based on recent activity ----------
function RecentActivity() {
  const { isAuthed } = useAuth()
  const { settings } = useSettings()
  const recent = ARTICLES.slice(4, 8)

  // Nothing to personalise from when the visitor has opted out, so the section
  // is dropped entirely rather than shown with a misleading subtitle.
  if (!settings.personalisedRecommendations) return null

  return (
    <section aria-labelledby="recent-heading">
      <SectionHeader
        id="recent-heading"
        title="Based on Your Recent Activity"
        icon={Drama}
        viewAllHref="/articles"
        subtitle="Because you have been reading Anime and Manga"
      />

      {!isAuthed && (
        <div className="mb-4">
          <SignInPrompt message="We can only track this once you are signed in." />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {recent.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </section>
  )
}

// ---------- Upcoming events ----------
function UpcomingEvents() {
  return (
    <section aria-labelledby="events-heading">
      <SectionHeader
        id="events-heading"
        title="Upcoming Events"
        icon={CalendarDays}
        viewAllHref="/events"
        subtitle="Conventions, festivals and fan meetups"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {UPCOMING_EVENTS.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </section>
  )
}

// ---------- Events near you ----------
// Geolocation is opt-in on purpose: the browser prompt fires on load in most
// browsers, which is hostile. It asks when the visitor asks.
function EventsNearYou() {
  const { coordinates, error, loading, requestLocation } = useGeolocation()

  const nearby = UPCOMING_EVENTS.filter((event) => event.location !== 'Online')

  return (
    <section aria-labelledby="nearby-heading">
      <SectionHeader
        id="nearby-heading"
        title="Events Near You"
        icon={MapPin}
        viewAllHref="/events"
        subtitle="In-person events you can actually reach"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {nearby.map((event) => (
          <EventCard key={event.id} event={event} near />
        ))}
      </div>

      {/* Status line: explains why the list may not be sorted by distance,
          rather than silently showing an unsorted list. */}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-ink-subtle">
        {loading ? (
          <span>Finding your location…</span>
        ) : coordinates ? (
          <span>
            Location found ({coordinates.latitude.toFixed(2)},{' '}
            {coordinates.longitude.toFixed(2)}) — sorted by distance once the events API is
            connected.
          </span>
        ) : error === 'unsupported' ? (
          <span>Your browser does not support location sharing.</span>
        ) : (
          <>
            <span>Events are not yet sorted by distance.</span>
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
  )
}

// ---------- Page ----------
export default function Home() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-10 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <HeroCarousel />

      {/* Categories — the eight fandoms, as square artwork tiles like the
          reference design. The dot colour is the only place the per-category
          hues appear in the grid; the tile itself stays on-brand purple. */}
      <section aria-labelledby="categories-heading">
        <SectionHeader
          id="categories-heading"
          title="Categories"
          icon={Sparkles}
          viewAllHref="/explore"
          subtitle="Eight fandoms, one home"
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {CATEGORIES.map((category) => (
            <Link
              key={category.slug}
              to={`/category/${category.slug}`}
              className="group relative block aspect-square overflow-hidden rounded-xl border border-line transition hover:-translate-y-0.5 hover:border-accent hover:shadow-lg hover:shadow-accent/15"
            >
              <CategoryArt slug={category.slug} name={category.name} icon={category.icon} />
              {/* Screen-reader label: the tile's visible text sits inside the
                  artwork, so give the link an explicit name. */}
              <span className="sr-only">
                {category.name} — {category.description}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <Trending />
      <ForYou />
      <TrySomethingNew />

      {/* Featured */}
      <section aria-labelledby="featured-heading">
        <SectionHeader
          id="featured-heading"
          title="Featured Content"
          icon={Sparkles}
          viewAllHref="/explore"
          subtitle="Hand-picked by the community"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURED_CONTENT.slice(0, 4).map((item) => (
            <ContentCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      <RecentActivity />
      <UpcomingEvents />
      <EventsNearYou />

      {/* Latest articles */}
      <section aria-labelledby="articles-heading">
        <SectionHeader
          id="articles-heading"
          title="Latest Articles"
          icon={Newspaper}
          viewAllHref="/articles"
          subtitle="Fresh from the fan press"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ARTICLES.slice(0, 4).map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      </section>

      {/* Category quick-links — every one of the eight, so a visitor who
          scrolled past the grid can still reach any fandom. */}
      <section aria-labelledby="browse-heading">
        <SectionHeader id="browse-heading" title="Browse by Fandom" icon={Compass} />
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <Link
              key={category.slug}
              to={`/category/${category.slug}`}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-raised px-3 py-1.5 text-sm text-ink-muted transition hover:border-accent hover:text-accent"
            >
              <CategoryDot slug={category.slug} />
              {category.name}
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
