import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Navigate, Outlet } from 'react-router-dom'
import { authApi } from '../../services/api'
import { useAuthStore } from '../../store/authStore'

/** Exige sessão. Ao abrir o app com token salvo, confirma o usuário em /auth/me. */
export function ProtectedRoute() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const setUser = useAuthStore((state) => state.setUser)
  const { data } = useQuery({
    queryKey: ['me'],
    queryFn: authApi.me,
    enabled: !!accessToken,
    staleTime: Infinity,
  })

  useEffect(() => {
    if (data) setUser(data)
  }, [data, setUser])

  if (!accessToken) return <Navigate to="/entrar" replace />
  return <Outlet />
}
