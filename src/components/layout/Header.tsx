// Header — full-width sticky top bar.
//
// Transparent at the top of the page; past 50px it becomes a frosted-glass bar.
// Scroll position is tracked with GSAP ScrollTrigger.
import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { Menu, Search } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { useAuth } from '../../context/AuthContext'
import { useAuthModal } from '../../context/AuthModalContext'
import AccountMenu from '../auth/AccountMenu'
import { SearchBar } from '../common/SearchBar'
import SearchOverlay from '../common/SearchOverlay'
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

  // Opens the auth overlay over the current page. There is no /login route any
  // more, so both of these are buttons rather than links — they open a dialog,
  // they do not navigate.
  const { open: openAuth, isOpen: isAuthOpen } = useAuthModal()

  // ---- search, below md ----
  //
  // The field is `hidden md:flex` and the icon is its mirror at `md:hidden`.
  // Below 768px this row already carries the hamburger, the logo and both auth
  // buttons, and the field was the one item that could not compress without
  // becoming a two-character slot. 768px is where the field plus everything
  // else fits again.
  const [searchOpen, setSearchOpen] = useState(false)

  // Cmd/Ctrl+K, the shortcut every command palette and site search uses. Bound
  // here rather than inside the overlay so it works while the overlay is
  // CLOSED — which is the only point at which it is useful as an accelerator.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'k' && event.key !== 'K') return
      if (!event.metaKey && !event.ctrlKey) return

      // Refuse to open on top of the auth dialog. Two overlays at once is not
      // merely untidy: each one calls useModalLayer, so they would each save and
      // restore body overflow and each toggle #root's inert flag, and whichever
      // cleaned up first would undo the other's lock — leaving the page
      // scrollable and half-interactive behind a dialog.
      if (isAuthOpen || searchOpen) return

      event.preventDefault()
      setSearchOpen(true)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isAuthOpen, searchOpen])

  // Body scroll is deliberately NOT locked here. SearchOverlay calls
  // useModalLayer, which locks it and saves the previous value — locking it a
  // second time from here means the two cleanups race and the page can be left
  // unscrollable after the overlay closes.

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
      {/* Full-bleed row, not a centred max-w-7xl one.
          The sidebar is fixed at left-0, so the hamburger has to sit at x=0 to
          line up with it; a centred container would inset the button and break
          that alignment on any screen wider than the container. The logo
          follows immediately, and the right-hand controls are pushed out with
          ml-auto rather than by justify-between — with three children
          justify-between puts the SECOND one in the middle, which is why the
          logo was floating a third of the way across the header. */}
      <div className="flex w-full items-center gap-2 py-3 pr-4 sm:py-4 sm:pr-6 lg:pr-8">
        {/* Hamburger — drives the sidebar. Flush left, on top of it. */}
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

        {/* Logo — text-base on the narrowest screens, stepping up at `sm`. The
            wordmark was the second-largest thing in a bar that had no room for
            it once the search field collapsed. */}
        <Link
          to="/"
          className="shrink-0 text-base font-bold tracking-tight text-ink sm:text-lg"
        >
          FanHub <span className="text-accent">Plus</span>
        </Link>

        {/* Right-hand controls — ml-auto holds them at the far right, and
            min-w-0 lets the search box SHRINK on mid-size screens instead of
            pushing the header sideways. */}
        <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2 md:gap-3">
          {/* Search — the shared SearchBar in its header variant, so the debounce
              and clear button exist once instead of twice. `onSubmit` means it
              submits on Enter instead of navigating per keystroke.

              `hidden md:flex`, with the icon below as its mirror. At phone widths
              this row already holds the hamburger, the logo and both auth
              buttons, and the field was the one item that could not compress
              without becoming a two-character slot. 768px is where the field plus
              everything else fits again. */}
          <div className="hidden min-w-0 flex-1 md:flex md:w-64 lg:w-96">
            <SearchBar
              variant="header"
              placeholder="Search…"
              value={activeQuery}
              onSearch={isExplore ? handleLiveSearch : undefined}
              onSubmit={handleSearchSubmit}
            />
          </div>

          {/* Search icon — the small-screen entry point. aria-expanded and
              aria-haspopup are wired to real state so the overlay is announced
              when it opens, the same as the hamburger does for the drawer. */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
            aria-expanded={searchOpen}
            aria-haspopup="dialog"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-muted transition hover:bg-accent-soft hover:text-accent md:hidden"
          >
            <Search size={18} />
          </button>

          {/* Text size — hidden on the narrowest screens, where the header
              only has room for the logo, search and account button. */}
          <FontSizeControl className="hidden sm:flex" />

          {/* Guests get Log in and Sign up; signed-in users get the account menu
              (avatar + username + chevron → accounts on device).

              Both are buttons, not links, because they open the auth overlay
              rather than navigating. The overlay covers the whole viewport — the
              header and sidebar included — so a guest never loses their place on
              the page they were reading. Sign up sits first: a visitor without an
              account cannot do anything a signed-in one can, so the action that
              unblocks them is the one that reads as primary. */}
          {current ? (
            <AccountMenu />
          ) : (
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => openAuth('register')}
                className="rounded-lg bg-accent px-2.5 py-1.5 text-xs font-semibold text-accent-ink shadow-md shadow-accent/25 transition hover:bg-accent-hover sm:px-4 sm:py-2 sm:text-sm"
              >
                Sign up
              </button>
              <button
                type="button"
                onClick={() => openAuth('login')}
                className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-ink-muted transition hover:border-accent hover:text-accent sm:px-4 sm:py-2 sm:text-sm"
              >
                Log in
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mounted here in the React tree but rendered into <body> by a portal
          inside SearchOverlay, and that split is the whole point: useModalLayer
          marks #root inert, and the header lives inside #root. The portal puts
          the panel's DOM beside #root as a sibling, where the inert attribute
          does not reach it — rendered inline it would be inside the subtree it
          had just disabled, so the input could not be focused and every click
          would be swallowed. Cmd+K opens it from any page, and it pre-fills with
          the query already in the URL when that page is /explore. */}
      {searchOpen && (
        <SearchOverlay
          onClose={() => setSearchOpen(false)}
          initialQuery={activeQuery}
        />
      )}
    </header>
  )
}
