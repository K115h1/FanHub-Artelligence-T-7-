// PosterThumb, renders a title's poster, or the app's own placeholder.
//
// The catalogue carries a posterPath for 2,696 of 2,934 titles, but the rest
// have none and a delivered file can still fail to load, so the placeholder is
// not dead code: it is the normal state for roughly one title in eight. The
// purple wash and media glyph are kept as the background *underneath* the image
// rather than as a separate branch, which means there is no flash of empty
// space while the poster loads and no layout shift when it arrives.
//
// Aspect ratio is deliberately not read from the file. The delivery mixes
// portrait posters, squares and 16:9 stills, so every thumb is cropped to one
// fixed ratio with object-cover. A grid where each tile keeps its own shape
// reads as broken; a uniform crop reads as a poster wall.
import { useState } from 'react'
import { Film } from 'lucide-react'

const RATIO_CLASS = 'aspect-[2/3]'

export default function PosterThumb({
  posterPath,
  title,
  className = '',
  size = 'md',
}: {
  posterPath: string | null | undefined
  title: string
  className?: string
  size?: 'sm' | 'md'
}) {
  // Only fall back on a genuine load failure. Once an image has errored we stop
  // rendering it, otherwise a broken path would retry on every re-render.
  const [failed, setFailed] = useState(false)
  const showImage = Boolean(posterPath) && !failed

  const glyph = size === 'sm' ? 'h-5 w-5' : 'h-8 w-8'

  return (
    <div
      className={`relative overflow-hidden bg-surface-sunken ${RATIO_CLASS} ${className}`}
    >
      {/* Placeholder sits underneath, so it shows through until the poster
          decodes and remains if it never does. */}
      <div aria-hidden="true" className="accent-wash absolute inset-0 opacity-85" />
      <Film
        aria-hidden="true"
        className={`absolute inset-0 m-auto ${glyph} text-white/25`}
        strokeWidth={1.25}
      />

      {showImage && (
        <img
          src={posterPath as string}
          alt={`${title} poster`}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  )
}
