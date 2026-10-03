import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

/** Conforto de interface: quem decide de verdade é o backend (403). */
export function AdminRoute() {
  const role = useAuthStore((state) => state.user?.role)
  if (role !== 'admin') return <Navigate to="/app" replace />
  return <Outlet />
}
