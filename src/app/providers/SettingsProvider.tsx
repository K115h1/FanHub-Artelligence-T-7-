// SettingsProvider — the visitor's preferences, persisted to localStorage.
//
// Two of these settings have to reach outside React to take effect, which is
// why they live in a provider rather than in the Settings page:
//   • fontScale  → written to a CSS custom property on <html>, so every
//                  rem-based size in the app scales with it.
//   • reduceMotion → written to a `data-reduce-motion` attribute on <html>,
//                  which index.css keys off to neutralise animations.
// Both are read by CSS, not by components, so they must be applied to the
// document rather than passed down as props.
//
// Everything else is read through useSettings() by whichever component needs it
// (the hero reads carouselAutoplay, the profile page writes everything).
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { SettingsContext } from '../../context/SettingsContext'
import {
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  type UserSettings,
} from '../../types/models'

// Reads the saved blob. Storage can be blocked (private mode) → fall back to
// defaults rather than crashing. Unknown or missing keys are filled from the
// defaults so a blob written by an older version of the app still loads.
function readStorage(): UserSettings {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) ?? '{}')
    if (parsed && typeof parsed === 'object') {
      return { ...DEFAULT_SETTINGS, ...(parsed as Partial<UserSettings>) }
    }
  } catch {
    // fall through to defaults
  }
  return DEFAULT_SETTINGS
}

export default function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(readStorage)

  // Persist on every change.
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
    } catch {
      // Ignore storage failures — the in-memory settings still work.
    }
  }, [settings])

  // Font scale → a custom property on <html>, read by index.css.
  useEffect(() => {
    document.documentElement.style.setProperty('--app-font-scale', String(settings.fontScale))
  }, [settings.fontScale])

  // Reduce motion → an attribute on <html>, read by index.css.
  useEffect(() => {
    document.documentElement.toggleAttribute('data-reduce-motion', settings.reduceMotion)
  }, [settings.reduceMotion])

  const updateSettings = useCallback((patch: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
  }, [])

  const resetSettings = useCallback(() => setSettings(DEFAULT_SETTINGS), [])

  const setFontScale = useCallback((scale: number) => {
    setSettings((prev) => ({ ...prev, fontScale: scale }))
  }, [])

  const toggleCarouselAutoplay = useCallback(() => {
    setSettings((prev) => ({ ...prev, carouselAutoplay: !prev.carouselAutoplay }))
  }, [])

  // Memoised so consumers don't re-render on every provider render.
  const value = useMemo(
    () => ({ settings, updateSettings, resetSettings, setFontScale, toggleCarouselAutoplay }),
    [settings, updateSettings, resetSettings, setFontScale, toggleCarouselAutoplay],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}
