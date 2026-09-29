// NotFound, the catch-all route (path: '*').
//
// A 404 is only useful if it gets the visitor moving again, so this page is
// ordered by how likely each action is to be the one they wanted:
//
//   1. Back to the previous page. Usually right, because the commonest way to
//      land here is following a link inside the site and having it be stale.
//      BackButton owns the "is there history?" question, and it degrades to the
//      homepage when the page was opened directly by pasting the URL.
//   2. Home and Explore as explicit second guesses.
//   3. The full sitemap, grouped like the sidebar, so anything else in the site
//      is one click away rather than a hunt through the nav.
//
// The category group is generated from CATEGORIES rather than retyped, so it
// cannot drift from the sidebar or from the /category/:slug routes. The other
// groups are hand-written, because the router is the only place that maps those
// labels to paths and a second copy of that list would be free to rot.
//
// Member-only routes are listed even when signed out. They are not dead links:
// RequireAuth catches them and opens the sign-in overlay over this page, so
// following one still ends somewhere useful. This matches the sidebar, which
// lists the same rows for everyone.
import { Link, useLocation } from 'react-router-dom'
import {
  Home,
  Compass,
  Users,
  Newspaper,
  CalendarDays,
  ShoppingBag,
  LayoutDashboard,
  User,
  Bookmark,
  MessageSquare,
  ShieldCheck,
  UserPlus,
  Ghost,
  ArrowRight,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import PageHero from '../components/common/PageHero'
import BackButton from '../components/common/BackButton'
import SectionHeader from '../components/common/SectionHeader'
import { useAuth } from '../context/AuthContext'
import { useAuthModal } from '../context/AuthModalContext'
import { CATEGORIES } from '../lib/mockData'

interface SitemapLink {
  label: string
  to: string
  icon: LucideIcon
  /** One line on what is behind the link, so the grid is scannable. */
  blurb: string
}

interface SitemapGroup {
  title: string
  links: SitemapLink[]
}

const BROWSE_LINKS: SitemapLink[] = [
  { label: 'Home', to: '/', icon: Home, blurb: 'The front page, with everything trending.' },
  { label: 'Explore', to: '/explore', icon: Compass, blurb: 'Search and filter the whole catalogue.' },
  { label: 'Characters', to: '/characters', icon: Users, blurb: 'Every character, filterable by fandom.' },
  { label: 'Articles', to: '/articles', icon: Newspaper, blurb: 'Features, guides and opinion pieces.' },
  { label: 'Events', to: '/events', icon: CalendarDays, blurb: 'Conventions, screenings and signings.' },
  { label: 'Merchandise', to: '/merchandise', icon: ShoppingBag, blurb: 'Collectables and figures on sale.' },
]

const ACCOUNT_LINKS: SitemapLink[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, blurb: 'Your activity, and share something new.' },
  { label: 'My Profile', to: '/profile', icon: User, blurb: 'Your details, interests and privacy.' },
  { label: 'Bookmarks', to: '/bookmarks', icon: Bookmark, blurb: 'Everything you have saved.' },
]

// Public, so they are listed for everyone. Register is a real route even though
// the header normally opens the overlay, so an old deep link still lands.
const SITE_LINKS: SitemapLink[] = [
  { label: 'Feedback', to: '/feedback', icon: MessageSquare, blurb: 'Report a bug or suggest something.' },
  { label: 'Privacy Policy', to: '/privacy', icon: ShieldCheck, blurb: 'What is stored, and where.' },
  { label: 'Create an account', to: '/register', icon: UserPlus, blurb: 'Save favourites and join in.' },
]

// ---------- Small presentational pieces ----------

function SitemapCard({ link }: { link: SitemapLink }) {
  const Icon = link.icon

  return (
    <Link
      to={link.to}
      className="group surface-card flex items-start gap-3 p-4"
    >
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent transition group-hover:bg-accent group-hover:text-accent-ink">
        <Icon size={17} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1 text-sm font-semibold text-ink">
          {link.label}
          <ArrowRight
            size={13}
            aria-hidden="true"
            className="shrink-0 text-ink-subtle transition group-hover:translate-x-0.5 group-hover:text-accent"
          />
        </span>
        <span className="mt-0.5 block text-xs text-ink-muted">{link.blurb}</span>
      </span>
    </Link>
  )
}

