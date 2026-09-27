// RequireAuth — route guard for members-only pages.
//
// Guests never see the protected page; they get a login popup that remembers
// where they were headed. Restyle the markup freely, but keep the early return
// (it replaces the page rather than overlaying it), the `state={{ from }}`
// handoff so Login can return them, and the role/aria wiring.
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useModalLayer } from '../../hooks/useModalLayer'

export default function RequireAuth() {
  const { isAuthed } = useAuth()
  const location = useLocation()

  if (!isAuthed) {
    return <LoginRequiredModal from={location.pathname + location.search} />
  }
  return <Outlet />
}

// The popup — only ever rendered by the guard above.
function LoginRequiredModal({ from }: { from: string }) {
  const navigate = useNavigate()
  const confirmRef = useRef<HTMLAnchorElement>(null)

  // Focus the primary action so keyboard users land in the dialog, not behind it.
  useEffect(() => {
    confirmRef.current?.focus()
  }, [])

  // Escape is the keyboard equivalent of "Not now".
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') navigate('/')
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [navigate])

  // The app behind stops scrolling and goes inert, so the backdrop really is
  // the only live thing on screen.
  useModalLayer(true)

  // Portalled to <body> so the overlay is a sibling of the app root, not a
  // descendant of the page column. That puts it above the sticky header and the
  // fixed sidebar by construction, instead of relying on the page having no
  // ancestor stacking context of its own. `inset-0` is the viewport, so the
  // blurred backdrop reaches every edge — header, sidebar and content alike.
  return createPortal(
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
    </div>,
    document.body,
  )
}
