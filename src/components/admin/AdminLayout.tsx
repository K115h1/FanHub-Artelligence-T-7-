// AdminLayout, the control panel's own shell.
//
// Deliberately NOT the public site chrome. The header, sidebar and footer all
// carry fan-facing navigation that an administrator has no use for while
// moderating, so the panel gets a compact header, its own sub-navigation and a
// constrained reading width. `useOutlet` renders the page below.

import { Link, NavLink, useOutlet } from 'react-router-dom'
import {
  ArrowLeft,
  BarChart3,
  Inbox,
  LayoutDashboard,
  Library,
  LogOut,
  MessageSquare,
  ShoppingBag,
  Users,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useAdminData } from '../../features/admin/AdminDataProvider'
import { useAdminStats } from '../../features/admin/hooks'

const LINKS = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/content', label: 'Content', icon: Library, end: false },
  { to: '/admin/merchandise', label: 'Merchandise', icon: ShoppingBag, end: false },
  { to: '/admin/submissions', label: 'Submissions', icon: Inbox, end: false },
  { to: '/admin/feedback', label: 'Feedback', icon: MessageSquare, end: false },
  { to: '/admin/users', label: 'Users', icon: Users, end: false },
  { to: '/admin/stats', label: 'Statistics', icon: BarChart3, end: false },
] as const

export default function AdminLayout() {
  const outlet = useOutlet()
  const { current, signOut } = useAuth()
  const stats = useAdminStats()
  // Touch the store so the queue badges stay live as statuses change.
  useAdminData()

  // Only the two queues earn a badge, they are the things an admin is meant to
  // clear. Badges on every tile turn the nav into noise.
  const badges: Record<string, number> = {
    '/admin/submissions': stats.pendingSubmissions,
    '/admin/feedback': stats.openFeedback,
  }

  return (
    <div className="min-h-dvh bg-surface-sunken">
      <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
          {/* The brand is a link home. The admin branch is a sibling of the site
              route, so it has no public header to inherit, this is the way
              back. */}
          <Link
            to="/"
            className="group flex min-w-0 items-center gap-2.5 rounded-lg"
            title="Back to FanHub Plus"
          >
            <img
              src="/logo.svg"
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 shrink-0 rounded-lg object-cover"
            />
            <div className="min-w-0 text-left">
              <p className="truncate text-sm font-bold leading-tight text-ink group-hover:text-accent">
                Control Panel
              </p>
              <p className="truncate text-xs leading-tight text-ink-subtle group-hover:text-accent">
                FanHub Plus
              </p>
            </div>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-semibold leading-tight text-ink">{current?.name}</p>
              <p className="text-[11px] leading-tight text-ink-subtle">Administrator</p>
            </div>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted transition hover:border-accent hover:text-accent"
            >
              <ArrowLeft size={13} aria-hidden="true" />
              Back to site
            </Link>
            <button
              type="button"
              onClick={signOut}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted transition hover:border-accent hover:text-accent"
            >
              <LogOut size={13} aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>

        <nav
          aria-label="Control panel sections"
          className="mx-auto max-w-7xl overflow-x-auto px-2 sm:px-5"
        >
          <ul className="flex gap-1 pb-px">
            {LINKS.map(({ to, label, icon: Icon, end }) => {
              const count = badges[to] ?? 0
              return (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      [
                        'flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition',
                        isActive
                          ? 'border-accent text-accent'
                          : 'border-transparent text-ink-muted hover:border-line-strong hover:text-ink',
                      ].join(' ')
                    }
                  >
                    <Icon size={15} aria-hidden="true" />
                    {label}
                    {count > 0 && (
                      <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-ink">
                        {count}
                        <span className="sr-only"> items waiting</span>
                      </span>
                    )}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{outlet}</main>
    </div>
  )
}
