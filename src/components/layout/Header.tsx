// Header — full-width sticky top bar.
//
// Transparent at the top of the page; past 50px it becomes a frosted-glass bar.
// Scroll position is tracked with GSAP ScrollTrigger.
import { useState } from 'react'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { Menu } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { useAuth } from '../../context/AuthContext'
import { useLoginModal } from '../../context/LoginModalContext'
import AccountMenu from '../auth/AccountMenu'
import { SearchBar } from '../common/SearchBar'
import { FontSizeControl } from '../common/FontSizeControl'

gsap.registerPlugin(ScrollTrigger, useGSAP)

export default function Header({
  onToggleSidebar,
  sidebarOpen,
}: {
  onToggleSidebar: () => void
  sidebarOpen: boolean
}) {
  // Past 50px scrolled — switches the frosted-glass background on.
  const [scrolled, setScrolled] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  // On /explore the URL holds the query, so the header's search bar both reads
  // it and writes it — that's what keeps one bar able to edit the results.
  const isExplore = location.pathname === '/explore'
  const activeQuery = isExplore ? (searchParams.get('q') ?? '') : ''

  function handleLiveSearch(nextQuery: string) {
    if (!isExplore) return
    // Merge rather than replace: /explore?category=anime&sort=title has to keep
    // its category and sort when the visitor types in the search box. Passing a
    // bare object to setSearchParams discards every other param, which silently
    // dropped the category deep-link on the first keystroke.
    const next = new URLSearchParams(searchParams)
    if (nextQuery) next.set('q', nextQuery)
    else next.delete('q')
    // A new search invalidates the old page number.
    next.delete('page')
    setSearchParams(next, { replace: true })
  }

  function handleSearchSubmit(trimmedQuery: string) {
    // An empty search has nothing to filter by, so just go to the index.
    navigate(trimmedQuery ? `/explore?q=${encodeURIComponent(trimmedQuery)}` : '/explore')
  }

  // The signed-in account (null → guests still see the Login button).
  const { current } = useAuth()

  // Opens the sign-in overlay over the current page.
  const { open: openLogin } = useLoginModal()

  // onRefresh keeps `scrolled` correct on load/resize; useGSAP handles cleanup.
  useGSAP(() => {
    const syncGlass = (self: ScrollTrigger) => setScrolled(self.scroll() > 50)

    ScrollTrigger.create({
      start: 0,
      end: 999999, // stay active on short pages whose height changes later
      onUpdate: syncGlass,
      onRefresh: syncGlass,
    })
  })

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b transition-all duration-300 ${
        scrolled ? 'glass-panel border-line shadow-lg shadow-black/5' : 'border-transparent bg-transparent'
      }`}
    >
      {/* Max-width row so the header doesn't stretch on wide monitors. */}
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        {/* Hamburger — drives the sidebar. */}
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation"
          // Must stay wired to real state or screen readers can't announce it.
          aria-expanded={sidebarOpen}
          aria-controls="app-sidebar"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink-muted transition hover:bg-accent-soft hover:text-accent"
        >
          <Menu size={20} />
        </button>

        {/* Logo */}
        <Link
          to="/"
          className="shrink-0 text-lg font-bold tracking-tight text-ink sm:text-xl"
        >
          FanHub <span className="text-accent">Plus</span>
        </Link>

        {/* Right-hand controls — min-w-0 lets the search box SHRINK on
            mid-size screens instead of pushing the header sideways. */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {/* Search — the shared SearchBar in its header variant, so the debounce
              and clear button exist once instead of twice. `onSubmit` means it
              submits on Enter instead of navigating per keystroke. */}
          <div className="flex min-w-0 flex-1 sm:w-64 lg:w-96">
            <SearchBar
              variant="header"
              placeholder="Search…"
              value={activeQuery}
              onSearch={isExplore ? handleLiveSearch : undefined}
              onSubmit={handleSearchSubmit}
            />
          </div>

          {/* Text size — hidden on the narrowest screens, where the header
              only has room for the logo, search and account button. */}
          <FontSizeControl className="hidden sm:flex" />

          {/* Guests get Login; signed-in users get the account menu
              (avatar + username + chevron → accounts on device).

              Login is a button, not a link, because it opens the sign-in overlay
              rather than navigating. The overlay covers the whole viewport — the
              header and sidebar included — so a guest never loses their place
              on the page they were reading. /login still exists as a route for
              direct links and for signing in without the header. */}
          {current ? (
            <AccountMenu />
          ) : (
            <button
              type="button"
              onClick={() => openLogin()}
              className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-ink shadow-md shadow-accent/25 transition hover:bg-accent-hover sm:text-base"
            >
              Login
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
