// BackButton, returns to the previous page instead of the homepage.
//
// A content page is almost always reached from somewhere specific (a category
// grid, a bookmark, a search result), so "back to home" throws that context
// away. This goes back one entry in the session history when there is one.
//
// The one case history cannot cover: the visitor opened this page directly, by
// pasting the link or by refreshing. React Router marks the app's very first
// location with `key: 'default'`, and every in-app navigation after that gets
// a unique key, so a key other than 'default' is a reliable signal that there
// is somewhere to go back to. When there isn't, the button falls back to
// `fallbackTo` (the title's category on a content page, the homepage otherwise).
//
// `variant="primary"` renders the same button as a filled call to action. That
// exists for the 404 page, where going back is the first thing offered and has
// to outrank the sitemap below it. The two styles are selected rather than
// merged so the filled one can carry its own background, hover and padding
// without fighting the ghost one's text colours.

import { ArrowLeft } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

export default function BackButton({
  fallbackTo = '/',
  label = 'Back',
  fallbackLabel,
  className = '',
  variant = 'ghost',
}: {
  /** Where to go when there is no in-app history to return to. */
  fallbackTo?: string
  label?: string
  /** Overrides the label in the fallback case, e.g. "Back to Movies". */
  fallbackLabel?: string
  className?: string
  /** `ghost` is the quiet inline link; `primary` is the filled button. */
  variant?: 'ghost' | 'primary'
}) {
  const navigate = useNavigate()
  const location = useLocation()

  const canGoBack = location.key !== 'default'

  function onClick() {
    if (canGoBack) navigate(-1)
    else navigate(fallbackTo)
  }

  const base =
    variant === 'primary'
      ? 'inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink transition hover:bg-accent-hover'
      : 'inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition hover:text-accent'

  return (
    <button type="button" onClick={onClick} className={`${base} ${className}`}>
      <ArrowLeft size={15} aria-hidden="true" />
      {canGoBack ? label : (fallbackLabel ?? label)}
    </button>
  )
}
