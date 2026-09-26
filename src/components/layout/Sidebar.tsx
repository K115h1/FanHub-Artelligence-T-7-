// Sidebar — FanHub Plus left navigation.
//
// What makes it functional:
//   • NavLink instead of <a href> → clicks navigate inside the app
//     (no full page reload) and the current page's row stays highlighted.
//     `end` is set for Home only, so "/" isn't active on every page.
//   • Dark Mode switch → flips the whole site theme via ThemeProvider.
//   • open state is owned by RootLayout, because the header's hamburger
//     button and the scrim both need to drive the same panel.
//
// Positioning: the panel is `fixed` and full height, so it can slide in and out
// as a drawer. On md and up the content area is given a matching left margin
// so the sidebar PUSHES it; below md the sidebar overlays and a scrim
// dismisses it. See useSidebar for the breakpoint logic.
import { NavLink } from 'react-router-dom'
import type { IconType } from 'react-icons'
import {
  FaHome,
  FaCompass,
  FaUser,
  FaBookmark,
  FaCalendarAlt,
  FaShoppingBag,
  FaCommentDots,
  FaCog,
  FaMoon,
  FaTimes,
} from 'react-icons/fa'
import { useTheme } from '../../context/ThemeContext'
import { CATEGORIES } from '../../lib/mockData'

// One entry in a nav group.
type SidebarItem = {
  label: string
  icon: IconType
  path: string
}

// The category rows are generated from mockData so the sidebar can never
// drift out of sync with CATEGORIES. `tone` is the per-category accent
// applied to the little dot, so eight categories stay tellable apart at a
// glance in a single column.
type CategoryItem = SidebarItem & { tone: string }

const TONE_BY_SLUG: Record<string, string> = {
  anime: 'bg-cat-anime',
  gaming: 'bg-cat-gaming',
  movies: 'bg-cat-movies',
  'tv-shows': 'bg-cat-tv-shows',
  'k-pop': 'bg-cat-k-pop',
  comics: 'bg-cat-comics',
  manga: 'bg-cat-manga',
  cosplay: 'bg-cat-cosplay',
}

const mainNav: SidebarItem[] = [
  { label: 'Home', icon: FaHome, path: '/' },
  { label: 'Explore', icon: FaCompass, path: '/explore' },
]

const categories: CategoryItem[] = CATEGORIES.map((category) => ({
  label: category.name,
  icon: category.icon,
  // Same slug the router expects — the reference demo used `tvshows`/`kpop`
  // here, which would have 404'd against our routes.
  path: `/category/${category.slug}`,
  tone: TONE_BY_SLUG[category.slug] ?? 'bg-accent',
}))

const userNav: SidebarItem[] = [
  { label: 'My Profile', icon: FaUser, path: '/profile' },
  { label: 'Bookmarks', icon: FaBookmark, path: '/bookmarks' },
  { label: 'Events', icon: FaCalendarAlt, path: '/events' },
  { label: 'Merchandise', icon: FaShoppingBag, path: '/merchandise' },
  { label: 'Feedback', icon: FaCommentDots, path: '/feedback' },
]

const adminNav: SidebarItem[] = [{ label: 'Admin Panel', icon: FaCog, path: '/admin' }]

// A single nav row. The WHOLE row is the link, and whichever row matches the
// current page gets the accent fill.
function SidebarLink({
  item,
  big = false,
  className = '',
}: {
  item: SidebarItem
  big?: boolean
  className?: string
}) {
  return (
    <NavLink
      to={item.path}
      // Exact match only for Home, so "/" isn't active on every page.
      end={item.path === '/'}
      className={({ isActive }) =>
        `group mb-1 flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-200 ${
          isActive
            ? 'bg-accent font-semibold text-accent-ink'
            : 'text-ink-muted hover:bg-accent-soft hover:text-accent'
        } ${className}`
      }
    >
      {({ isActive }) => (
        <>
          <item.icon size={big ? 22 : 18} className="shrink-0" />
          <span className={`truncate ${big ? 'text-base' : 'text-sm'}`}>{item.label}</span>
          {/* The category dot — decorative, so it's hidden from screen readers
              because the category name is already the link text. */}
          {'tone' in item && item.tone && (
            <span
              aria-hidden="true"
              className={`ml-auto h-2 w-2 shrink-0 rounded-full ${item.tone} ${
                isActive ? 'opacity-100' : 'opacity-70'
              }`}
            />
          )}
        </>
      )}
    </NavLink>
  )
}

// Small uppercase heading above a group of links.
function GroupLabel({ children }: { children: string }) {
  return (
    <p className="mt-6 mb-2 px-3 text-[11px] font-semibold tracking-wider text-ink-subtle uppercase">
      {children}
    </p>
  )
}

// Dark Mode switch — sits at the bottom of the sidebar, same row style as the
// nav items. Reads + flips the site theme (kept in localStorage).
function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle dark mode"
      onClick={toggleTheme}
      className="mt-auto flex w-full cursor-pointer items-center justify-between rounded-lg border border-line bg-surface-sunken px-3 py-2.5 text-ink-muted transition-colors hover:border-accent hover:text-accent"
    >
      <span className="flex items-center gap-3">
        <FaMoon size={18} className="shrink-0" />
        <span className="text-sm font-medium">Dark Mode</span>
      </span>
      {/* Switch track: slides right + turns purple while dark mode is on. */}
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          isDark ? 'bg-accent' : 'bg-line-strong'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            isDark ? 'translate-x-4' : ''
          }`}
        />
      </span>
    </button>
  )
}

export default function Sidebar({
  isOpen,
  isDesktop,
  onClose,
}: {
  isOpen: boolean
  isDesktop: boolean
  onClose: () => void
}) {
  return (
    <aside
      id="app-sidebar"
      // The aside itself is the fixed drawer, and the open state is honoured on
      // BOTH breakpoints — `-translate-x-full` parks it off screen when closed.
      // The only desktop-specific change is the offset/height, so the panel sits
      // below the 73px header instead of over it.
      className={`fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 flex-col overflow-y-auto border-r border-line bg-surface p-4 scrollbar-hide transition-transform duration-300 ease-out md:top-[73px] md:h-[calc(100dvh-73px)] ${
        isOpen ? 'translate-x-0 shadow-2xl md:shadow-none' : '-translate-x-full'
      }`}
      // When collapsed, take the panel out of the accessibility tree AND out
      // of the tab order. `aria-hidden` alone would still let keyboard users
      // tab into a sidebar they cannot see. React 19 supports `inert` directly.
      inert={!isOpen}
    >
      {/* Close button — only reachable when it's actually a drawer. */}
      {!isDesktop && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition hover:bg-accent-soft hover:text-accent"
        >
          <FaTimes size={16} />
        </button>
      )}

      <nav aria-label="Main navigation" className="flex flex-col">
        {mainNav.map((item) => (
          <SidebarLink key={item.label} item={item} big />
        ))}

        <GroupLabel>Categories</GroupLabel>
        {categories.map((item) => (
          <SidebarLink key={item.label} item={item} />
        ))}

        <GroupLabel>User</GroupLabel>
        {userNav.map((item) => (
          <SidebarLink key={item.label} item={item} />
        ))}

        <GroupLabel>Admin</GroupLabel>
        {adminNav.map((item) => (
          <SidebarLink key={item.label} item={item} />
        ))}
      </nav>

      <ThemeToggle />
    </aside>
  )
}
