// ScrollToTop — puts the window back at the top when the page changes.
//
// Mounted once in RootLayout (see the import there). It renders nothing.
//
// WHY IT WATCHES `pathname` AND NOT THE FULL LOCATION:
// the Explorer page filters live as you type, rewriting the `?q=` search param
// several times per second. If this component reacted to search-param changes
// it would yank the page back to the top mid-keystroke, so a visitor reading
// results could never scroll down and refine their search. Only a genuine page
// change scrolls, which is why the dependency is the path alone.
//
// `useLayoutEffect` rather than `useEffect`: layout effects run before the
// browser paints, so the new page never flashes at the old scroll position
// first. There is no SSR in this project, so the usual server-render warning
// about it does not apply.
import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'

export default function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useLayoutEffect(() => {
    // A URL with a hash is asking to jump to an element, so leave that alone.
    if (hash) return
    window.scrollTo(0, 0)
  }, [pathname, hash])

  return null
}
