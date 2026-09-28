// avatar.ts — turning a stored AvatarPath into something an <img> can load.
//
// The API stores an API-relative path ("/images/avatars/abc.png") and serves
// those files from ITS OWN origin. The frontend also serves /images/ out of
// public/, from a different origin, for poster art. So the two share a path
// prefix and must never be confused.
//
// This lived inline in InterestsTab first, which is how it ended up written
// three times in one sitting. It is the resolution every avatar display needs,
// so it lives here.

/** The API's origin, with the /api suffix stripped. */
export function apiOrigin(): string {
  const configured = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:5068/api'
  return configured.replace(/\/api\/?$/, '')
}

/**
 * Resolve a stored AvatarPath to a loadable URL.
 *
 * Returns null for "no avatar", which is the signal to fall back to initials —
 * so an empty string and a null both mean the same thing to a caller.
 */
export function avatarUrl(path: string | null | undefined): string | null {
  if (!path) return null
  // Already absolute: an uploaded avatar is never stored this way, but a
  // hand-edited database row might be, and a broken src is worse than none.
  if (/^https?:\/\//i.test(path)) return path
  return `${apiOrigin()}${path.startsWith('/') ? path : `/${path}`}`
}
