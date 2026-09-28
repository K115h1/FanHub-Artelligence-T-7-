// LoginForm — the sign-in card, shared by the /login page and the overlay.
//
// Extracted so the form has exactly one implementation. The page and the modal
// differ only in what happens after a successful sign-in: the page navigates to
// the `from` path, the modal dismisses itself. Keeping that decision in the
// caller is why this component takes a callback instead of a route.
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { LogIn, Mail, Lock, UserPlus, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { DEMO_ACCOUNTS, type DemoAccount } from '../../lib/demoAccounts'
import Avatar from '../common/Avatar'

// Shared by the two inputs, kept in one place so they stay identical.
const inputClass =
  'w-full rounded-md border border-purple-500/30 bg-white/70 px-3 py-2 text-sm text-black transition placeholder:text-black/40 focus:border-purple-500 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-white/40'

export default function LoginForm({
  onSignedIn,
  onNavigateAway,
}: {
  /** Called after credentials are accepted. The caller decides what "after" means. */
  onSignedIn: () => void
  /**
   * Called when a link inside the form starts a navigation, e.g. "Create one".
   * The overlay needs this to dismiss itself — it is mounted above the router,
   * so a route change alone will not unmount it.
   */
  onNavigateAway?: () => void
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

  /**
   * Fills the form and signs in as a seeded account, for the demo.
   *
   * Deliberately not named `useDemoAccount`: it is a plain event handler, not a
   * hook, and the `use` prefix made the rules-of-hooks lint flag the call site
   * inside the onClick callback as a violation.
   */
  async function signInAsDemo(account: DemoAccount) {
    setEmail(account.email)
    setPassword(account.password)
    setError('')
    setBusy(true)
    const ok = await signIn(account.email, account.password)
    setBusy(false)
    if (ok) onSignedIn()
    else setError(lastError ?? 'That demo account could not be signed in.')
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
        <Link
          to="/register"
          onClick={onNavigateAway}
          className="inline-flex items-center gap-1 font-semibold text-purple-600 hover:underline dark:text-purple-400"
        >
          <UserPlus size={14} aria-hidden="true" />
          Create one
        </Link>
        {' · '}
        <Link
          to="/forgot-password"
          onClick={onNavigateAway}
          className="font-semibold text-purple-600 hover:underline dark:text-purple-400"
        >
          Forgot password
        </Link>
      </p>

      {/* One-click access to the two seeded roles, so the control panel can be
          demonstrated without typing credentials. */}
      {DEMO_ACCOUNTS.length > 0 && (
        <div className="mt-6 border-t border-purple-500/20 pt-5">
          <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-black/50 uppercase dark:text-white/50">
            <ShieldCheck size={13} aria-hidden="true" />
            Quick sign-in
          </p>
          <div className="space-y-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => signInAsDemo(account)}
                className="flex w-full items-center gap-3 rounded-md border border-purple-500/20 px-3 py-2.5 text-left transition hover:border-purple-500/60 hover:bg-purple-500/5"
              >
                <Avatar name={account.name} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold text-black dark:text-white">
                      {account.name}
                    </span>
                    <span className="shrink-0 rounded bg-purple-500/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-purple-600 uppercase dark:text-purple-300">
                      {account.role === 'admin' ? 'Admin' : 'Member'}
                    </span>
                  </span>
                  <span className="block truncate text-xs text-black/55 dark:text-white/55">
                    {account.blurb}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
