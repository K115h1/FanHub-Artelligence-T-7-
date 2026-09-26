// BookmarkButton — saves or unsaves an item.
//
// Sits on every content and article card, so the button has to stop the click
// from also following the card's link. Signed out it shows a login hint instead
// of accepting a save that would be lost.
import { Bookmark } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useBookmarks } from '../../context/BookmarksContext'
import { useAuth } from '../../context/AuthContext'
import type { BookmarkKind } from '../../lib/bookmarks'

export default function BookmarkButton({
  kind,
  refId,
  title,
  size = 'md',
}: {
  kind: BookmarkKind
  refId: number
  /** Used for the accessible name, e.g. "Save One Piece — The Final Saga". */
  title: string
  size?: 'sm' | 'md'
}) {
  const { isSaved, toggle } = useBookmarks()
  const { isAuthed } = useAuth()
  const navigate = useNavigate()

  const saved = isSaved(kind, refId)
  const box = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9'
  const icon = size === 'sm' ? 13 : 15

  return (
    <button
      type="button"
      // Stop the surrounding card link from navigating.
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (!isAuthed) {
          navigate('/login')
          return
        }
        toggle(kind, refId)
      }}
      aria-pressed={saved}
      aria-label={isAuthed ? (saved ? `Remove ${title} from bookmarks` : `Save ${title} to bookmarks`) : `Log in to save ${title}`}
      title={isAuthed ? (saved ? 'Saved — click to remove' : 'Save for later') : 'Log in to save'}
      className={`flex ${box} shrink-0 items-center justify-center rounded-lg border transition ${
        saved
          ? 'border-accent bg-accent text-accent-ink'
          : 'border-line bg-surface-raised text-ink-subtle hover:border-accent hover:text-accent'
      }`}
    >
      <Bookmark size={icon} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />
    </button>
  )
}
