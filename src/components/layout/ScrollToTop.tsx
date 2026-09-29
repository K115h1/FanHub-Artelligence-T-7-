// ScrollToTop, returns the window to the top on navigation. Renders nothing.
// Mounted once in RootLayout.
//
// Watches `pathname` only, not the full location: Explorer rewrites `?q=` as
// the user types, and reacting to that would yank the page up mid-keystroke.
// Uses useLayoutEffect so the new page doesn't flash at the old offset first.
import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'

export default function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useLayoutEffect(() => {
    // A hash is a request to jump to an element, so leave it to the browser.
    if (hash) return
    window.scrollTo(0, 0)
  }, [pathname, hash])

  return null
}
