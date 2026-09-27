// useModalLayer — makes a portalled modal genuinely cover the whole app.
//
// The portal already puts the overlay above the sticky header and the fixed
// sidebar in the paint order. This hook covers the two things painting alone
// can't: the page behind must not scroll, and the app chrome behind must be
// non-interactive. Without the second one `aria-modal="true"` is a lie — Tab
// still walks into the header and the open drawer, and clicks land on them.
//
// Both gate dialogs (RequireAuth, RequireAdmin) call it, so the behaviour is
// defined once instead of copied.
import { useEffect } from 'react'

// Everything the app renders lives in here, so one attribute takes the lot out
// of play. The modal is portalled to <body> — a sibling of this node — which is
// why the dialog itself stays usable while its parent is inert.
const APP_ROOT_ID = 'root'

/**
 * @param active Whether the modal is currently open. Cleanup runs when this
 *   flips to false or the dialog unmounts, so navigation always restores the
 *   page rather than stranding it locked.
 */
export function useModalLayer(active: boolean): void {
  useEffect(() => {
    if (!active) return

    const { body } = document
    const appRoot = document.getElementById(APP_ROOT_ID)

    // Stop the page scrolling behind the backdrop. The overlay is viewport-sized
    // and fixed, so scrolling it would slide the blurred content under a static
    // veil and let the sticky header swap its glass state mid-dialog.
    //
    // No scrollbar-width compensation here: index.css already sets
    // `scrollbar-gutter: stable` on <html>, so the gutter is reserved whether or
    // not a scrollbar is showing. Hiding one costs no layout width, and adding
    // padding to make up for it would itself shift the app sideways.
    const previousOverflow = body.style.overflow
    body.style.overflow = 'hidden'

    // Take the app out of the pointer, keyboard and accessibility trees.
    const wasInert = appRoot?.inert ?? false
    if (appRoot) appRoot.inert = true

    return () => {
      body.style.overflow = previousOverflow
      if (appRoot) appRoot.inert = wasInert
    }
  }, [active])
}
