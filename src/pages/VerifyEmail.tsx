// VerifyEmail, the landing page for an emailed verification link.
//
// A GET cannot change state, so the token is read from the query string and
// exchanged with a POST on mount. Two consequences worth stating:
//
//   * The token is stripped from the URL as soon as it has been read, for the
//     same reason as on the reset page: history, referrers, screenshots.
//   * React 18+ mounts effects twice in StrictMode, which in development would
//     fire the exchange twice. The second call is rejected by the server as a
//     replay, so a `useRef` guard is required or the page would report a
//     spurious failure.
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BadgeCheck, TriangleAlert } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import * as api from '../services/auth.service'
import { Spinner } from '../components/common/Spinner'

type State = 'working' | 'done' | 'failed'

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const { refreshProfile } = useAuth()
  const [state, setState] = useState<State>('working')
  const [message, setMessage] = useState<string | null>(null)
  const started = useRef(false)

  const token = params.get('token') ?? ''

  useEffect(() => {
    // StrictMode double-invokes effects; without this the second exchange is
    // rejected as a replay and the page wrongly reports failure.
    if (started.current) return
    started.current = true

    if (!token) {
      setState('failed')
      setMessage('This link is missing its token. Open it straight from the email, or request a new one from your profile.')
      return
    }

    params.delete('token')
    window.history.replaceState(null, '', location.pathname)

    api
      .confirmVerification(token)
      .then(async () => {
        // Pick up isVerified so the profile stops nagging immediately.
        await refreshProfile()
        setState('done')
      })
      .catch((error: unknown) => {
        setState('failed')
        setMessage(error instanceof Error ? error.message : 'That link is no longer valid.')
      })
    // Runs once: the token is captured above and never changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10 sm:py-14">
      <div className="rounded-lg border border-purple-500/20 bg-white/60 p-6 text-center shadow-xl backdrop-blur-xl dark:bg-white/[0.06] sm:p-8">
        {state === 'working' && (
          <>
            <Spinner size="lg" label="Verifying your email" />
            <h1 className="mt-4 text-xl font-bold text-black dark:text-white">
              Verifying your email
            </h1>
          </>
        )}

        {state === 'done' && (
          <>
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
              <BadgeCheck size={24} aria-hidden="true" />
            </span>
            <h1 className="text-xl font-bold text-black dark:text-white">Email confirmed</h1>
            <p className="mt-2 text-sm text-black/60 dark:text-white/60">
              Thanks — your address is verified.
            </p>
          </>
        )}

        {state === 'failed' && (
          <>
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/15 text-rose-500">
              <TriangleAlert size={24} aria-hidden="true" />
            </span>
            <h1 className="text-xl font-bold text-black dark:text-white">
              That link did not work
            </h1>
            <p className="mt-2 text-sm text-black/60 dark:text-white/60">{message}</p>
          </>
        )}

        <Link
          to="/profile?tab=interests"
          className="mt-6 inline-block rounded-md bg-gradient-to-r from-purple-600 to-purple-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:from-purple-500 hover:to-purple-400"
        >
          {state === 'done' ? 'Back to your profile' : 'Request a new link'}
        </Link>
      </div>
    </div>
  )
}
