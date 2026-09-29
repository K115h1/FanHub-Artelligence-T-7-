// useSidebar, open/closed state for the left navigation.
//
// One boolean drives both breakpoints; only the CSS differs. At md and up the
// panel pushes the content sideways, below md it overlays as a drawer with a
// scrim. The state stays truthful on both, derive anything else in CSS, not here.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useMediaQuery } from './useMediaQuery'

// Must match Tailwind's `md` breakpoint.
const DESKTOP_QUERY = '(min-width: 768px)'

export interface UseSidebarReturn {
  isOpen: boolean
  isDesktop: boolean
  toggle: () => void
  open: () => void
  close: () => void
}

// Starts open and is not persisted, so the nav is visible on first load.
export function useSidebar(): UseSidebarReturn {
  const [isOpen, setIsOpen] = useState(true)
  const isDesktop = useMediaQuery(DESKTOP_QUERY)

  const toggle = useCallback(() => setIsOpen((open) => !open), [])
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])

  // Escape closes the drawer. Desktop is skipped: the panel is page furniture
  // there, not a modal overlay.
  useEffect(() => {
    if (!isOpen || isDesktop) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, isDesktop])

  // Reopen when crossing up to md, so the scrim isn't stranded over a panel
  // that now pushes.
  const wasDesktop = useRef(isDesktop)
  useEffect(() => {
    if (isDesktop && !wasDesktop.current) setIsOpen(true)
    wasDesktop.current = isDesktop
  }, [isDesktop])

  return { isOpen, isDesktop, toggle, open, close }
}
