import { Card } from '../components/ui/Card'
import { useAuthStore } from '../store/authStore'

export function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  return (
    <Card>
      <h1 className="text-lg font-semibold text-slate-900">Olá, {user?.name}</h1>
      <p className="mt-1 text-sm text-slate-500">O envio de áudio chega na próxima etapa.</p>
    </Card>
  )
}
