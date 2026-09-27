// LoginModalProvider — owns whether the sign-in overlay is on screen.
//
// Mounted inside the router (from RootLayout) rather than alongside the other
// providers in app/providers/, because it navigates after a successful sign-in
// and `useNavigate` is only valid under a Router. The other providers sit above
// the RouterProvider and deliberately do not navigate.
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { LoginModalContext } from '../../context/LoginModalContext'
import LoginModal from './LoginModal'

export default function LoginModalProvider({ children }: { children: ReactNode }) {
  // `from` is the path to return to after signing in, or undefined for "stay
  // where you are". Held as state rather than a ref so a re-render triggered by
  // opening the dialog cannot observe a stale value.
  const [from, setFrom] = useState<string | undefined>(undefined)
  const [isOpen, setIsOpen] = useState(false)

  const open = useCallback((next?: string) => {
    setFrom(next)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    // Cleared on close so a later open() with no argument cannot inherit the
    // previous destination.
    setFrom(undefined)
  }, [])

  // Memoised so opening the dialog does not re-render the whole app subtree.
  const value = useMemo(() => ({ open, close, isOpen }), [open, close, isOpen])

  return (
    <LoginModalContext.Provider value={value}>
      {children}
      {isOpen && <LoginModal from={from} onClose={close} />}
    </LoginModalContext.Provider>
  )
}
