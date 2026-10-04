import type { AuthResponse, User } from '@/models/api'
import { get, patch, post } from './http'

export const authApi = {
  register: (name: string, email: string, password: string) => post<AuthResponse>('/api/auth/register', { name, email, password }),
  login: (email: string, password: string) => post<AuthResponse>('/api/auth/login', { email, password }),
  config: () => get<{ googleClientId: string; allowedEmailDomains: string[] }>('/api/auth/config'),
  google: (credential: string) => post<AuthResponse>('/api/auth/google', { credential }),
  me: () => get<User>('/api/auth/me'),
  updateProfile: (data: { name?: string; avatarUrl?: string }) => patch<AuthResponse>('/api/auth/me', data),
  changePassword: (currentPassword: string, newPassword: string) => post<void>('/api/auth/password', { currentPassword, newPassword }),
  searchUsers: (q: string) => get<User[]>('/api/auth/users', { q }),
}
