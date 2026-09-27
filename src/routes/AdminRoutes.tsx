// AdminRoutes — the lazily-loaded entry point for everything under /admin.
//
// Composed as one route element so the 2,490-title catalogue is only fetched
// when an administrator navigates here, instead of sitting in the main bundle
// for every visitor. Order is deliberate: the gate is outermost so a
// non-admin never causes the provider to mount or the data to load.

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
