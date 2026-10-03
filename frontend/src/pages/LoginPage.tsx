import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { AuthShell } from '../components/layout/AuthShell'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { authApi, getErrorMessage } from '../services/api'
import { useAuthStore } from '../store/authStore'

const loginSchema = z.object({
  email: z.string().trim().email('Informe um e-mail válido'),
  password: z.string().min(1, 'Informe a senha'),
})
type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const setSession = useAuthStore((state) => state.setSession)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  const login = useMutation({
    mutationFn: authApi.login,
    onSuccess: ({ user, accessToken }) => {
      queryClient.clear()
      setSession(user, accessToken)
      navigate('/app', { replace: true })
    },
  })

  return (
    <AuthShell
      title="Entrar"
      subtitle={
        <>
          Não tem conta?{' '}
          <Link to="/cadastro" className="font-medium text-indigo-600 hover:underline">
            Criar conta
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit((data) => login.mutate(data))} className="space-y-4" noValidate>
        {login.isError && <Alert>{getErrorMessage(login.error)}</Alert>}
        <Input label="E-mail" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <Input
          label="Senha"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" className="w-full" disabled={login.isPending}>
          {login.isPending && <Loader2 className="size-4 animate-spin" />}
          Entrar
        </Button>
      </form>
    </AuthShell>
  )
}
