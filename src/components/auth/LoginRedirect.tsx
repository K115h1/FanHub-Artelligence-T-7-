// LoginRedirect, stands in for the deleted /login page.
//
// Signing in happens in the auth overlay, so this route exists only so an old
// bookmark, a link in a confirmation email, or a hand-typed URL lands somewhere
// sensible instead of on the 404. It opens the overlay and immediately
// replaces itself, so the address bar shows the page the visitor was actually
// after rather than /login.
//
// It reads `state.from` the way the old page did, because RequireAdmin and the
// route guards still hand a destination along in the navigation state.
import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthModal } from '../../context/AuthModalContext'
import { useAuth } from '../../context/AuthContext'

export default function LoginRedirect() {
  const { open } = useAuthModal()
  const { isAuthed } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = (location.state as { from?: string } | null)?.from ?? '/'

  useEffect(() => {
    // Already signed in, so this link was stale, send them where they meant to
    // go rather than asking for a password they already supplied.
    if (isAuthed) {
      navigate(from, { replace: true })
      return
    }
    // No prompt here. Whoever follows a /login link is deliberately looking for
    // the sign-in form, and this route is about to navigate away to a public
    // page, so the "Log in required" notice would be announcing a wall that is
    // not there.
    open('login', from)
    navigate(from, { replace: true })
  }, [open, navigate, from, isAuthed])

  // Renders nothing: the overlay is up before this ever paints, and the URL has
  // already been replaced. A blank frame is preferable to a flash of "Loading".
  return null
}
