// RequireAuth — route guard for members-only pages.
//
// Guests never see the protected page. The guard opens the auth overlay on its
// "Log in required" prompt, remembering where they were headed so signing in
// resumes it.
//
// The prompt used to be a card rendered inline here, which meant the guard owned
// a second copy of the overlay: its own portal, its own Escape handling, its own
// scroll lock. It now delegates to AuthModal, so the wall a visitor hits by
// accident and the wall they hit by clicking "Log in" are the same component and
// cannot drift apart.
import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useAuthModal } from '../../context/AuthModalContext'

export default function RequireAuth() {
  const { isAuthed } = useAuth()
  const { open } = useAuthModal()
  const location = useLocation()

  // Where the visitor was trying to go, so signing in can resume it.
  const wanted = location.pathname + location.search
  const openedFor = useRef<string | null>(null)

  // `open` lives on a provider above this component, so calling it during render
  // would be a state update on a different component mid-render, which React
  // warns about and can loop on. The effect below runs instead, and the
  // `null` return in the same pass is what keeps the protected page from
  // painting: there is one empty frame before the overlay mounts, never a flash
  // of the content the guard exists to hide.
  useEffect(() => {
    if (isAuthed) return
    // Once per destination. StrictMode runs effects twice in development, and
    // moving to a different guarded page should re-open with the new target, so
    // this tracks the path rather than a bare boolean.
    if (openedFor.current === wanted) return
    openedFor.current = wanted
    open('login', wanted, { prompt: true })
  }, [isAuthed, open, wanted])

  if (!isAuthed) return null

  return <Outlet />
}
