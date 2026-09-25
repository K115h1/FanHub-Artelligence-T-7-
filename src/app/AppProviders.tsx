// App wiring — providers mounted around the router.
// Future slots (added later, no router changes needed):
//   TODO(theme phase): <ThemeProvider>
//   TODO(auth phase):  <AuthProvider>
import { RouterProvider } from 'react-router-dom'
import { router } from './router'

export default function AppProviders() {
  return <RouterProvider router={router} />
}
