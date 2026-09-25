// Route table — Fan Hub Plus (React Router v7 data router: createBrowserRouter).
//
// Structure:
//   RootLayout (Header / Outlet / Breadcrumbs / Footer)
//   ├── public browsing routes
//   ├── auth routes (guest)
//   ├── authenticated routes   ← TODO(auth phase): wrap in RequireAuth
//   ├── admin/* nested routes  ← TODO(auth phase): wrap in RequireAuth + RequireAdmin
//   └── *                      ← Page Not Found
//
// Every route carries `handle: { title }`:
//   * renders the shared ComingSoon placeholder until the real page exists
//   * already feeds the Breadcrumbs component
// When a page is built, only its entry changes, e.g.:
//   { path: 'explorer', lazy: () => import('../pages/Explorer'), handle: { title: 'Explorer' } }
import { createBrowserRouter } from 'react-router-dom'
import RootLayout from '../components/layout/RootLayout'
import ComingSoon from '../components/common/ComingSoon'

// Builds a route entry that renders the shared ComingSoon placeholder.
const placeholder = (title: string) => ({
  element: <ComingSoon />,
  handle: { title },
})

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      // Landing page — real homepage (hero carousel, categories, content).
      {
        index: true,
        lazy: async () => ({ Component: (await import('../pages/Home')).default }),
        handle: { title: 'Home' },
      },

      // Auth (guest-oriented)
      { path: 'login', ...placeholder('Login') },
      { path: 'register', ...placeholder('Register') },
      { path: 'forgot-password', ...placeholder('Forgot Password') },
      { path: 'reset-password', ...placeholder('Reset Password') },

      // Public browsing
      { path: 'explorer', ...placeholder('Explorer') },
      // Paths used by the sidebar nav (Explore + category pages).
      { path: 'explore', ...placeholder('Explorer') },
      { path: 'category/:slug', ...placeholder('Category') },
      { path: 'content/:id', ...placeholder('Content Detail') },
      { path: 'characters', ...placeholder('Characters') },
      { path: 'characters/:id', ...placeholder('Character Detail') },
      { path: 'articles', ...placeholder('Articles') },
      { path: 'articles/:id', ...placeholder('Article Detail') },
      { path: 'merchandise', ...placeholder('Merchandise') },
      { path: 'events', ...placeholder('Events') },
      { path: 'feedback', ...placeholder('Feedback') },

      // Authenticated — TODO(auth phase): wrap each in RequireAuth guard.
      { path: 'dashboard', lazy: async () => ({ Component: (await import('../pages/Dashboard')).default }), handle: { title: 'Dashboard' } },
      { path: 'bookmarks', ...placeholder('Bookmarks') },
      { path: 'profile', ...placeholder('Profile') },

      // Admin panel — TODO(auth phase): wrap in RequireAuth + RequireAdmin guard.
      {
        path: 'admin',
        children: [
          { index: true, ...placeholder('Admin Dashboard') },
          { path: 'content', ...placeholder('Admin · Content Manager') },
          { path: 'users', ...placeholder('Admin · User Manager') },
          { path: 'feedback', ...placeholder('Admin · Feedback Moderator') },
          { path: 'submissions', ...placeholder('Admin · Submissions') },
          { path: 'stats', ...placeholder('Admin · Statistics') },
        ],
      },

      // Catch-all 404.
      { path: '*', ...placeholder('Page Not Found') },
    ],
  },
])
