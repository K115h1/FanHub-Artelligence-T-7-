// Login page — sign in to an account that already exists.
//
// Deliberately different from Register: this asks only for the email and
// password, because the account already has a name on file. Creating an account
// is the Register page's job.
//
// Returns you to the page that asked you to log in, via the `from` location
// state set by the route guards.
import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LogIn, Mail, Lock, UserPlus, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { DEMO_ACCOUNTS, type DemoAccount } from '../lib/demoAccounts'
import Avatar from '../components/common/Avatar'

// Shared by the two inputs, kept in one place so they stay identical.
const inputClass =
  'w-full rounded-md border border-purple-500/30 bg-white/70 px-3 py-2 text-sm text-black transition placeholder:text-black/40 focus:border-purple-500 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-white/40'

export default function Login() {
  const { signIn, accounts, current } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Where to go after signing in — set by a route guard, or '/' by default.
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }
    if (!signIn(email)) {
      setError('No account with that email yet. Create one instead.')
      return
    }
    navigate(from, { replace: true })
  }

  /**
   * Fills the form and signs in as a seeded account, for the demo.
   *
   * Deliberately not named `useDemoAccount`: it is a plain event handler, not a
   * hook, and the `use` prefix made the rules-of-hooks lint flag the call site
   * inside the onClick callback as a violation.
   */
  function signInAsDemo(account: DemoAccount) {
    setEmail(account.email)
    setPassword(account.password)
    setError('')
    signIn(account.email)
    navigate(from, { replace: true })
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10 sm:py-14">
      <div className="rounded-lg border border-purple-500/20 bg-white/60 p-6 shadow-xl backdrop-blur-xl dark:bg-white/[0.06] sm:p-8">
        <span className="accent-wash mb-4 flex h-11 w-11 items-center justify-center rounded-xl text-white">
          <LogIn size={20} aria-hidden="true" />
        </span>

        <h1 className="text-2xl font-bold text-black dark:text-white">Welcome back</h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Sign in to your FanHub Plus account.
        </p>

        {/* Shown when a signed-in user reaches /login to switch accounts. */}
        {current && (
          <div className="mt-4 flex items-center gap-2 rounded-md border border-purple-500/20 bg-purple-500/5 px-3 py-2 text-sm text-black/70 dark:text-white/70">
            <Avatar name={current.name} size="sm" />
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
            className="w-full rounded-md bg-gradient-to-r from-purple-600 to-purple-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-purple-600/30 transition hover:from-purple-500 hover:to-purple-400"
          >
            Log in
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-black/60 dark:text-white/60">
          No account yet?{' '}
          <Link
            to="/register"
            className="inline-flex items-center gap-1 font-semibold text-purple-600 hover:underline dark:text-purple-400"
          >
            <UserPlus size={14} aria-hidden="true" />
            Create one
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
                      <span className="rounded-full bg-purple-500/15 px-1.5 py-0.5 text-[10px] font-bold text-purple-700 capitalize dark:text-purple-300">
                        {account.role}
                      </span>
                    </span>
                    <span className="block truncate text-xs text-black/50 dark:text-white/50">
                      {account.blurb}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            {accounts.length === 0 && (
              <p className="mt-2.5 text-xs text-black/50 dark:text-white/50">
                {DEMO_ACCOUNTS.length} accounts available.
              </p>
            )}
          </div>
        )}

        <p className="mt-4 text-center text-xs">
          <Link
            to="/"
            className="font-medium text-purple-600 hover:underline dark:text-purple-400"
          >
            Back to home
          </Link>
        </p>
      </div>
    </div>
  )
}
