// Header — full-width sticky top bar for Fan Hub Plus.
//
// "Casual premium" glass style:
//   • transparent while you're at the very top of the page
//   • fades into a translucent, blurred (frosted-glass) bar once you scroll
//   • white glass in light mode / black glass in dark mode, purple accents
//
// The scroll detection is done with GSAP ScrollTrigger (already in package.json).
import { useState } from 'react'
import { Search } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

// Register the GSAP plugins once, before we use them.
gsap.registerPlugin(ScrollTrigger, useGSAP)

export default function Header() {
  // True once the page has been scrolled past 50px.
  // This single flag turns the frosted-glass background on/off below.
  const [scrolled, setScrolled] = useState(false)

  // ScrollTrigger watches the scrollbar for us and reports the scroll
  // position on every update + refresh, so `scrolled` always matches
  // reality — even if the page loads halfway down or its height changes.
  // useGSAP automatically kills the trigger when the component unmounts,
  // so there's no manual cleanup to worry about.
  useGSAP(() => {
    // Helper: the glass only belongs on when we're past 50px.
    const syncGlass = (self: ScrollTrigger) => setScrolled(self.scroll() > 50)

    ScrollTrigger.create({
      start: 0, // watch the page from the very top...
      end: 999999, // ...far past the bottom, so it stays active on ANY page,
      // even a short one whose height changes later (lazy content, etc.)
      onUpdate: syncGlass, // fires on every scroll → turn glass on/off
      onRefresh: syncGlass, // fires on load/resize → correct initial state
    })
  })

  return (
    <header
      // The header itself spans the full width of the screen.
      // When `scrolled` flips on, it grows a translucent color + backdrop blur.
      className={`sticky top-0 z-50 w-full border-b transition-all duration-300 ${
        scrolled
          ? 'border-purple-500/20 bg-white/70 shadow-lg shadow-black/5 backdrop-blur-xl dark:bg-black/60'
          : 'border-transparent bg-transparent'
      }`}
    >
      {/* Inner row: content stays centered in a max-width container so the
          layout never looks stretched on wide monitors. */}
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        {/* Logo */}
        <a
          href="/"
          className="shrink-0 text-lg font-bold tracking-tight text-black dark:text-white sm:text-xl"
        >
          Fan Hub <span className="text-purple-600 dark:text-purple-400">Plus</span>
        </a>

        {/* Right-hand controls */}
        <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
          {/* Search */}
          <div className="lg:w-4xl flex items-center justify-center border border-purple-500/80 px-4 hover:border-purple-500 hover:text-purple-600 dark:text-white/60 dark:hover:border-purple-400 dark:hover:text-purple-400 rounded-4xl">
            <input type="text" className="w-full border-0" />
            <button
              aria-label="Search"
              className="flex h-8 w-8 items-center justify-center rounded-full text-black/60 transition sm:h-9 sm:w-9"
            >
              <Search size={16} />
            </button>
          </div>

          {/* Font-size control (wired up in a later phase) */}
          <div className="hidden items-center gap-1 rounded-full border border-purple-500/30 px-2 py-1.5 transition hover:border-purple-500 sm:flex">
            <span className="px-1 text-xs text-black/70 dark:text-white/70">A-</span>
            <span className="h-5 w-px bg-purple-500/30" />
            <span className="px-1 text-base font-medium text-black/70 dark:text-white/70">A+</span>
          </div>

          {/* Login */}
          <button className="rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-purple-600/30 transition hover:from-purple-500 hover:to-purple-400 sm:text-base">
            Login
          </button>
        </div>
      </div>
    </header>
  )
}
