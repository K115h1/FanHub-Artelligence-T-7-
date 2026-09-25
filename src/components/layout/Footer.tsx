// Footer — site footer containing the SRS-required sitemap section:
// a full text hierarchy of every route, plus category shortcuts and attribution.
// Glass style, purple accents, low roundness — same design language as Home.
import { Link } from 'react-router-dom'

const glassPanel =
  'border-t border-purple-500/20 bg-white/60 backdrop-blur-xl dark:bg-white/[0.04]'

// Sitemap — every route in the app, grouped by area (the SRS sitemap item).
const SITEMAP: { heading: string; links: { to: string; label: string }[] }[] = [
  {
    heading: 'Browse',
    links: [
      { to: '/', label: 'Home' },
      { to: '/explorer', label: 'Explorer' },
      { to: '/characters', label: 'Characters' },
      { to: '/articles', label: 'Articles' },
      { to: '/merchandise', label: 'Merchandise' },
      { to: '/events', label: 'Events' },
    ],
  },
  {
    heading: 'Account',
    links: [
      { to: '/login', label: 'Login' },
      { to: '/register', label: 'Register' },
      { to: '/forgot-password', label: 'Forgot Password' },
      { to: '/dashboard', label: 'Dashboard' },
      { to: '/bookmarks', label: 'Bookmarks' },
      { to: '/profile', label: 'Profile' },
    ],
  },
  {
    heading: 'Community',
    links: [
      { to: '/feedback', label: 'Feedback' },
      { to: '/content/1', label: 'Content Detail' },
      { to: '/characters/1', label: 'Character Detail' },
      { to: '/articles/1', label: 'Article Detail' },
    ],
  },
  {
    heading: 'Admin',
    links: [
      { to: '/admin', label: 'Admin Dashboard' },
      { to: '/admin/content', label: 'Content Manager' },
      { to: '/admin/users', label: 'User Manager' },
      { to: '/admin/feedback', label: 'Feedback Moderator' },
      { to: '/admin/submissions', label: 'Submissions' },
      { to: '/admin/stats', label: 'Statistics' },
    ],
  },
]

// The 8 SRS categories as shortcut chips.
const CATEGORY_SHORTCUTS = [
  'Anime',
  'Gaming',
  'Movies',
  'TV Shows',
  'K-Pop',
  'Comics',
  'Manga',
  'Cosplay',
]

export default function Footer() {
  return (
    <footer className={glassPanel}>
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Sitemap */}
        <nav aria-label="Site map" className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {SITEMAP.map(({ heading, links }) => (
            <div key={heading}>
              <h3 className="mb-3 text-sm font-bold tracking-wide text-black uppercase dark:text-white">
                {heading}
              </h3>
              <ul className="space-y-2">
                {links.map(({ to, label }) => (
                  <li key={to}>
                    <Link
                      to={to}
                      className="text-sm text-black/60 transition hover:text-purple-600 dark:text-white/60 dark:hover:text-purple-400"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Category shortcuts */}
        <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-purple-500/20 pt-6">
          <span className="mr-2 text-xs font-semibold tracking-widest text-black/50 uppercase dark:text-white/50">
            Categories:
          </span>
          {CATEGORY_SHORTCUTS.map((name) => (
            <Link
              key={name}
              to="/explorer"
              className="rounded-md border border-purple-500/30 px-2.5 py-1 text-xs font-medium text-black/70 transition hover:border-purple-500 hover:text-purple-600 dark:text-white/70 dark:hover:text-purple-400"
            >
              {name}
            </Link>
          ))}
        </div>

        {/* Attribution */}
        <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-purple-500/20 pt-6 text-xs text-black/50 sm:flex-row dark:text-white/50">
          <p>
            <span className="font-bold text-black/70 dark:text-white/70">Fan Hub Plus</span> — all
            your fandoms, one home.
          </p>
          <p>© {new Date().getFullYear()} Fan Hub Plus. Built for the Techwiz challenge.</p>
        </div>
      </div>
    </footer>
  )
}
