// Dashboard — user home base (the profile / events / popular / help content
// that the mockup showed in the right-hand bar, now a full page).
// Glassy style, purple-only accents, low roundness — same language as Home.
import { Link } from 'react-router-dom'
import { Calendar, Flame, Headphones, ArrowRight, User, Bookmark, Star } from 'lucide-react'
import { POPULAR_THIS_WEEK, UPCOMING_EVENTS } from '../lib/mockData'

const glassCard =
  'rounded-lg border border-purple-500/20 bg-white/60 backdrop-blur-xl dark:bg-white/[0.06]'
const purpleGradient = 'bg-gradient-to-br from-purple-600 via-purple-500 to-purple-400'

// Placeholder profile stats — replaced by real auth data in the auth phase.
const PROFILE = {
  name: 'Dammy',
  following: 12,
  followers: 24,
  level: 'Level 3',
}

export default function Dashboard() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile card */}
        <section aria-label="Profile" className={`${glassCard} p-6 lg:col-span-1`}>
          <div className="flex items-center gap-4">
            <span
              className={`flex h-14 w-14 items-center justify-center rounded-md text-white shadow-md shadow-purple-500/30 ${purpleGradient}`}
            >
              <User size={26} />
            </span>
            <div>
              <h1 className="text-lg font-bold text-black dark:text-white">Hi, {PROFILE.name} 👋</h1>
              <p className="text-sm text-black/60 dark:text-white/60">
                Welcome back to FanHub Plus!
              </p>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-3 divide-x divide-purple-500/20 text-center">
            <div className="px-2">
              <dt className="text-xs text-black/50 dark:text-white/50">Following</dt>
              <dd className="text-xl font-bold text-black dark:text-white">{PROFILE.following}</dd>
            </div>
            <div className="px-2">
              <dt className="text-xs text-black/50 dark:text-white/50">Followers</dt>
              <dd className="text-xl font-bold text-black dark:text-white">{PROFILE.followers}</dd>
            </div>
            <div className="px-2">
              <dt className="text-xs text-black/50 dark:text-white/50">Member</dt>
              <dd className="text-xl font-bold text-black dark:text-white">{PROFILE.level}</dd>
            </div>
          </dl>

          {/* Quick links */}
          <nav className="mt-6 flex flex-col gap-2">
            <Link
              to="/bookmarks"
              className="flex items-center justify-between rounded-md border border-purple-500/20 px-3 py-2 text-sm text-black/70 transition hover:border-purple-500/50 hover:text-purple-600 dark:text-white/70 dark:hover:text-purple-400"
            >
              <span className="inline-flex items-center gap-2">
                <Bookmark size={15} /> My Bookmarks
              </span>
              <ArrowRight size={14} />
            </Link>
            <Link
              to="/profile"
              className="flex items-center justify-between rounded-md border border-purple-500/20 px-3 py-2 text-sm text-black/70 transition hover:border-purple-500/50 hover:text-purple-600 dark:text-white/70 dark:hover:text-purple-400"
            >
              <span className="inline-flex items-center gap-2">
                <Star size={15} /> My Ratings
              </span>
              <ArrowRight size={14} />
            </Link>
          </nav>
        </section>

        {/* Right column: events + popular + help */}
        <div className="space-y-6 lg:col-span-2">
          {/* Upcoming events */}
          <section aria-label="Upcoming events" className={`${glassCard} p-6`}>
            <header className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold text-black dark:text-white">
                <Calendar size={18} className="text-purple-500" /> Upcoming Events
              </h2>
              <Link
                to="/events"
                className="text-sm font-medium text-purple-600 transition hover:text-purple-500 dark:text-purple-400"
              >
                View all
              </Link>
            </header>
            <ul className="space-y-3">
              {UPCOMING_EVENTS.map((event) => (
                <li
                  key={event.id}
                  className="flex items-center gap-4 rounded-md border border-purple-500/20 bg-white/50 p-3 transition hover:border-purple-500/40 dark:bg-white/[0.04]"
                >
                  <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-md bg-purple-600/10 text-purple-600 dark:text-purple-400">
                    <span className="text-sm font-bold leading-none">{event.day}</span>
                    <span className="text-[10px] font-semibold uppercase">{event.month}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-black dark:text-white">{event.title}</p>
                    <p className="text-sm text-black/50 dark:text-white/50">{event.location}</p>
                  </div>
                  <span className="shrink-0 rounded-md border border-purple-500/30 px-2 py-0.5 text-xs text-purple-600 dark:text-purple-400">
                    {event.tag}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Popular this week */}
            <section aria-label="Popular this week" className={`${glassCard} p-6`}>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-black dark:text-white">
                <Flame size={18} className="text-purple-500" /> Popular This Week
              </h2>
              <ol className="space-y-3">
                {POPULAR_THIS_WEEK.map((item, i) => (
                  <li key={item.id}>
                    <Link
                      to={`/content/${item.id}`}
                      className="flex items-center gap-3 rounded-md p-1.5 transition hover:bg-purple-500/10"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-purple-600/10 text-xs font-bold text-purple-600 dark:text-purple-400">
                        {i + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-black dark:text-white">
                          {item.title}
                        </span>
                        <span className="block text-xs text-black/50 dark:text-white/50">
                          {item.type} · {item.views}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>

            {/* Need help */}
            <section aria-label="Support" className={`${glassCard} flex flex-col p-6`}>
              <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-black dark:text-white">
                <Headphones size={18} className="text-purple-500" /> Need help?
              </h2>
              <p className="mb-4 text-sm text-black/60 dark:text-white/60">
                Our support team is here 24/7. Chat with us anytime!
              </p>
              <div className={`mt-auto rounded-md p-[1px] ${purpleGradient}`}>
                <button className="flex w-full items-center justify-center gap-2 rounded-md bg-white/90 px-4 py-2.5 text-sm font-semibold text-purple-700 transition hover:bg-white dark:bg-black/80 dark:text-purple-300 dark:hover:bg-black">
                  <Headphones size={16} /> Start Chat
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
