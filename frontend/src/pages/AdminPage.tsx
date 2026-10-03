import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { formatDate } from '../lib/format'
import { getErrorMessage, usersApi } from '../services/api'
import { useAuthStore } from '../store/authStore'
import type { UserUpdate } from '../types'

function Badge({ tone, children }: { tone: 'indigo' | 'slate' | 'green' | 'red'; children: string }) {
  const tones = {
    indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    slate: 'bg-slate-50 text-slate-700 ring-slate-200',
    green: 'bg-green-50 text-green-700 ring-green-200',
    red: 'bg-red-50 text-red-700 ring-red-200',
  }
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${tones[tone]}`}>{children}</span>
}

export function AdminPage() {
  const currentUserId = useAuthStore((state) => state.user?.id)
  const queryClient = useQueryClient()
  const { data, isPending, isError, error } = useQuery({ queryKey: ['users'], queryFn: usersApi.list })

  const update = useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: UserUpdate }) => usersApi.update(id, changes),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['users'] }),
  })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Administração</h1>
        <p className="mt-1 text-sm text-slate-500">Papéis e status das contas. Sua própria conta não pode ser alterada aqui.</p>
      </div>

      {update.isError && <Alert>{getErrorMessage(update.error)}</Alert>}
      {isPending && <p className="text-sm text-slate-500">Carregando…</p>}
      {isError && <Alert>{getErrorMessage(error)}</Alert>}

      {data && (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Papel</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Desde</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.map((user) => {
                const isSelf = user.id === currentUserId
                const disabled = isSelf || update.isPending
                return (
                  <tr key={user.id} className={user.active ? '' : 'text-slate-400'}>
                    <td className="whitespace-nowrap px-4 py-3 font-medium">
                      {user.name}
                      {isSelf && <span className="ml-1 text-xs text-slate-400">(você)</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{user.email}</td>
                    <td className="px-4 py-3">
                      <Badge tone={user.role === 'admin' ? 'indigo' : 'slate'}>{user.role === 'admin' ? 'Admin' : 'Usuário'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={user.active ? 'green' : 'red'}>{user.active ? 'Ativa' : 'Desativada'}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{formatDate(user.createdAt)}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={disabled}
                          onClick={() =>
                            update.mutate({ id: user.id, changes: { role: user.role === 'admin' ? 'user' : 'admin' } })
                          }
                        >
                          {user.role === 'admin' ? 'Tornar usuário' : 'Tornar admin'}
                        </Button>
                        <Button
                          variant={user.active ? 'danger' : 'secondary'}
                          size="sm"
                          disabled={disabled}
                          onClick={() => update.mutate({ id: user.id, changes: { active: !user.active } })}
                        >
                          {user.active ? 'Desativar' : 'Ativar'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
