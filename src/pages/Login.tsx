// Login page — sign in to an account that already exists.
//
// Deliberately different from Register: this asks only for the email and
// password, because the account already has a name on file. Creating an account
// is the Register page's job.
//
// The form itself is LoginForm, shared with the sign-in overlay the header
// opens. What is left here is the part a page does and a dialog cannot: read
// the `from` location state and navigate back to wherever the visitor was
// originally headed.
//
// This route still exists even though the header's Login button now opens the
// overlay. Deep links, bookmarks and the route guards' fallback all land here,
// and it is the one surface that works with JavaScript-driven navigation
// disabled.
import { useLocation, useNavigate } from 'react-router-dom'
import LoginForm from '../components/auth/LoginForm'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()

  // Where to go after signing in — set by a route guard, or '/' by default.
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10 sm:py-14">
      <LoginForm onSignedIn={() => navigate(from, { replace: true })} />
    </div>
  )
}
