// AuthModal, sign in and sign up as one full-screen overlay. No /login page.
//
// createPortal to body is load-bearing: the header is sticky and the sidebar
// fixed, both inside the page column, so an inline overlay cannot paint over
// them. As a sibling of #root it has no ancestor stacking context to fight.
// useModalLayer covers what paint cannot, scroll lock and an inert app root.
//
// Three views in one dialog so switching forms does not lose the page:
// 'prompt' (a guard stopped you), 'login', 'register'.
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Lock, X } from 'lucide-react'
import { useModalLayer } from '../../hooks/useModalLayer'
import type { AuthMode } from '../../context/AuthModalContext'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'

type View = 'prompt' | AuthMode

export default function AuthModal({
  mode,
  from,
  prompt,
  onClose,
}: {
  /** Which form to show when the dialog opens without a prompt. */
  mode: AuthMode
  /** Path to return to after signing in. Undefined means "stay where you are". */
  from?: string
  /** Open on the "Log in required" notice rather than the form. */
  prompt: boolean
  onClose: () => void
}) {
  const navigate = useNavigate()

  const [view, setView] = useState<View>(prompt ? 'prompt' : mode)

  // On the prompt, Escape is "Not now": it also steps back off the route the
  // guard interrupted.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      if (view === 'prompt') {
        onClose()
        navigate('/')
        return
      }
      onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose, navigate, view])

  useModalLayer(true)

  function onAuthenticated() {
    onClose()
    if (from) navigate(from, { replace: true })
  }

  return createPortal(
    // Backdrop is a real element, not a handler on the panel, so clicking beside
    // the card dismisses and clicking the card does not.
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        onClick={(event) => event.stopPropagation()}
        className="relative w-full max-w-md shadow-2xl"
      >
        {view === 'prompt' ? (
          <PromptCard onLogIn={() => setView('login')} onDismiss={onClose} />
        ) : (
          <>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-md text-black/50 transition hover:bg-purple-500/10 hover:text-purple-600 dark:text-white/50 dark:hover:text-purple-300"
            >
              <X size={18} aria-hidden="true" />
            </button>

            {/* Accessible name for the dialog itself. */}
            <h2 id="auth-modal-title" className="sr-only">
              {view === 'login' ? 'Log in to FanHub Plus' : 'Create your FanHub Plus account'}
            </h2>

            {view === 'login' ? (
              <LoginForm
                onSignedIn={onAuthenticated}
                // Forgot password is a real route, so the dialog must unmount.
                onNavigateAway={onClose}
                onSwitchToRegister={() => setView('register')}
              />
            ) : (
              <RegisterForm
                onRegistered={onAuthenticated}
                onSwitchToLogin={() => setView('login')}
              />
            )}
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}

// The "Log in required" notice. Separate from the shell so it can be styled
// independently of the forms.
function PromptCard({ onLogIn, onDismiss }: { onLogIn: () => void; onDismiss: () => void }) {
  const navigate = useNavigate()
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    confirmRef.current?.focus()
  }, [])

  return (
    <div className="surface-card w-full max-w-sm p-6 text-center shadow-2xl">
      <span className="accent-wash mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full text-white">
        <Lock size={22} aria-hidden="true" />
      </span>

      <h2
        id="auth-modal-title"
        className="mb-2 text-xl font-bold text-ink"
      >
        Log in required
      </h2>
      <p className="mb-6 text-sm leading-relaxed text-ink-muted">
        This page is only available to logged-in members. Log in to continue — or keep
        browsing the public pages.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          ref={confirmRef}
          type="button"
          onClick={onLogIn}
          className="flex-1 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink transition hover:bg-accent-hover"
        >
          Log in
        </button>
        <button
          type="button"
          onClick={() => {
            onDismiss()
            navigate('/')
          }}
          className="flex-1 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-ink-muted transition hover:border-accent hover:text-accent"
        >
          Not now
        </button>
      </div>
    </div>
  )
}
