// RequireAuth — route guard for members-only pages (movies, comics,
// articles, dashboard, admin, …).
//   • not logged in → the protected page NEVER renders; you get a popup
//     pointing at /login that remembers where you were headed
//   • logged in     → the page renders normally through <Outlet/>
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function RequireAuth() {
  const { isAuthed } = useAuth()
  const location = useLocation()

  // Deny access: no page content, just the login popup.
  if (!isAuthed) {
    return <LoginRequiredModal from={location.pathname + location.search} />
  }
  return <Outlet />
}

// The popup itself — only ever rendered by the guard above.
function LoginRequiredModal({ from }: { from: string }) {
  const navigate = useNavigate()

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-required-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-lg border border-purple-500/20 bg-white p-6 text-center shadow-xl dark:bg-[#15001f]">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-gradient-to-br from-purple-600 to-purple-500 text-white">
          <Lock size={22} />
        </span>
        <h2
          id="login-required-title"
          className="mb-2 text-xl font-bold text-black dark:text-white"
        >
          Log in required
        </h2>
        <p className="mb-6 text-sm leading-relaxed text-black/60 dark:text-white/60">
          This page is only available to logged-in members. Log in to continue — or keep
          browsing the public pages.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            to="/login"
            state={{ from }}
            className="flex-1 rounded-md bg-gradient-to-r from-purple-600 to-purple-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:from-purple-500 hover:to-purple-400"
          >
            Log in
          </Link>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex-1 rounded-md border border-purple-500/30 px-4 py-2.5 text-sm font-semibold text-black/70 transition hover:border-purple-500 hover:text-purple-600 dark:text-white/70 dark:hover:text-purple-400"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}
