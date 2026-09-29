// SettingsProvider, the visitor's preferences, persisted to localStorage.
//
// fontScale and reduceMotion are applied to html element rather than passed down as
// props, because index.css is what reads them. Everything else goes through
// useSettings() (the hero reads carouselAutoplay; the profile page writes).
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { SettingsContext } from '../../context/SettingsContext'
import {
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  type UserSettings,
} from '../../types/models'

// Falls back to defaults if storage is blocked (private mode), and fills in
// missing keys so a blob written by an older build still loads.
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
      // Ignore storage failures, the in-memory settings still work.
    }
  }, [settings])

  // Font scale → a custom property on html element, read by index.css.
  useEffect(() => {
    document.documentElement.style.setProperty('--app-font-scale', String(settings.fontScale))
  }, [settings.fontScale])

  // Reduce motion → an attribute on html element, read by index.css.
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
