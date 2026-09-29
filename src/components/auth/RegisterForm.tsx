// RegisterForm, create a new account.
//
// Extracted from the Register page so the sign-up overlay and the page share one
// form. The page is a thin shell around this; the overlay renders it directly and
// dismisses itself when the account exists.
//
// Deliberately a different form from LoginForm: this asks for a display name,
// because a new account has none yet, plus a confirmation of the password. Login
// asks for neither.
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Lock, Mail, User, UserPlus, Check } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const inputClass =
  'w-full rounded-md border border-purple-500/30 bg-white/70 px-3 py-2 text-sm text-black transition placeholder:text-black/40 focus:border-purple-500 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-white/40'

/** Deliberately permissive: enough to catch a typo, not a real validator. */
function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())
}

export default function RegisterForm({
  onRegistered,
  onSwitchToLogin,
}: {
  /** Called once the account exists. The caller decides whether to navigate. */
  onRegistered: () => void
  /**
   * Switches the overlay to the sign-in form. The Register *page* leaves this
   * undefined and renders a link instead, because on a page the two are two
   * different routes.
   */
  onSwitchToLogin?: () => void
}) {
  const { signUp, lastError } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const tooShort = password.length > 0 && password.length < 6
  const mismatch = confirm.length > 0 && confirm !== password

  async function onSubmit(event: FormEvent) {
    event.preventDefault()

    if (!name.trim()) return setError('Choose a display name.')
    if (!looksLikeEmail(email)) return setError('Enter a valid email address.')
    if (password.length < 6) return setError('Passwords need at least 6 characters.')
    if (password !== confirm) return setError('The two passwords do not match.')

    setBusy(true)
    const id = await signUp(name, email, password)
    setBusy(false)

    if (id === null) {
      setError(
        lastError ?? 'An account with that email already exists. Try logging in instead.',
      )
      return
    }
    onRegistered()
  }

  return (
    <div className="rounded-lg border border-purple-500/20 bg-white/60 p-6 shadow-xl backdrop-blur-xl dark:bg-white/[0.06] sm:p-8">
      <span className="accent-wash mb-4 flex h-11 w-11 items-center justify-center rounded-xl text-white">
        <UserPlus size={20} aria-hidden="true" />
      </span>

      <h1 className="text-2xl font-bold text-black dark:text-white">Create your account</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Bookmark what you love and join fan events across every fandom.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-black/70 dark:text-white/70">
            Display name
          </span>
          <span className="relative block">
            <User
              size={15}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black/35 dark:text-white/35"
            />
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="How fans will see you"
              autoComplete="nickname"
              className={`${inputClass} pl-9`}
            />
          </span>
        </label>

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
              placeholder="At least 6 characters"
              autoComplete="new-password"
              aria-invalid={tooShort || undefined}
              className={`${inputClass} pl-9 ${tooShort ? 'border-rose-500' : ''}`}
            />
          </span>
          {tooShort && (
            <span className="mt-1 block text-xs font-medium text-rose-500">
              A little longer, please.
            </span>
          )}
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-black/70 dark:text-white/70">
            Confirm password
          </span>
          <span className="relative block">
            {mismatch ? (
              <Check
                size={15}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-rose-500"
              />
            ) : (
              <Lock
                size={15}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black/35 dark:text-white/35"
              />
            )}
            <input
              type="password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              placeholder="Type it again"
              autoComplete="new-password"
              aria-invalid={mismatch || undefined}
              className={`${inputClass} pl-9 ${mismatch ? 'border-rose-500' : ''}`}
            />
          </span>
          {mismatch && (
            <span className="mt-1 block text-xs font-medium text-rose-500">
              These do not match yet.
            </span>
          )}
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
          {busy ? 'Creating…' : 'Create account'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-black/60 dark:text-white/60">
        Already registered?{' '}
        {onSwitchToLogin ? (
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-semibold text-purple-600 hover:underline dark:text-purple-400"
          >
            Log in
          </button>
        ) : (
          <Link
            to="/login"
            className="font-semibold text-purple-600 hover:underline dark:text-purple-400"
          >
            Log in
          </Link>
        )}
      </p>
    </div>
  )
}
