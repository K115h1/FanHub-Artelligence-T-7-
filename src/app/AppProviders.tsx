// App wiring, providers mounted around the router.
//
// Order matters: SettingsProvider is outside AuthProvider only for readability,
// it has no dependency on auth. ThemeProvider stays outermost because it owns
// the `.dark` class on html element that everything else reads.
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import ThemeProvider from './providers/ThemeProvider'
import SettingsProvider from './providers/SettingsProvider'
import AuthProvider from './providers/AuthProvider'
import BookmarksProvider from './providers/BookmarksProvider'
import RatingsProvider from './providers/RatingsProvider'

export default function AppProviders() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        {/* Bookmarks and ratings are scoped to the account, so they sit
            inside AuthProvider. */}
        <AuthProvider>
          <BookmarksProvider>
            <RatingsProvider>
              <RouterProvider router={router} />
            </RatingsProvider>
          </BookmarksProvider>
        </AuthProvider>
      </SettingsProvider>
    </ThemeProvider>
  )
}
