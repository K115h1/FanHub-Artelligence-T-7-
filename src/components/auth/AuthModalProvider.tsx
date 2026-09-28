// AuthModalProvider — owns whether the sign-in / sign-up overlay is on screen.
//
// Mounted inside the router (from RootLayout) rather than alongside the other
// providers in app/providers/, because it navigates after a successful sign-in
// and `useNavigate` is only valid under a Router. The other providers sit above
// the RouterProvider and deliberately do not navigate.
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { AuthModalContext, type AuthMode } from '../../context/AuthModalContext'
import AuthModal from './AuthModal'

export default function AuthModalProvider({ children }: { children: ReactNode }) {
  // `from` is the path to return to after signing in, or undefined for "stay
  // where you are". Held as state rather than a ref so a re-render triggered by
  // opening the dialog cannot observe a stale value.
  const [mode, setMode] = useState<AuthMode>('login')
  const [from, setFrom] = useState<string | undefined>(undefined)
  // Whether to open on the "Log in required" notice instead of the form.
  const [prompt, setPrompt] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const open = useCallback(
    (nextMode: AuthMode, nextFrom?: string, options?: { prompt?: boolean }) => {
      setMode(nextMode)
      setFrom(nextFrom)
      setPrompt(options?.prompt === true)
      setIsOpen(true)
    },
    [],
  )

  const close = useCallback(() => {
    setIsOpen(false)
    // Cleared on close so a later open() with no destination cannot inherit the
    // previous one.
    setFrom(undefined)
    setPrompt(false)
  }, [])

  // Memoised so opening the dialog does not re-render the whole app subtree.
  const value = useMemo(() => ({ open, close, isOpen }), [open, close, isOpen])

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      {isOpen && (
        <AuthModal mode={mode} from={from} prompt={prompt} onClose={close} />
      )}
    </AuthModalContext.Provider>
  )
}
