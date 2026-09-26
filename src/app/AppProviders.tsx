// App wiring — providers mounted around the router.
//
// Order matters: SettingsProvider is outside AuthProvider only for readability,
// it has no dependency on auth. ThemeProvider stays outermost because it owns
// the `.dark` class on <html> that everything else reads.
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import ThemeProvider from './providers/ThemeProvider'
import SettingsProvider from './providers/SettingsProvider'
import AuthProvider from './providers/AuthProvider'

export default function AppProviders() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </SettingsProvider>
    </ThemeProvider>
  )
}
