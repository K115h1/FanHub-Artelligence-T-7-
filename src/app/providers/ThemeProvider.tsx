// ThemeProvider — dark-mode state for the whole app.
// Business logic: theme choice + font-scale (SRS accessibility), persisted to
// localStorage, applied by toggling the `.dark` class on <html>.
// (Tailwind's `dark:` variant reads that class — see src/index.css.)
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { ThemeContext, type Theme } from '../../context/ThemeContext'

const STORAGE_KEY = 'fanhub-theme' // localStorage key for the saved choice

// Reads the saved theme; falls back to the OS preference, then to light.
function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // localStorage can be blocked (private mode) — just fall through.
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)

  // Every time the theme changes: paint <html> and remember the choice.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // Ignore storage failures — the in-memory theme still works.
    }
  }, [theme])

  const setTheme = useCallback((next: Theme) => setThemeState(next), [])
  const toggleTheme = useCallback(
    () => setThemeState((current) => (current === 'dark' ? 'light' : 'dark')),
    [],
  )

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
