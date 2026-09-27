// LoginModal — sign-in as a full-screen overlay rather than a page.
//
// Same construction as LoginRequiredModal in RequireAuth.tsx, and for the same
// reason: the user asked for the backdrop to reach every edge, including the
// sticky header and the fixed sidebar, which is a paint-order problem rather
// than a layout one. Painting alone cannot do it:
//
//   * The header is `sticky` and the sidebar is `fixed`, both inside the page
//     column. An overlay rendered as a sibling of <main> would be clipped to
//     the content box and stop at the header.
//   * The content column animates `margin`, and Tailwind transitions can leave
//     a compositing layer behind. An overlay inside that subtree can end up
//     behind the header regardless of its z-index.
//
// createPortal to <body> settles both: the dialog becomes a sibling of #root
// with no ancestor stacking context to fight, and `fixed inset-0` is then
// unambiguously the viewport. useModalLayer handles the two things paint cannot
// — it stops the page scrolling and marks #root inert, so Tab cannot walk into
// the header and the open mobile drawer while the dialog is up.
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { useModalLayer } from '../../hooks/useModalLayer'
import LoginForm from './LoginForm'

export default function LoginModal({
  from,
  onClose,
}: {
  /** Path to return to after signing in. Undefined means "stay where you are". */
  from?: string
  onClose: () => void
}) {
  const navigate = useNavigate()

  // Escape dismisses. This is safe here in a way it is not in the route guard's
  // modal: closing reveals the page the visitor was already looking at, so
  // nothing is lost and no navigation is implied.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  // Scroll lock + inert app root.
  useModalLayer(true)

  function onSignedIn() {
    onClose()
    if (from) navigate(from, { replace: true })
  }

  return createPortal(
    // The backdrop is a real element rather than a click-handler on the panel, so
    // clicking beside the card dismisses and clicking the card does not. The
    // panel stops propagation rather than the backdrop checking its target,
    // because the card contains inputs whose clicks must never dismiss.
    //
    // `inset-0` is sufficient for full coverage. It sizes to the initial
    // containing block, which excludes the scrollbar gutter that index.css
    // reserves with `scrollbar-gutter: stable` — but nothing is ever painted
    // there, so there is no strip of undimmed content to close. Measured on a
    // 1000px viewport: backdrop 985px wide, rightmost painted pixel 984.7px.
    // `w-screen` was tried here and is NOT the answer — 100vw also measures
    // 985px in this configuration, so it changes nothing.
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
        onClick={(event) => event.stopPropagation()}
        className="relative w-full max-w-md shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close sign in"
          className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-md text-black/50 transition hover:bg-purple-500/10 hover:text-purple-600 dark:text-white/50 dark:hover:text-purple-300"
        >
          <X size={18} aria-hidden="true" />
        </button>

        {/* The form's own heading is the accessible name; this is a visually
            hidden duplicate so the dialog has a label even before the card
            paints. */}
        <h2 id="login-modal-title" className="sr-only">
          Log in to FanHub Plus
        </h2>

        <LoginForm onSignedIn={onSignedIn} onNavigateAway={onClose} />
      </div>
    </div>,
    document.body,
  )
}
