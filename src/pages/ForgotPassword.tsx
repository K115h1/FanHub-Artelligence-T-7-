// ForgotPassword — ask for a reset link.
//
// There is no mail server, so the API returns the token in the response and also
// writes the link to its own log. The link is shown here so the flow is usable
// end to end in development, and clearly labelled as a development affordance
// so it is never mistaken for production behaviour.
//
// The response is deliberately identical whether or not the address exists: a
// different message for a known address would turn this form into a way to
// discover who has an account.
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { KeyRound, Mail, ArrowRight } from 'lucide-react'
import * as api from '../services/auth.service'

const inputClass =
  'w-full rounded-md border border-purple-500/30 bg-white/70 px-3 py-2 text-sm text-black transition placeholder:text-black/40 focus:border-purple-500 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-white/40'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState<{ token: string; delivered: boolean } | null>(null)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!email.trim()) return setError('Enter the email address on your account.')

    setBusy(true)
    setError(null)
    try {
      setSent(await api.forgotPassword(email.trim()))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the reset link.')
    } finally {
      setBusy(false)
    }
  }

  const resetHref = sent?.token ? `/reset-password?token=${encodeURIComponent(sent.token)}` : '/reset-password'

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10 sm:py-14">
      <div className="rounded-lg border border-purple-500/20 bg-white/60 p-6 shadow-xl backdrop-blur-xl dark:bg-white/[0.06] sm:p-8">
        <span className="accent-wash mb-4 flex h-11 w-11 items-center justify-center rounded-xl text-white">
          <KeyRound size={20} aria-hidden="true" />
        </span>

        <h1 className="text-2xl font-bold text-black dark:text-white">Reset your password</h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Enter your email address and we&rsquo;ll send a link to set a new password.
        </p>

        {sent ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
              If that address has an account, a reset link is on its way.
            </p>

            {/* Development only. The API has no mail server, so the token comes
                back in the response instead of arriving by email. */}
            {sent.token && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                  Development only — no mail server is configured
                </p>
                <p className="mt-1 text-xs text-black/60 dark:text-white/60">
                  The API also wrote this link to its log. Use it to finish the flow:
                </p>
                <Link
                  to={resetHref}
                  className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-purple-600 hover:underline dark:text-purple-400"
                >
                  Continue to the new password
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
            )}

            <button
              type="button"
              onClick={() => setSent(null)}
              className="w-full rounded-md border border-purple-500/30 px-4 py-2.5 text-sm font-semibold text-black/70 transition hover:border-purple-500 dark:text-white/70"
            >
              Use a different address
            </button>
          </div>
        ) : (
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

            {error && (
              <p role="alert" className="text-sm font-medium text-rose-600 dark:text-rose-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-gradient-to-r from-purple-600 to-purple-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-purple-600/30 transition hover:from-purple-500 hover:to-purple-400 disabled:opacity-60"
            >
              {busy ? 'Sending…' : 'Send the link'}
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-black/60 dark:text-white/60">
          Remembered it?{' '}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="font-semibold text-purple-600 hover:underline dark:text-purple-400"
          >
            Log in
          </button>
        </p>
      </div>
    </div>
  )
}
