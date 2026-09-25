// ThemeContext — carries the current theme across the app.
// Provides: theme ('light' | 'dark'), setTheme(), toggleTheme().
// Backs the SRS dark-mode toggle (the switch lives in the sidebar).
// The real state + persistence lives in src/app/providers/ThemeProvider.tsx.
import { createContext, useContext } from 'react'

export type Theme = 'light' | 'dark'

export interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

// Default value only matters if someone renders UI outside <ThemeProvider>.
export const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
})

// Convenience hook: const { theme, toggleTheme } = useTheme()
export const useTheme = () => useContext(ThemeContext)
