// LoginModalContext — who can ask for the login overlay, and how it is dismissed.
//
// Separate from AuthContext on purpose: that one answers "is anyone signed in",
// this one answers "should the sign-in dialog be on screen". Mixing them would
// mean every consumer of auth state re-renders whenever the dialog opens.
//
// The provider is NOT in app/providers/, because it lives inside the router so
// it can navigate after a successful sign-in. See LoginModalProvider.
import { createContext, useContext } from 'react'

export interface LoginModalContextValue {
  /**
   * Open the overlay.
   * @param from Optional path to return to once signed in. The route guards set
   *   this so a member-only page can be resumed; the header's Login button omits
   *   it, which means "sign in and stay put".
   */
  open: (from?: string) => void
  close: () => void
  isOpen: boolean
}

// Defaulted so a component rendered outside the provider (tests, storybook)
// still renders instead of throwing.
export const LoginModalContext = createContext<LoginModalContextValue>({
  open: () => {},
  close: () => {},
  isOpen: false,
})

// Convenience hook: const { open } = useLoginModal()
export const useLoginModal = () => useContext(LoginModalContext)
