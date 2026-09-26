// Header — full-width sticky top bar for FanHub Plus.
//
// "Casual premium" glass style:
//   • transparent while you're at the very top of the page
//   • fades into a translucent, blurred (frosted-glass) bar once you scroll
//   • white glass in light mode / black glass in dark mode, purple accents
//
// The scroll detection is done with GSAP ScrollTrigger (already in package.json).
import { useState } from 'react'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { Menu } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { useAuth } from '../../context/AuthContext'
import AccountMenu from '../auth/AccountMenu'
import { SearchBar } from '../common/SearchBar'

// Register the GSAP plugins once, before we use them.
gsap.registerPlugin(ScrollTrigger, useGSAP)

export default function Header({
  onToggleSidebar,
  sidebarOpen,
}: {
  onToggleSidebar: () => void
  sidebarOpen: boolean
}) {
  // True once the page has been scrolled past 50px.
  // This single flag turns the frosted-glass background on/off below.
  const [scrolled, setScrolled] = useState(false)

  // Search navigation. The query itself now lives inside SearchBar; we only
  // need to send it to the Explorer page as a ?q= search param on submit.
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  // On /explore the URL IS the query, so the field both reads from it and
  // writes to it as the user types — that is what keeps a single search bar on
  // the page showing (and able to edit) the active results.
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

  // ScrollTrigger watches the scrollbar for us and reports the scroll
  // position on every update + refresh, so `scrolled` always matches
  // reality — even if the page loads halfway down or its height changes.
  // useGSAP automatically kills the trigger when the component unmounts,
  // so there's no manual cleanup to worry about.
  useGSAP(() => {
    // Helper: the glass only belongs on when we're past 50px.
    const syncGlass = (self: ScrollTrigger) => setScrolled(self.scroll() > 50)

    ScrollTrigger.create({
      start: 0, // watch the page from the very top...
      end: 999999, // ...far past the bottom, so it stays active on ANY page,
      // even a short one whose height changes later (lazy content, etc.)
      onUpdate: syncGlass, // fires on every scroll → turn glass on/off
      onRefresh: syncGlass, // fires on load/resize → correct initial state
    })
  })

  return (
    <header
      // The header itself spans the full width of the screen.
      // When `scrolled` flips on, it grows a translucent color + backdrop blur.
      className={`sticky top-0 z-50 w-full border-b transition-all duration-300 ${
        scrolled ? 'glass-panel border-line shadow-lg shadow-black/5' : 'border-transparent bg-transparent'
      }`}
    >
      {/* Inner row: content stays centered in a max-width container so the
          layout never looks stretched on wide monitors. */}
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        {/* Hamburger — drives the sidebar. Sits left of the logo so the
            toggle target is in the same spot the reference design used. */}
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation"
          // Real state, not `undefined` — screen readers announce the button as
          // expanded/collapsed, and it doubles as a check that the wiring works.
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
