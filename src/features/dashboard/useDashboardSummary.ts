// useDashboardSummary — everything the member's dashboard shows, in one hook.
//
// The scaffold this replaces asked for "greeting, recent activity, favourite
// fandoms, bookmarked items in as few requests as possible". So: three requests,
// in parallel, and no waterfall. The greeting is derived from the clock rather
// than fetched, because the server has no idea what time it is where the
// visitor is.
//
// Each source degrades on its own. A failed bookmark fetch shows an empty
// bookmark shelf, not an error page over the whole dashboard — these are four
// independent panels, and one broken panel should not take the other three with
// it.
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import * as authApi from '../../services/auth.service'
import { getBookmarks } from '../../services/content.service'
import type { ActivityDto } from '../../services/auth.service'
import type { ContentSummary } from '../../types/models'

/**
 * "Good evening" and so on.
 *
 * Computed from the visitor's own clock, not UTC — a server-side greeting would
 * be wrong for most of the world, and the offset is a one-line change rather
 * than a configuration surface.
 */
export function greeting(date = new Date()): string {
  const h = date.getHours()
  if (h < 5) return 'Good night'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

/** Turns a log action into something a person can read. */
export function describeActivity(entry: ActivityDto): string {
  switch (entry.action) {
    case 'register':
      return 'Joined Fan Hub Plus'
    case 'login':
      return 'Signed in'
    case 'password_reset':
      return 'Reset your password'
    case 'email_verified':
      return 'Verified your email address'
    case 'content_view':
      return 'Viewed a title'
    case 'content_rating':
      return 'Rated a title'
    case 'content_bookmark':
      return 'Bookmarked a title'
    default:
      // An action this build does not know about yet. Showing the raw token beats
      // hiding the row — it is honest, and it is a visible prompt to add a case.
      return entry.action.replace(/_/g, ' ')
  }
}

/** A short relative time, e.g. "3h ago". */
export function relativeTime(iso: string, now = new Date()): string {
  const then = new Date(iso.endsWith('Z') ? iso : `${iso}Z`)
  const seconds = Math.max(0, Math.round((now.getTime() - then.getTime()) / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  return then.toLocaleDateString()
}

export interface DashboardSummary {
  hello: string
  /** Favourites as chips; drives the "jump back into a fandom" row. */
  favoriteFandoms: { id: number; slug: string; name: string }[]
  activity: { id: number; label: string; when: string }[]
  bookmarks: ContentSummary[]
  loading: boolean
  /** True when nothing at all came back, so the page can say so. */
  isEmpty: boolean
}

export function useDashboardSummary(): DashboardSummary {
  const { current, isAuthed } = useAuth()
  const [favoriteFandoms, setFavoriteFandoms] = useState<DashboardSummary['favoriteFandoms']>([])
  const [activity, setActivity] = useState<DashboardSummary['activity']>([])
  const [bookmarks, setBookmarks] = useState<ContentSummary[]>([])
  const [loading, setLoading] = useState(isAuthed)

  useEffect(() => {
    if (!isAuthed) {
      setLoading(false)
      return
    }
    // Ignore the result of a run that a newer run has superseded, so a fast
    // sign-out cannot be overwritten by the in-flight requests it cancelled.
    let cancelled = false
    setLoading(true)

    // All three at once. Chaining these would make the dashboard take the sum of
    // three latencies instead of the slowest one.
    void Promise.allSettled([
      authApi.getCategories(),
      authApi.getActivity(8),
      getBookmarks(),
    ]).then(([cats, acts, marks]) => {
      if (cancelled) return

      if (cats.status === 'fulfilled') setFavoriteFandoms(cats.value.favorites)
      else setFavoriteFandoms([])

      if (acts.status === 'fulfilled') {
        setActivity(
          acts.value.map((a) => ({
            id: a.logId,
            label: describeActivity(a),
            when: relativeTime(a.createdAt),
          })),
        )
      } else setActivity([])

      if (marks.status === 'fulfilled') setBookmarks(marks.value)
      else setBookmarks([])
    })
      // Clear the flag here as well as in the signed-out branch below. Without
      // it `loading` is set true above and never cleared, and allSettled never
      // rejects, so the page renders its skeletons for good.
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isAuthed, current?.userId])

  return useMemo(
    () => ({
      hello: greeting(),
      favoriteFandoms,
      activity,
      bookmarks,
      loading,
      isEmpty: !loading && favoriteFandoms.length === 0 && activity.length === 0 && bookmarks.length === 0,
    }),
    [activity, bookmarks, favoriteFandoms, loading],
  )
}
