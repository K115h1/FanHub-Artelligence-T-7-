// Admin gate, role checking for the control panel.
//
// Split into a hook and a component so the whole admin branch can be one lazy
// route: `AdminRoutes` composes AdminGate with AdminDataProvider and the admin
// layout, which keeps the 441KB catalogue JSON in a chunk that only downloads
// when an administrator actually visits /admin.
//
// Layered on top of RequireAuth in the router, so a guest hits the login popup
// first and a signed-in non-admin is turned away here. The `from` handoff means
// an admin who was logged out lands back on /admin after signing in rather than
// on the homepage.
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useAuthModal } from '../context/AuthModalContext'
import { useModalLayer } from '../hooks/useModalLayer'
import type { ReactNode, Ref } from 'react'

export type GateReason = 'signin' | 'forbidden'

export interface AdminGateState {
  allowed: boolean
  reason: GateReason
  /** Where to return after a successful sign-in. */
  from: string
}

/** The check itself, kept separate so it can be tested without rendering. */
export function useAdminGate(pathname: string, search: string): AdminGateState {
  const { isAuthed, isAdmin } = useAuth()
  const from = pathname + search

  if (!isAuthed) return { allowed: false, reason: 'signin', from }
  if (!isAdmin) return { allowed: false, reason: 'forbidden', from }
  return { allowed: true, reason: 'signin', from }
}

/** Renders `children` for an admin, and the reason dialog for anyone else. */
export function AdminGate({
  state,
  children,
}: {
  state: AdminGateState
  children: ReactNode
}) {
  if (state.allowed) return <>{children}</>
  return <AdminGateDialog from={state.from} reason={state.reason} />
}

function AdminGateDialog({ from, reason }: { from: string; reason: GateReason }) {
  const navigate = useNavigate()
  const { open: openAuth } = useAuthModal()
  // Either a link or a button depending on the branch, so the ref is typed as
  // the common base.
  const primaryRef = useRef<HTMLElement>(null)
  const forbidden = reason === 'forbidden'

  useEffect(() => {
    primaryRef.current?.focus()
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') navigate('/')
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [navigate])

  // The app behind stops scrolling and goes inert, the admin layout included.
  useModalLayer(true)

  // Portalled to body so the overlay is a sibling of the app root and always
  // covers the full viewport, whatever the admin layout does with stacking.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-gate-title"
      aria-describedby="admin-gate-body"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div className="surface-card w-full max-w-sm p-6 text-center shadow-2xl">
        <span className="accent-wash mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full text-white">
          <ShieldAlert size={22} aria-hidden="true" />
        </span>

        <h1 id="admin-gate-title" className="mb-2 text-xl font-bold text-ink">
          {forbidden ? 'Administrators only' : 'Log in required'}
        </h1>
        <p id="admin-gate-body" className="mb-6 text-sm leading-relaxed text-ink-muted">
          {forbidden
            ? 'Your account does not have the Administrator role, so the control panel is not available.'
            : 'The control panel is only available to administrators. Log in and you will be brought straight back here.'}
        </p>

        <div className="flex flex-col gap-2 sm:flex-row">
          {forbidden ? (
            <Link
              ref={primaryRef as Ref<HTMLAnchorElement>}
              to="/profile"
              className="flex-1 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink transition hover:bg-accent-hover"
            >
              Go to my profile
            </Link>
          ) : (
            /* Opens the auth overlay in place rather than linking to a sign-in
               page. `from` is carried through, so signing in still lands back on
               /admin, and because RequireAuth is layered above this route, a
               guest normally never reaches this branch: they are already looking
               at the shared prompt. */
            <button
              ref={primaryRef as Ref<HTMLButtonElement>}
              type="button"
              onClick={() => openAuth('login', from, { prompt: true })}
              className="flex-1 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink transition hover:bg-accent-hover"
            >
              Log in
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex-1 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-ink-muted transition hover:border-accent hover:text-accent"
          >
            Back to site
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
