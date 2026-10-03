import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import type { ApiError, AuthResponse, Transcription, User, UserUpdate } from '../types'

// Caminho relativo: o mesmo código funciona com o proxy do Vite e com o proxy reverso em produção.
export const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const isLoginCall = axios.isAxiosError(error) && error.config?.url === '/auth/login'
    if (axios.isAxiosError(error) && error.response?.status === 401 && !isLoginCall) {
      useAuthStore.getState().clearSession()
      if (window.location.pathname !== '/entrar') window.location.assign('/entrar')
    }
    return Promise.reject(error)
  },
)

export function getErrorMessage(error: unknown, fallback = 'Algo deu errado. Tente novamente.'): string {
  if (axios.isAxiosError<ApiError>(error)) {
    const message = error.response?.data?.message
    if (Array.isArray(message)) return message.join(' ')
    if (typeof message === 'string') return message
  }
  return fallback
}

export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post<AuthResponse>('/auth/register', data).then((res) => res.data),
  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data).then((res) => res.data),
  me: () => api.get<User>('/auth/me').then((res) => res.data),
}

export const transcriptionsApi = {
  list: () => api.get<Transcription[]>('/transcriptions').then((res) => res.data),
  get: (id: string) => api.get<Transcription>(`/transcriptions/${id}`).then((res) => res.data),
  create: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<Transcription>('/transcriptions', form).then((res) => res.data)
  },
  remove: (id: string) => api.delete<void>(`/transcriptions/${id}`).then(() => undefined),
}

export const usersApi = {
  list: () => api.get<User[]>('/users').then((res) => res.data),
  update: (id: string, changes: UserUpdate) =>
    api.patch<User>(`/users/${id}`, changes).then((res) => res.data),
}
