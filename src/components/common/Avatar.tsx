// Avatar — a profile picture, or the initials stand-in when there isn't one.
//
// The initials tile was the whole component until avatars could actually be
// uploaded. It stays as the fallback rather than being replaced: most seeded
// accounts have no picture, and an empty circle reads as broken where a letter
// reads as a person.
//
// `src` is expected to be a resolved URL — run it through avatarUrl() from
// lib/avatar.ts, because the API serves these from a different origin than the
// poster art and the bare "/images/..." path is ambiguous between the two.
import { useState } from 'react'
import { avatarUrl } from '../../lib/avatar'

// "Ada Lovelace" -> "AL", "ada" -> "AD", "" -> "?"
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function Avatar({
  name,
  size = 'md',
  src,
  className = '',
}: {
  name: string
  size?: 'sm' | 'md'
  /** Resolved avatar URL. Null/undefined/'' falls back to the initials tile. */
  src?: string | null
  className?: string
}) {
  // A picture that 404s (deleted file, stale row) must fall back to initials
  // rather than showing a broken image. This is not hypothetical: avatar_path
  // survives a user being deleted from wwwroot, and the API has no cleanup job.
  const [failed, setFailed] = useState(false)
  const resolved = failed ? null : avatarUrl(src)
  const box = size === 'sm' ? 'h-7 w-7 text-[11px]' : 'h-9 w-9 text-xs'

  if (resolved) {
    return (
      <img
        src={resolved}
        alt=""
        // Decorative: the name is always rendered next to the avatar, so
        // announcing the image again just duplicates it for a screen reader.
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className={`inline-block shrink-0 rounded-md object-cover ${box} ${className}`}
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-purple-600 via-purple-500 to-purple-400 font-bold text-white ${box} ${className}`}
    >
      {initialsOf(name)}
    </span>
  )
}
