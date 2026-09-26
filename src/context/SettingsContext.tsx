// SettingsContext — the visitor's preferences. State and persistence live in
// app/providers/SettingsProvider.tsx.
//
// Theme is deliberately not in here: ThemeProvider already owns the `.dark`
// class on <html>, and merging them would leave two providers writing it.
import { createContext, useContext } from 'react'
import { DEFAULT_SETTINGS, type UserSettings } from '../types/models'

export interface SettingsContextValue {
  settings: UserSettings
  /** Merge a partial change, e.g. updateSettings({ carouselAutoplay: false }). */
  updateSettings: (patch: Partial<UserSettings>) => void
  resetSettings: () => void
  setFontScale: (scale: number) => void
  toggleCarouselAutoplay: () => void
}

// Defaulted to real values so components rendered outside the provider still work.
export const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {},
  resetSettings: () => {},
  setFontScale: () => {},
  toggleCarouselAutoplay: () => {},
})

// Convenience hook: const { settings, updateSettings } = useSettings()
export const useSettings = () => useContext(SettingsContext)
