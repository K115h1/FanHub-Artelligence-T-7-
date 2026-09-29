// Home, the public landing page.
//
// Sections, in order: Hero, Categories, Trending, For You, Try Something New,
// Featured, Recent Activity, Upcoming Events, Events Near You, Latest Articles,
// Browse by Fandom. Each is section element (aria-labelledby) pointing at its own
// SectionHeader heading, don't add a second sr-only heading, it double-announces.
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
  placeholders,
  useDiscovery,
  useFeatured,
  useHomeCategories,
  useHomeEvents,
  useTrending,
} from '../features/home/hooks'
import { categoryIcon, sortCategories } from '../lib/categoryIcons'

// ARTICLES is the one remaining mock import: there is no articles table in
// database/01_schema.sql, so the Latest Articles and Recent Activity sections
// need a table before they can move to the API.
import { ARTICLES } from '../lib/mockData'

/** A neutral card-shaped block shown while a section's request is in flight. */
function SkeletonCard() {
  return (
    <div className="surface-card overflow-hidden" aria-hidden="true">
      <div className="h-40 animate-pulse bg-surface-sunken" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-surface-sunken" />
        <div className="h-3 w-full animate-pulse rounded bg-surface-sunken" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-surface-sunken" />
      </div>
    </div>
  )
}

/** Shown in place of a section's content when its request failed. */
function InlineError({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
      {message}
    </p>
  )
}

// ---------- Trending ----------
// Ranked by the API's popularity score, which the Explorer also sorts by, so the
// two agree on what "trending" means.
function Trending() {
  const { items, loading, error } = useTrending()

  return (
    <section aria-labelledby="trending-heading">
      <SectionHeader
        id="trending-heading"
        title="Trending Now"
        icon={TrendingUp}
        viewAllHref="/explorer"
        subtitle="What the community is watching right now"
      />
      {error ? (
        <InlineError message={error} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(loading ? placeholders() : items).map((item, i) =>
            item.id < 0 ? (
              <SkeletonCard key={`skeleton-${i}`} />
            ) : (
              <ContentCard key={item.id} item={item} rank={i + 1} />
            ),
          )}
        </div>
      )}
    </section>
  )
}

// ---------- For You (personalised) ----------
// Signed in → picks for their categories. Signed out → global picks + a prompt.
function ForYou() {
  const { isAuthed } = useAuth()
  const { settings } = useSettings()

  // Personalisation off (privacy setting) falls back to general popular picks.
  const personalised = settings.personalisedRecommendations
  const { items, loading } = useTrending()

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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(loading ? placeholders() : items).map((item, i) =>
          item.id < 0 ? (
            <SkeletonCard key={`skeleton-${i}`} />
          ) : (
            <ContentCard key={item.id} item={item} />
          ),
        )}
      </div>
    </section>
  )
}

// ---------- Try Something New ----------
// The inverse of For You: categories the visitor isn't already drawn to.
function TrySomethingNew() {
  const { current } = useAuth()
  const { items, loading } = useDiscovery(['anime', 'gaming', 'k-pop'])

  return (
    <section aria-labelledby="discover-heading">
      <SectionHeader
        id="discover-heading"
        title="Try Something New"
        icon={Compass}
        viewAllHref="/explore"
        subtitle="A step outside your usual fandoms"
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(loading ? placeholders() : items).map((item, i) =>
          item.id < 0 ? (
            <SkeletonCard key={`skeleton-${i}`} />
          ) : (
            <ContentCard key={item.id} item={item} />
          ),
        )}
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

  // Dropped entirely when personalisation is off, rather than shown misleadingly.
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {recent.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </section>
  )
}

// ---------- Upcoming events ----------
function UpcomingEvents() {
  const { events, loading, error } = useHomeEvents()

  return (
    <section aria-labelledby="events-heading">
      <SectionHeader
        id="events-heading"
        title="Upcoming Events"
        icon={CalendarDays}
        viewAllHref="/events"
        subtitle="Conventions, festivals and fan meetups"
      />

      {error ? (
        <InlineError message={error} />
      ) : loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl border border-line bg-surface-sunken"
            />
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-strong bg-surface-sunken px-4 py-8 text-center text-sm text-ink-subtle">
          No events are scheduled yet. Check back soon.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {events.slice(0, 3).map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </section>
  )
}

// ---------- Events near you ----------
// Geolocation is opt-in: browsers prompt on load, so we ask only on click.
function EventsNearYou() {
  const { coordinates, error, loading, requestLocation } = useGeolocation()
  const { events } = useHomeEvents()

  // Online-only events are not "near you", so they are filtered out. Capped to
  // three because the row is a 3-up grid, not a full listing.
  const nearby = events.filter((event) => !event.isOnline).slice(0, 3)

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
            {coordinates.longitude.toFixed(2)}). Showing events from every city.
          </span>
        ) : error === 'unsupported' ? (
          <span>Your browser does not support location sharing.</span>
        ) : (
          <>
            <span>Events from every city.</span>
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
  const { categories } = useHomeCategories()
  const { items: featured, loading: featuredLoading } = useFeatured()

  return (
    <div className="mx-auto w-full max-w-7xl space-y-10 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <HeroCarousel />

      {/* Categories, the eight fandoms, as square artwork tiles like the
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
          {sortCategories(categories).map((category) => (
            <Link
              key={category.slug}
              to={`/category/${category.slug}`}
              className="group relative block aspect-square overflow-hidden rounded-xl border border-line transition hover:-translate-y-0.5 hover:border-accent hover:shadow-lg hover:shadow-accent/15"
            >
              <CategoryArt
                slug={category.slug}
                name={category.name}
                icon={categoryIcon(category.slug)}
              />
              {/* Screen-reader label: the tile's visible text sits inside the
                  artwork, so give the link an explicit name. */}
              <span className="sr-only">
                {category.name} — {category.description ?? `${category.contentCount} titles`}
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(featuredLoading ? placeholders() : featured).map((item, i) =>
            item.id < 0 ? (
              <SkeletonCard key={`skeleton-${i}`} />
            ) : (
              <ContentCard key={item.id} item={item} />
            ),
          )}
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ARTICLES.slice(0, 4).map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      </section>

      {/* Category quick-links, every one of the eight, so a visitor who
          scrolled past the grid can still reach any fandom. */}
      <section aria-labelledby="browse-heading">
        <SectionHeader id="browse-heading" title="Browse by Fandom" icon={Compass} />
        <div className="flex flex-wrap gap-2">
          {sortCategories(categories).map((category) => (
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
