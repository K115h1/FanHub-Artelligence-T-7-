// AdminRoutes — the lazily-loaded entry point for everything under /admin.
//
// Composed as one route element so the panel's code is only fetched when an
// administrator navigates here. Order is deliberate: the gate is outermost so a
// non-admin never causes the provider to mount or the data to load.
//
// The gate reads the role off the signed-in account, but it is a UX affordance
// and not the security boundary — every /admin endpoint is [Authorize(Roles =
// "admin")] on the server, so bypassing this in the console buys nothing.

import { useLocation } from 'react-router-dom'
import AdminLayout from '../components/admin/AdminLayout'
import { AdminDataProvider } from '../features/admin/AdminDataProvider'
import { AdminGate, useAdminGate } from './RequireAdmin'

export default function AdminRoutes() {
  const { pathname, search } = useLocation()
  const gate = useAdminGate(pathname, search)

  return (
    <AdminGate state={gate}>
      <AdminDataProvider>
        <AdminLayout />
      </AdminDataProvider>
    </AdminGate>
  )
}
