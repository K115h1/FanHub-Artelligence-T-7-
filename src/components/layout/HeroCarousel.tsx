// HeroCarousel — the homepage banner.
//
// A single artwork track that slides horizontally: every slide is a full-width
// panel, and the TRACK is translated by -index * 100% so exactly one panel is
// in view. Only the track moves — the panels themselves never re-render or
// remount, which is why the transition is smooth rather than a cross-fade.
//
// There are deliberately NO arrows, dots or pause button. The banner advances
// on its own; the visitor's only interaction is the link inside each slide.
// (If controls are ever wanted back, they should sit OUTSIDE the track so
// they don't slide along with it.)
//
// Details worth keeping:
//   • Every slide carries its OWN copy (kicker / title / blurb). The reference
//     design used one static overlay for all three, so slides 2 and 3 were
//     just wallpaper swaps.
//   • Autoplay halts on hover, when the tab is hidden, when the visitor has
//     turned autoplay off in Profile → Settings, and for anyone who asked the
//     OS for reduced motion.
//   • Artwork is a generated gradient wash rather than a remote image, so the
//     page has no network dependency.
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { SLIDES } from '../../lib/mockData'
import { useSettings } from '../../context/SettingsContext'

// Autoplay interval in ms.
const ROTATE_MS = 6000

// Must match the `duration-*` on the track below, so JS timing and the CSS
// transition stay in step.
const SLIDE_MS = 700

export default function HeroCarousel() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const total = SLIDES.length

  // The visitor's autoplay preference (Profile → Settings). This is the only
  // way to stop the carousel now that its arrows and dots are gone, so it has
  // to be honoured here.
  const { settings } = useSettings()
  const autoplay = settings.carouselAutoplay

  const goNext = useCallback(() => setIndex((i) => (i + 1) % total), [total])

  // Autoplay — halts while hovered, while the tab is hidden, when the
  // autoplay setting is off, and for anyone who asked for reduced motion.
  useEffect(() => {
    if (!autoplay || paused) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (document.documentElement.hasAttribute('data-reduce-motion')) return

    // A backgrounded tab shouldn't keep advancing the carousel.
    const onVisibility = () => {
      if (document.hidden) setPaused(true)
    }
    document.addEventListener('visibilitychange', onVisibility)

    const timer = setInterval(goNext, ROTATE_MS)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [autoplay, paused, goNext])

  return (
    <section
      aria-label="Highlights"
      aria-roledescription="carousel"
      className="relative h-[340px] overflow-hidden rounded-xl border border-line sm:h-[380px] lg:h-[420px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* The track. `w-full shrink-0` on each panel makes the row exactly
          total*100% wide, so translating by -index*100% lands a panel edge on
          the viewport edge with no offset maths. */}
      <div
        className="flex h-full w-full transition-transform ease-out"
        style={{
          transform: `translateX(-${index * 100}%)`,
          transitionDuration: `${SLIDE_MS}ms`,
        }}
      >
        {SLIDES.map((slide) => (
          // Each panel is position:relative so its own scrim and copy stack
          // against it, independent of the track.
          <div key={slide.id} className="relative w-full shrink-0 overflow-hidden">
            {/* Artwork: the purple wash, hue-shifted per slide so each one
                reads as a distinct frame. */}
            <div
              aria-hidden="true"
              className="accent-wash absolute inset-0"
              style={{ filter: `hue-rotate(${(slide.id - 1) * 18}deg)` }}
            />
            {/* Left-weighted scrim — keeps the white text legible over the
                artwork at every viewport width. */}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent"
            />

            <div className="relative flex h-full max-w-xl flex-col justify-center gap-3 p-6 sm:p-10 lg:p-12">
              <p className="text-xs font-semibold tracking-[0.25em] text-white/70 uppercase">
                {slide.kicker}
              </p>
              <h1 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
                {slide.title}
              </h1>
              <p className="max-w-lg text-sm leading-relaxed text-white/80 sm:text-base">
                {slide.blurb}
              </p>
              <div className="mt-2">
                <Link
                  to="/explore"
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-purple-700 shadow-lg shadow-black/20 transition hover:bg-purple-50"
                >
                  Explore Now <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
