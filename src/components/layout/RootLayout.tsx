// RootLayout — the route shell every page renders through.
// Header (sticky) / Sidebar / Breadcrumbs / Footer are layout components.
//
// The sidebar's open/closed state lives HERE rather than inside Sidebar,
// because three separate things need to drive it: the header's hamburger
// button, the mobile scrim, and the sidebar's own close button. Lifting it
// up means one source of truth instead of prop-drilling through the header.
import { Outlet } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'
import Breadcrumbs from './Breadcrumbs'
import Footer from './Footer'
import ScrollToTop from './ScrollToTop'
import { useSidebar } from '../../hooks/useSidebar'

export default function RootLayout() {
  const { isOpen, isDesktop, toggle, close } = useSidebar()

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      {/* Sits above the page so any navigation starts at the top. */}
      <ScrollToTop />

      <Header onToggleSidebar={toggle} sidebarOpen={isOpen} />

      <div className="flex flex-1">
        <Sidebar isOpen={isOpen} isDesktop={isDesktop} onClose={close} />

        {/* The content column. On desktop it gets a left margin equal to the
            sidebar width, so opening the sidebar PUSHES the page rather than
            covering it. Below md there's no margin — the sidebar overlays. */}
        <div
          className={`flex min-w-0 flex-1 flex-col transition-[margin] duration-300 ease-out ${
            isOpen && isDesktop ? 'md:ml-60' : 'md:ml-0'
          }`}
        >
          <Breadcrumbs />
          <main className="flex-1">
            <Outlet />
          </main>
          <Footer />
        </div>
      </div>

      {/* Scrim — mobile only. Tapping anywhere outside the open drawer
          dismisses it. `aria-hidden` because Escape is the keyboard
          equivalent and the button would be redundant to screen readers. */}
      {!isDesktop && isOpen && (
        <button
          type="button"
          onClick={close}
          aria-hidden="true"
          tabIndex={-1}
          className="fixed inset-0 z-40 cursor-default bg-black/50 backdrop-blur-sm md:hidden"
        />
      )}
    </div>
  )
}
