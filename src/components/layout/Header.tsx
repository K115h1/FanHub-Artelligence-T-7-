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
import AccountMenu from '../auth/AccountMenu'
import { SearchBar } from '../common/SearchBar'

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
    setSearchParams(nextQuery ? { q: nextQuery } : {}, { replace: true })
  }

  function handleSearchSubmit(trimmedQuery: string) {
    // An empty search has nothing to filter by, so just go to the index.
    navigate(trimmedQuery ? `/explore?q=${encodeURIComponent(trimmedQuery)}` : '/explore')
  }

  // The signed-in account (null → guests still see the Login button).
  const { current } = useAuth()

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

          {/* Font-size control (wired up in a later phase) */}
          <div className="hidden shrink-0 items-center gap-1 rounded-full border border-line px-2 py-1.5 text-ink-muted transition hover:border-accent sm:flex">
            <span className="px-1 text-xs">A-</span>
            <span className="h-5 w-px bg-line" />
            <span className="px-1 text-base font-medium">A+</span>
          </div>

          {/* Guests get Login; signed-in users get the account menu
              (avatar + username + chevron → accounts on device). */}
          {current ? (
            <AccountMenu />
          ) : (
            <Link
              to="/login"
              className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-ink shadow-md shadow-accent/25 transition hover:bg-accent-hover sm:text-base"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
