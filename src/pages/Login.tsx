// Login page — mock sign-in for Fan Hub Plus.
// Creates (or reuses) an account saved on this device (see AuthProvider),
// then returns you to the page that asked you to log in.
import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Avatar from '../components/common/Avatar'

// Shared style for the three inputs (kept in one place so they stay identical).
const inputClass =
  'w-full rounded-md border border-purple-500/30 bg-white/70 px-3 py-2 text-sm text-black outline-none transition placeholder:text-black/40 focus:border-purple-500 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-white/40'

export default function Login() {
  const { signIn, current } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Where to go after signing in — set by RequireAuth (the page you were
  // denied) or by "Add another account" (the page you were browsing).
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    // Mock check — every field matters, but any password works.
    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in your name, email and password.')
      return
    }
    signIn(name.trim(), email.trim())
    navigate(from, { replace: true })
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10 sm:py-14">
      <div className="rounded-lg border border-purple-500/20 bg-white/60 p-6 shadow-xl backdrop-blur-xl dark:bg-white/[0.06] sm:p-8">
        <h1 className="text-2xl font-bold text-black dark:text-white">Log in</h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Welcome back — your account stays saved on this device.
        </p>

        {/* Shown when a signed-in user adds a second account. */}
        {current && (
          <div className="mt-4 flex items-center gap-2 rounded-md border border-purple-500/20 bg-purple-500/5 px-3 py-2 text-sm text-black/70 dark:text-white/70">
            <Avatar name={current.name} size="sm" />
            <span>
              Signed in as <strong className="font-semibold">{current.name}</strong> — the form
              below adds another account.
            </span>
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-black/70 dark:text-white/70">
              Name
            </span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Ada Lovelace"
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-black/70 dark:text-white/70">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-black/70 dark:text-white/70">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className={inputClass}
            />
          </label>

          {error && (
            <p role="alert" className="text-sm font-medium text-purple-600 dark:text-purple-400">
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

        <p className="mt-4 text-center text-xs text-black/50 dark:text-white/50">
          Demo login — any password works.{' '}
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
