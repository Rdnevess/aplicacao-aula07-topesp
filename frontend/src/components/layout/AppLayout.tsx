import { useQueryClient } from '@tanstack/react-query'
import { AudioLines, LogOut, Shield } from 'lucide-react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { Button } from '../ui/Button'
import { buttonClasses } from '../ui/button-classes'

export function AppLayout() {
  const user = useAuthStore((state) => state.user)
  const clearSession = useAuthStore((state) => state.clearSession)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  function logout() {
    clearSession()
    // Não deixar dados do usuário anterior no cache.
    queryClient.clear()
    navigate('/entrar', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link to="/app" className="flex items-center gap-2 font-semibold text-slate-900">
            <AudioLines className="size-5 text-indigo-600" />
            Ditado
          </Link>
          <nav className="flex items-center gap-1">
            {user?.role === 'admin' && (
              <NavLink to="/app/admin" className={buttonClasses('ghost')}>
                <Shield className="size-4" />
                <span className="hidden sm:inline">Administração</span>
              </NavLink>
            )}
            <span className="hidden px-2 text-sm text-slate-500 sm:inline">{user?.name}</span>
            <Button variant="ghost" onClick={logout}>
              <LogOut className="size-4" />
              Sair
            </Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
