// Register page, create a new account.
//
// A thin shell around RegisterForm so the same form serves this route and the
// sign-up overlay. The route is kept for deep links; the header's Sign up button
// opens the overlay instead, which layers over the page rather than replacing
// it.
import { useLocation, useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import RegisterForm from '../components/auth/RegisterForm'

export default function Register() {
  const navigate = useNavigate()
  const location = useLocation()

  // Where to go after signing up, set by a route guard, or '/' by default.
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10 sm:py-14">
      <RegisterForm onRegistered={() => navigate(from, { replace: true })} />

      <p className="mt-4 text-center text-xs">
        <Link
          to="/"
          className="font-medium text-purple-600 hover:underline dark:text-purple-400"
        >
          Back to home
        </Link>
      </p>
    </div>
  )
}
