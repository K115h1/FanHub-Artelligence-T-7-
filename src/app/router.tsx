// Route table (React Router v7 data router). Everything renders inside
// RootLayout; the members-only branch is wrapped in RequireAuth.
//
// Every route carries `handle: { title }` for the Breadcrumbs bar. Unbuilt
// routes use `placeholder(title)`, so building a page means swapping that for
// a `lazy` import.
import { createBrowserRouter } from 'react-router-dom'
import RootLayout from '../components/layout/RootLayout'
import ComingSoon from '../components/common/ComingSoon'
import { RouteFallback } from '../components/common/skeletons'
import RouteBootFailure from '../components/common/RouteBootFailure'
import RequireAuth from '../components/auth/RequireAuth'

// Route entry for a page that hasn't been built yet.
const placeholder = (title: string) => ({
  element: <ComingSoon />,
  handle: { title },
})

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    // Rendered while the FIRST route's lazy chunk downloads. Without this the
    // router has nothing to paint on a cold load and the page stays blank until
    // the chunk lands — it also logs "No HydrateFallback element provided".
    // Only the initial load uses this; later navigations keep the current page
    // on screen while the next chunk arrives, which is the behaviour we want.
    HydrateFallback: RouteFallback,
    // The app had no error boundary at all before this. A failed dynamic import
    // is the most likely thing to throw here — a visitor who left the tab open
    // across a deploy gets a chunk request for a file that no longer exists —
    // and without this the router unmounts to a blank page. The root route is
    // the right place because it also covers a bad route config, which happens
    // before any child could handle it.
    errorElement: <RouteBootFailure />,
    children: [
      // Landing page.
      {
        index: true,
        lazy: async () => ({ Component: (await import('../pages/Home')).default }),
        handle: { title: 'Home' },
      },

      // Auth
      {
        path: 'login',
        lazy: async () => ({ Component: (await import('../pages/Login')).default }),
        handle: { title: 'Login' },
      },
      { path: 'register', lazy: async () => ({ Component: (await import('../pages/Register')).default }), handle: { title: 'Register' } },
      // The tokenized email flows. All three are public — a member following a
      // link from their inbox is by definition not signed in yet.
      {
        path: 'forgot-password',
        lazy: async () => ({ Component: (await import('../pages/ForgotPassword')).default }),
        handle: { title: 'Forgot Password' },
      },
      {
        path: 'reset-password',
        lazy: async () => ({ Component: (await import('../pages/ResetPassword')).default }),
        handle: { title: 'Reset Password' },
      },
      {
        path: 'verify-email',
        lazy: async () => ({ Component: (await import('../pages/VerifyEmail')).default }),
        handle: { title: 'Verify Email' },
      },

      // Public browsing
      { path: 'explorer', ...placeholder('Explorer') },
      { path: 'explore', lazy: async () => ({ Component: (await import('../pages/Explorer')).default }), handle: { title: 'Explore' } },
      // Public deliberately: a privacy policy behind a login isn't one.
      { path: 'privacy', lazy: async () => ({ Component: (await import('../pages/Privacy')).default }), handle: { title: 'Privacy Policy' } },
      { path: 'feedback', lazy: async () => ({ Component: (await import('../pages/Feedback')).default }), handle: { title: 'Feedback' } },

      // Members-only. RequireAuth shows the login popup instead of the page.
      {
        element: <RequireAuth />,
        children: [
          // Fed by the per-category hashmaps in mockData.
          {
            path: 'category/:slug',
            lazy: async () => ({ Component: (await import('../pages/Category')).default }),
            handle: { title: 'Category' },
          },
          { path: 'content/:slug', lazy: async () => ({ Component: (await import('../pages/ContentDetail')).default }), handle: { title: 'Content' } },
          { path: 'characters', ...placeholder('Characters') },
          { path: 'characters/:id', ...placeholder('Character Detail') },
          { path: 'articles', lazy: async () => ({ Component: (await import('../pages/Articles')).default }), handle: { title: 'Articles' } },
          { path: 'articles/:id', lazy: async () => ({ Component: (await import('../pages/ArticleDetail')).default }), handle: { title: 'Article' } },
          { path: 'merchandise', lazy: async () => ({ Component: (await import('../pages/Merchandise')).default }), handle: { title: 'Merchandise' } },
          { path: 'events', lazy: async () => ({ Component: (await import('../pages/Events')).default }), handle: { title: 'Events' } },
          { path: 'events/:id', lazy: async () => ({ Component: (await import('../pages/EventDetail')).default }), handle: { title: 'Event' } },

          // Account area
          { path: 'dashboard', lazy: async () => ({ Component: (await import('../pages/Dashboard')).default }), handle: { title: 'Dashboard' } },
          { path: 'bookmarks', lazy: async () => ({ Component: (await import('../pages/Bookmarks')).default }), handle: { title: 'Bookmarks' } },
          { path: 'profile', lazy: async () => ({ Component: (await import('../pages/Profile')).default }), handle: { title: 'Profile' } },

        ],
      },

      // 404
      { path: '*', ...placeholder('Page Not Found') },
    ],
  },

  // Admin control panel — a SIBLING of the site route, not a child of it, so it
  // does not inherit the public Header/Sidebar/Footer. AdminLayout supplies its
  // own chrome and AdminRoutes owns the role gate, so this branch is not also
  // wrapped in RequireAuth: the gate shows its own sign-in prompt instead.
  {
    path: '/admin',
    lazy: async () => ({ Component: (await import('../routes/AdminRoutes')).default }),
    handle: { title: 'Admin' },
    children: [
      { index: true, lazy: async () => ({ Component: (await import('../pages/admin/AdminDashboard')).default }), handle: { title: 'Admin · Overview' } },
      { path: 'content', lazy: async () => ({ Component: (await import('../pages/admin/ContentManager')).default }), handle: { title: 'Admin · Content' } },
      { path: 'users', lazy: async () => ({ Component: (await import('../pages/admin/UserManager')).default }), handle: { title: 'Admin · Users' } },
      { path: 'feedback', lazy: async () => ({ Component: (await import('../pages/admin/FeedbackModerator')).default }), handle: { title: 'Admin · Feedback' } },
      { path: 'submissions', lazy: async () => ({ Component: (await import('../pages/admin/Submissions')).default }), handle: { title: 'Admin · Submissions' } },
      { path: 'stats', lazy: async () => ({ Component: (await import('../pages/admin/Stats')).default }), handle: { title: 'Admin · Statistics' } },
    ],
  },
])
