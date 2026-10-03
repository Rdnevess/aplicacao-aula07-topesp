import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

/** Telas de login e cadastro: quem já está logado vai para /app. */
export function GuestRoute() {
  const accessToken = useAuthStore((state) => state.accessToken)
  if (accessToken) return <Navigate to="/app" replace />
  return <Outlet />
}
