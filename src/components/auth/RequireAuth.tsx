// RequireAuth — route guard for members-only pages (content detail,
// characters, articles, merchandise, dashboard, admin, …).
//   • not logged in → the protected page NEVER renders; you get a popup
//     pointing at /login that remembers where you were headed
//   • logged in     → the page renders normally through <Outlet/>
//
// BEHAVIOUR CONTRACT — restyle the markup, but keep all of this:
//   1. the early return (the guard replaces the page, it doesn't overlay it)
//   2. `state={{ from }}` on the login link, so Login can return the visitor
//      to the page they originally asked for
//   3. the role/aria wiring, so the popup is announced correctly
import { useEffect, useRef } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function RequireAuth() {
  const { isAuthed } = useAuth()
  const location = useLocation()

  // Deny access: no page content, just the login popup.
  if (!isAuthed) {
    return <LoginRequiredModal from={location.pathname + location.search} />
  }
  return <Outlet />
}

// The popup itself — only ever rendered by the guard above.
function LoginRequiredModal({ from }: { from: string }) {
  const navigate = useNavigate()
  const confirmRef = useRef<HTMLAnchorElement>(null)

  // Move focus to the primary action so keyboard and screen-reader users
  // land inside the dialog instead of continuing to page behind it.
  useEffect(() => {
    confirmRef.current?.focus()
  }, [])

  // Escape dismisses to the homepage — the "Not now" action.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') navigate('/')
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [navigate])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-required-title"
      aria-describedby="login-required-body"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div className="surface-card w-full max-w-sm p-6 text-center shadow-2xl">
        <span className="accent-wash mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full text-white">
          <Lock size={22} aria-hidden="true" />
        </span>

        <h2 id="login-required-title" className="mb-2 text-xl font-bold text-ink">
          Log in required
        </h2>
        <p id="login-required-body" className="mb-6 text-sm leading-relaxed text-ink-muted">
          This page is only available to logged-in members. Log in to continue — or keep
          browsing the public pages.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row">
          {/* `from` is what makes the guard feel considered rather than
              punishing: Login sends you back here afterwards. */}
          <Link
            ref={confirmRef}
            to="/login"
            state={{ from }}
            className="flex-1 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink transition hover:bg-accent-hover"
          >
            Log in
          </Link>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex-1 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-ink-muted transition hover:border-accent hover:text-accent"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}