function SitemapGroupCard({ group }: { group: SitemapGroup }) {
  return (
    <section className="surface-card p-5">
      <h3 className="text-xs font-semibold tracking-wider text-ink-subtle uppercase">
        {group.title}
      </h3>
      {/* Two columns at sm so a group reads as a block rather than a long list. */}
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {group.links.map((link) => (
          <li key={link.to}>
            <SitemapCard link={link} />
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function NotFound() {
  const location = useLocation()
  const { isAuthed, isAdmin } = useAuth()
  const { open: openAuth } = useAuthModal()

  // Shown back to the visitor. Reading it out is the first thing anyone
  // debugging a stale link wants, and it makes a typo in the URL obvious
  // instead of leaving them to guess which part of it was wrong.
  //
  // The decode is wrapped because it throws on a malformed escape, and a
  // hand-typed or half-mangled URL is exactly the kind that lands here. A 404
  // that itself throws is the worst possible outcome, so the raw string is
  // shown instead.
  const raw = location.pathname + location.search
  let attempted = raw
  try {
    attempted = decodeURI(raw)
  } catch {
    // Leave `attempted` as the raw path.
  }

  // Categories come from the shared list, so this grid is the same eight the
  // sidebar shows and the same eight /category/:slug routes serve.
  const categoryLinks: SitemapLink[] = CATEGORIES.map((category) => ({
    label: category.name,
    to: `/category/${category.slug}`,
    icon: category.icon,
    blurb: category.description,
  }))

  const groups: SitemapGroup[] = [
    { title: 'Browse', links: BROWSE_LINKS },
    { title: 'Categories', links: categoryLinks },
    { title: 'Your account', links: ACCOUNT_LINKS },
    { title: 'This site', links: SITE_LINKS },
  ]

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHero
        kicker="Error 404"
        title="This page isn't here"
        icon={Ghost}
        blurb="The link may be out of date, or the address may have a typo in it. Nothing is lost — everything on the site is a click away below."
      >
        {/* The address that failed, so the visitor can see what was actually
            requested rather than guessing at it. */}
        <span className="inline-flex max-w-full items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 font-mono text-sm text-white backdrop-blur-md">
          <span className="truncate">{attempted}</span>
        </span>
      </PageHero>

      {/* 1. Back to the previous page. The primary action, because a stale
          in-site link is the likeliest reason anyone is here. BackButton falls
          back to the homepage when there is no history to return to, so this
          button is never a dead control. */}
      <section className="surface-card flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">Where were you before this?</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Going back returns you to the page you came from. If you opened this
            link directly, it takes you home instead.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <BackButton variant="primary" fallbackTo="/" label="Back" fallbackLabel="Go to homepage" />
          <Link
            to="/explore"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-line px-5 py-2.5 text-sm font-semibold text-ink-muted transition hover:border-accent hover:text-accent"
          >
            <Compass size={15} aria-hidden="true" />
            Explore instead
          </Link>
        </div>
      </section>

      {/* A short sentence rather than a sign-in prompt: the route table puts
          most of the site behind RequireAuth, and this page is public, so
          someone arriving here may well be signed out. Offering the overlay
          keeps the same no-dead-end rule as the rest of the app. */}
      {!isAuthed && (
        <p className="text-sm text-ink-muted">
          Some pages need an account.{' '}
          <button
            type="button"
            onClick={() => openAuth('login')}
            className="font-semibold text-accent underline-offset-2 hover:underline"
          >
            Sign in
          </button>{' '}
          to open your dashboard, bookmarks and profile.
        </p>
      )}

      {/* 2. Everything else, grouped like the sidebar. */}
      <section className="space-y-5">
        <SectionHeader
          title="Anywhere else on the site"
          icon={Compass}
          subtitle="Every top-level page, grouped the same way the sidebar groups them."
        />

        <div className="grid gap-4 lg:grid-cols-2">
          {groups.map((group) => (
            <SitemapGroupCard key={group.title} group={group} />
          ))}

          {/* Admin last, and only for administrators, matching the sidebar.
              RequireAdmin would block it either way, but offering a link a
              signed-in member cannot follow is just a second dead end. */}
          {isAdmin && (
            <SitemapGroupCard
              group={{
                title: 'Admin',
                links: [
                  {
                    label: 'Admin Panel',
                    to: '/admin',
                    icon: ShieldCheck,
                    blurb: 'Content, users, feedback and statistics.',
                  },
                ],
              }}
            />
          )}
        </div>
      </section>
    </div>
  )
}
