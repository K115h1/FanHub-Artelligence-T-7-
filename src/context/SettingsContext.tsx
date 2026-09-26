// SettingsContext — carries the visitor's preferences across the app.
//
// Provides: settings, updateSettings, resetSettings, setFontScale, toggle…
// The real state + persistence lives in app/providers/SettingsProvider.tsx.
//
// Kept separate from ThemeContext on purpose: the theme is one setting, and it
// already has its own provider that owns the `.dark` class on <html>. Folding
// theme in here would mean two providers fighting over the same class.
import { createContext, useContext } from 'react'
import { DEFAULT_SETTINGS, type UserSettings } from '../types/models'

export interface SettingsContextValue {
  settings: UserSettings
  /** Merge a partial change, e.g. updateSettings({ carouselAutoplay: false }). */
  updateSettings: (patch: Partial<UserSettings>) => void
  resetSettings: () => void
  setFontScale: (scale: number) => void
  /** Convenience wrapper so callers don't repeat the field name. */
  toggleCarouselAutoplay: () => void
}

// The default is the real DEFAULT_SETTINGS rather than an empty object, so a
// component rendered outside the provider still gets usable values.
export const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {},
  resetSettings: () => {},
  setFontScale: () => {},
  toggleCarouselAutoplay: () => {},
})

// Convenience hook: const { settings, updateSettings } = useSettings()
export const useSettings = () => useContext(SettingsContext)
