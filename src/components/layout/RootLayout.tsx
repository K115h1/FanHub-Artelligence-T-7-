// RootLayout — the route shell every page renders through.
// Header / Breadcrumbs / Footer are placeholder components for now; they get
// real content in the layout phase WITHOUT touching src/app/router.tsx.
import { Outlet } from 'react-router-dom'
import Header from './Header'
import Breadcrumbs from './Breadcrumbs'
import Footer from './Footer'

export default function RootLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <Breadcrumbs />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
