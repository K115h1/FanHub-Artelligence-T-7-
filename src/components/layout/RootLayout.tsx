// RootLayout — the route shell every page renders through.
// Header (sticky) / Sidebar / Breadcrumbs / Footer are layout-phase components;
// no router changes needed when their content evolves.
import { Outlet } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'
import Breadcrumbs from './Breadcrumbs'
import Footer from './Footer'

export default function RootLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      {/* Sidebar sits beside the page content (hidden below lg; user swaps in theirs) */}
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Breadcrumbs />
          <main className="flex-1">
            <Outlet />
          </main>
          <Footer />
        </div>
      </div>
    </div>
  )
}
