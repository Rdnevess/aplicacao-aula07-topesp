export type Role = 'user' | 'admin'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  active: boolean
  createdAt: string
}

export interface AuthResponse {
  user: User
  accessToken: string
}

export interface Transcription {
  id: string
  originalFilename: string
  mimeType: string
  sizeBytes: number
  durationSeconds: number | null
  language: string
  model: string
  text: string
  createdAt: string
}

export interface UserUpdate {
  role?: Role
  active?: boolean
}

export interface ApiError {
  statusCode: number
  message: string | string[]
  error?: string
}
