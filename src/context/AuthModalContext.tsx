// AuthModalContext, who can ask for the sign-in / sign-up overlay, and how it
// is dismissed.
//
// Separate from AuthContext on purpose: that one answers "is anyone signed in",
// this one answers "which auth dialog is on screen". Mixing them would mean every
// consumer of auth state re-renders whenever the dialog opens.
//
// The provider is NOT in app/providers/, because it lives inside the router so
// it can navigate after a successful sign-in. See AuthModalProvider.
import { createContext, useContext } from 'react'

/** Which form the overlay shows. */
export type AuthMode = 'login' | 'register'

export interface AuthModalContextValue {
  /**
   * Open the overlay.
   * @param mode Which form to show first.
   * @param from Optional path to return to once signed in.
   * @param options.prompt Show the "Log in required" notice before the form.
   *
   * `from` and `prompt` are separate because they answer different questions.
   * `from` is "where should they end up", set by a route guard so a member-only
   * page can be resumed. `prompt` is "are they hitting a wall", true when a
   * guard stopped them, false when they asked to sign in themselves.
   *
   * The old /login bookmark is the case that needs both: it returns them to
   * wherever they were headed, but shows the form directly, because telling
   * someone on the homepage that a page needs logging in is nonsense.
   */
  open: (mode: AuthMode, from?: string, options?: { prompt?: boolean }) => void
  close: () => void
  isOpen: boolean
}

// Defaulted so a component rendered outside the provider (tests, storybook)
// still renders instead of throwing.
export const AuthModalContext = createContext<AuthModalContextValue>({
  open: () => {},
  close: () => {},
  isOpen: false,
})

// Convenience hook: const { open } = useAuthModal()
export const useAuthModal = () => useContext(AuthModalContext)
