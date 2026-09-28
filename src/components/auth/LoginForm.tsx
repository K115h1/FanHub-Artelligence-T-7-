// LoginForm — the sign-in card, shared by the /login page and the overlay.
//
// Extracted so the form has exactly one implementation. The page and the modal
// differ only in what happens after a successful sign-in: the page navigates to
// the `from` path, the modal dismisses itself. Keeping that decision in the
// caller is why this component takes a callback instead of a route.
//
// The one-click "Quick sign-in" buttons are gone. They called signIn() with a
// password held in lib/demoAccounts.ts, so signing in as an administrator never
// involved knowing a password. What is left is a printed list of the two demo
// accounts, which is a demonstration convenience and not a way in.
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { LogIn, Mail, Lock, UserPlus } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import Avatar from '../common/Avatar'

// Shared by the two inputs, kept in one place so they stay identical.
const inputClass =
  'w-full rounded-md border border-purple-500/30 bg-white/70 px-3 py-2 text-sm text-black transition placeholder:text-black/40 focus:border-purple-500 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-white/40'

export default function LoginForm({
  onSignedIn,
  onNavigateAway,
  onSwitchToRegister,
}: {
  /** Called after credentials are accepted. The caller decides what "after" means. */
  onSignedIn: () => void
  /**
   * Called when a link inside the form starts a navigation, e.g. "Forgot
   * password". The overlay needs this to dismiss itself — it is mounted above
   * the router, so a route change alone will not unmount it.
   */
  onNavigateAway?: () => void
  /**
   * Shows the sign-up form in place of this one. Supplied by the auth overlay,
   * which holds both forms and swaps between them; the Register page leaves it
   * undefined so "Create one" stays a real link to a real route.
   */
  onSwitchToRegister?: () => void
}) {
  const { signIn, current, lastError } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }
    setBusy(true)
    signIn(email, password)
      .then((ok) => {
        if (ok) {
          setError('')
          onSignedIn()
        } else {
          // The provider has already recorded why; surface it here rather than
          // a generic failure.
          setError(lastError ?? 'That email and password did not match.')
        }
      })
      .catch(() => setError('Something went wrong signing in. Please try again.'))
      .finally(() => setBusy(false))
  }

  return (
    <div className="rounded-lg border border-purple-500/20 bg-white/60 p-6 shadow-xl backdrop-blur-xl dark:bg-white/[0.06] sm:p-8">
      <span className="accent-wash mb-4 flex h-11 w-11 items-center justify-center rounded-xl text-white">
        <LogIn size={20} aria-hidden="true" />
      </span>

      <h1 className="text-2xl font-bold text-black dark:text-white">Welcome back</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Sign in to your FanHub Plus account.
      </p>

      {/* Shown when a signed-in user reaches the form to switch accounts. */}
      {current && (
        <div className="mt-4 flex items-center gap-2 rounded-md border border-purple-500/20 bg-purple-500/5 px-3 py-2 text-sm text-black/70 dark:text-white/70">
          {/* Whichever account is active, so switching accounts from here shows
              the right picture rather than the previous one's. */}
          <Avatar name={current.name} src={current.avatarPath} size="sm" />
          <span>
            Signed in as <strong className="font-semibold">{current.name}</strong>. Use the
            form below to switch.
          </span>
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-black/70 dark:text-white/70">
            Email
          </span>
          <span className="relative block">
            <Mail
              size={15}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black/35 dark:text-white/35"
            />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              // Both surfaces want this: on the page it saves a click, and in the
              // overlay it puts the caret inside the dialog on the first
              // keystroke instead of leaving it on the page behind.
              autoFocus
              className={`${inputClass} pl-9`}
            />
          </span>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-black/70 dark:text-white/70">
            Password
          </span>
          <span className="relative block">
            <Lock
              size={15}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black/35 dark:text-white/35"
            />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className={`${inputClass} pl-9`}
            />
          </span>
        </label>

        {error && (
          <p
            role="alert"
            className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-600 dark:text-rose-400"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-gradient-to-r from-purple-600 to-purple-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-purple-600/30 transition hover:from-purple-500 hover:to-purple-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? 'Signing in…' : 'Log in'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-black/60 dark:text-white/60">
        No account yet?{' '}
        {onSwitchToRegister ? (
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="inline-flex items-center gap-1 font-semibold text-purple-600 hover:underline dark:text-purple-400"
          >
            <UserPlus size={14} aria-hidden="true" />
            Create one
          </button>
        ) : (
          <Link
            to="/register"
            onClick={onNavigateAway}
            className="inline-flex items-center gap-1 font-semibold text-purple-600 hover:underline dark:text-purple-400"
          >
            <UserPlus size={14} aria-hidden="true" />
            Create one
          </Link>
        )}
        {' · '}
        <Link
          to="/forgot-password"
          onClick={onNavigateAway}
          className="font-semibold text-purple-600 hover:underline dark:text-purple-400"
        >
          Forgot password
        </Link>
      </p>

      {/* Credentials, shown rather than signed in with. The previous version of
          this was a pair of one-click "Quick sign-in" buttons: a click filled
          the form and called signIn() with a hardcoded password, so reaching the
          control panel never required knowing a password at all — and the
          buttons re-sent those credentials over the network on every click. The
          accounts are listed instead, so a demonstration can read the details
          off the page and type them, and the sign-in path is the same one every
          other visitor uses.

          These are demo credentials checked against the Argon2id hashes in
          database/05_reference_data.sql. Ada is the only administrator. */}
      <div className="mt-6 rounded-md border border-purple-500/20 bg-purple-500/5 px-3.5 py-3">
        <p className="text-xs font-semibold tracking-wide text-black/55 uppercase dark:text-white/55">
          Demo accounts
        </p>
        <dl className="mt-2 space-y-1.5 text-xs text-black/70 dark:text-white/70">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <dt className="font-semibold text-black dark:text-white">Admin</dt>
            <dd className="font-mono">admin@fanhubplus.com</dd>
            <dd className="text-black/50 dark:text-white/50">/ admin</dd>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-2">
            <dt className="font-semibold text-black dark:text-white">Member</dt>
            <dd className="font-mono">user@fanhubplus.test</dd>
            <dd className="text-black/50 dark:text-white/50">/ user123</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
