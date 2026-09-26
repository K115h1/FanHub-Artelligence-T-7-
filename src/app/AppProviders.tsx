// App wiring — providers mounted around the router.
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import ThemeProvider from './providers/ThemeProvider'
import AuthProvider from './providers/AuthProvider'

export default function AppProviders() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  )
}
