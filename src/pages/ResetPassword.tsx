// ResetPassword — set a new password using a tokenized link.
//
// The token arrives in the query string because the emailed link points here.
// Two things follow from that:
//
//   * The token is read once on mount and then stripped from the URL with
//     replaceState. Leaving it in means it ends up in history, in the referrer
//     of any outbound link, and in a screenshot.
//   * A pasted-in token is validated by the server, not here. This page only
//     decides whether a token is present; "is it still valid" is the API's
//     call, and answering it client-side would mean duplicating the expiry rules.
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Lock, Check } from 'lucide-react'
import * as api from '../services/auth.service'

const inputClass =
  'w-full rounded-md border border-purple-500/30 bg-white/70 px-3 py-2 text-sm text-black transition placeholder:text-black/40 focus:border-purple-500 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-white/40'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const navigate = useNavigate()

  // Read then strip, in that order and in one pass, so a re-render cannot race
  // and re-read a token that has already been cleared.
  const [token] = useState(() => params.get('token') ?? '')
  useEffect(() => {
    if (!params.get('token')) return
    params.delete('token')
    window.history.replaceState(null, '', `${location.pathname}${params.toString() ? `?${params}` : ''}`)
  }, [params])

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const tooShort = password.length > 0 && password.length < 6
  const mismatch = confirm.length > 0 && confirm !== password

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (password.length < 6) return setError('Passwords need at least 6 characters.')
    if (password !== confirm) return setError('The two passwords do not match.')

    setBusy(true)
    setError(null)
    try {
      await api.resetPassword(token, password)
      setDone(true)
      // Straight to Login: the reset invalidated nothing about the session, but
      // a member who just chose a new password almost always wants to use it.
      setTimeout(() => navigate('/login'), 1800)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That link is no longer valid.')
    } finally {
      setBusy(false)
    }
  }

  if (!token) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-10 sm:py-14">
        <div className="rounded-lg border border-purple-500/20 bg-white/60 p-6 shadow-xl dark:bg-white/[0.06] sm:p-8">
          <h1 className="text-xl font-bold text-black dark:text-white">This link is incomplete</h1>
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">
            The reset link is missing its token. Open the link straight from your email, or
            request a new one.
          </p>
          <Link
            to="/forgot-password"
            className="mt-5 inline-block rounded-md bg-gradient-to-r from-purple-600 to-purple-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:from-purple-500 hover:to-purple-400"
          >
            Request a new link
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10 sm:py-14">
      <div className="rounded-lg border border-purple-500/20 bg-white/60 p-6 shadow-xl backdrop-blur-xl dark:bg-white/[0.06] sm:p-8">
        <span className="accent-wash mb-4 flex h-11 w-11 items-center justify-center rounded-xl text-white">
          <Lock size={20} aria-hidden="true" />
        </span>

        <h1 className="text-2xl font-bold text-black dark:text-white">Choose a new password</h1>

        {done ? (
          <p className="mt-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-700 dark:text-emerald-400">
            Password updated. Taking you to the login page…
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-black/70 dark:text-white/70">
                New password
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
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-black/70 dark:text-white/70">
                Confirm new password
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
            </label>

            {error && (
              <p role="alert" className="text-sm font-medium text-rose-600 dark:text-rose-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy || tooShort || mismatch}
              className="w-full rounded-md bg-gradient-to-r from-purple-600 to-purple-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-purple-600/30 transition hover:from-purple-500 hover:to-purple-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? 'Saving…' : 'Set new password'}
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-sm">
          <Link
            to="/login"
            className="font-semibold text-purple-600 hover:underline dark:text-purple-400"
          >
            Back to login
          </Link>
        </p>
      </div>
    </div>
  )
}
