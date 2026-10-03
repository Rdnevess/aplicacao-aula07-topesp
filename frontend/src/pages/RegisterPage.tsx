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

const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Informe ao menos 2 caracteres').max(100, 'Máximo de 100 caracteres'),
    email: z.string().trim().email('Informe um e-mail válido'),
    password: z.string().min(8, 'A senha precisa de ao menos 8 caracteres').max(72, 'Máximo de 72 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não conferem',
    path: ['confirmPassword'],
  })
type RegisterForm = z.infer<typeof registerSchema>

export function RegisterPage() {
  const setSession = useAuthStore((state) => state.setSession)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const signUp = useMutation({
    mutationFn: authApi.register,
    onSuccess: ({ user, accessToken }) => {
      queryClient.clear()
      setSession(user, accessToken)
      navigate('/app', { replace: true })
    },
  })

  return (
    <AuthShell
      title="Criar conta"
      subtitle={
        <>
          Já tem conta?{' '}
          <Link to="/entrar" className="font-medium text-indigo-600 hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <form
        onSubmit={handleSubmit(({ name, email, password }) => signUp.mutate({ name, email, password }))}
        className="space-y-4"
        noValidate
      >
        {signUp.isError && <Alert>{getErrorMessage(signUp.error)}</Alert>}
        <Input label="Nome" autoComplete="name" error={errors.name?.message} {...register('name')} />
        <Input label="E-mail" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <Input
          label="Senha"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Input
          label="Confirme a senha"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button type="submit" className="w-full" disabled={signUp.isPending}>
          {signUp.isPending && <Loader2 className="size-4 animate-spin" />}
          Criar conta
        </Button>
      </form>
    </AuthShell>
  )
}
