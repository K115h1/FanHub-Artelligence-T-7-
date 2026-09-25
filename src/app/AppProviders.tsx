// App wiring — providers mounted around the router.
// Future slots (added later, no router changes needed):
//   TODO(auth phase):  <AuthProvider>
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import ThemeProvider from './providers/ThemeProvider'

export default function AppProviders() {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  )
}
