// Sidebar — left navigation. Fixed and full height so it slides as a drawer:
// pushes content at md and up, overlays below (see useSidebar). Open state is
// owned by RootLayout, since the header's hamburger and the scrim share it.
// NavLink highlights the current row; `end` on Home only, so "/" isn't always active.
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
  FaSun,
  FaTimes,
} from 'react-icons/fa'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import { CATEGORIES } from '../../lib/mockData'

// One entry in a nav group.
type SidebarItem = {
  label: string
  icon: IconType
  path: string
}

// `tone` colours the dot beside each category so the eight stay tellable apart.
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
  // Slug must match the router.
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

// A single nav row. The whole row is the link; the active one gets the accent fill.
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

// Theme switch. Label and icon name the mode you're currently in, so the row
// reads correctly in both themes. `aria-label` stays the control's purpose
// (not the current state) so `role="switch"` + `aria-checked` stay unambiguous.
function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      role="switch"
      aria-checked={isDark}
      aria-label="Dark mode"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggleTheme}
      className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-line bg-surface-sunken px-3 py-2.5 text-ink-muted transition-colors hover:border-accent hover:text-accent"
    >
      <span className="flex items-center gap-3">
        {isDark ? (
          <FaMoon size={18} className="shrink-0" aria-hidden="true" />
        ) : (
          <FaSun size={18} className="shrink-0" aria-hidden="true" />
        )}
        <span className="text-sm font-medium">{isDark ? 'Dark Mode' : 'Light Mode'}</span>
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
  const { isAdmin } = useAuth()

  return (
    <aside
      id="app-sidebar"
      // `-translate-x-full` parks it off screen when closed, on both breakpoints.
      // md: only changes the offset/height, so the panel sits below the 73px header.
      // The panel itself does NOT scroll: the nav below scrolls inside its own
      // box so the theme toggle stays pinned at the bottom, reachable at any
      // scroll position.
      className={`fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 flex-col overflow-hidden border-r border-line bg-surface transition-transform duration-300 ease-out md:top-[73px] md:h-[calc(100dvh-73px)] ${
        isOpen ? 'translate-x-0 shadow-2xl md:shadow-none' : '-translate-x-full'
      }`}
      // `inert` (not just aria-hidden) so a collapsed panel also leaves the
      // tab order — otherwise keyboard users tab into a sidebar they can't see.
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

      {/* Scrolling region. `min-h-0` is required on a flex child that scrolls,
          otherwise it refuses to shrink below its content height. */}
      <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto p-4">
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

          {/* Only shown to administrators. RequireAdmin blocks the route either
              way, but advertising a link a registered user cannot follow is just
              a dead end in the navigation. */}
          {isAdmin && (
            <>
              <GroupLabel>Admin</GroupLabel>
              {adminNav.map((item) => (
                <SidebarLink key={item.label} item={item} />
              ))}
            </>
          )}
        </nav>
      </div>

      {/* Pinned footer. The theme toggle is always visible and always in the
          same place, however far the nav above it has scrolled. */}
      <div className="shrink-0 border-t border-line p-4">
        <ThemeToggle />
      </div>
    </aside>
  )
}
