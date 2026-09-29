// FontSizeControl, the A− / A+ pair in the header.
//
// Applies a scale factor to html element as --app-font-scale (see index.css), which
// every text size is derived from, so one control resizes the whole app rather
// than just the header. The chosen step is persisted by SettingsProvider.
//
// Four steps, not a free slider: a coarse step is easier to hit repeatedly and
// the range stays inside what still fits the layout.

import { useSettings } from '../../context/SettingsContext'

/** Allowed steps, smallest first. 1 is the default. */
export const FONT_STEPS = [0.9, 1, 1.1, 1.2] as const

export function FontSizeControl({ className = '' }: { className?: string }) {
  const { settings, setFontScale } = useSettings()
  // A scale persisted by an older build may not be one of the four steps, so
  // fall back to 1 rather than indexing off the end. Resolving the step first
  // also narrows the type, which indexOf needs.
  const current = FONT_STEPS.find((step) => step === settings.fontScale) ?? 1
  const index = FONT_STEPS.indexOf(current)

  const atMin = index <= 0
  const atMax = index >= FONT_STEPS.length - 1
  const percent = Math.round(settings.fontScale * 100)

  function step(delta: number) {
    const next = FONT_STEPS[index + delta]
    if (next !== undefined) setFontScale(next)
  }

  return (
    <div
      className={`flex shrink-0 items-center gap-0.5 rounded-full border border-line bg-surface/60 px-1 py-0.5 ${className}`}
      // One group, so a screen reader announces the buttons as a set.
      role="group"
      aria-label="Text size"
    >
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={atMin}
        aria-label="Decrease text size"
        className="rounded-full px-1.5 py-0.5 text-xs leading-none font-semibold text-ink-muted transition hover:bg-accent-soft hover:text-accent disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-ink-muted"
      >
        A−
      </button>

      <span
        aria-hidden="true"
        className="h-4 w-px shrink-0 bg-line"
      />

      <button
        type="button"
        onClick={() => step(1)}
        disabled={atMax}
        aria-label="Increase text size"
        className="rounded-full px-1.5 py-0.5 text-sm leading-none font-bold text-ink-muted transition hover:bg-accent-soft hover:text-accent disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-ink-muted"
      >
        A+
      </button>

      {/* Announces the current size without adding a visible percentage. */}
      <span className="sr-only" role="status">
        Text size {percent} percent
      </span>
    </div>
  )
}
