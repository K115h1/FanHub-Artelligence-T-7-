// AdminRoutes - the lazily-loaded entry point for everything under /admin, so
// the panel's code is only fetched when an administrator navigates here. The gate
// is outermost so a non-admin never mounts the provider or loads the data; it is
// a UX affordance, not the security boundary (the endpoints are
// [Authorize(Roles = "admin")] server-side).

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
