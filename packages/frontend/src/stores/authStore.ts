import { create } from 'zustand'
import type { User } from '@/models/api'
import { authApi } from '@/services/api/authApi'
import { onUnauthorized, tokenStore } from '@/services/api/http'

interface AuthState {
  user: User | null
  /** True until the first session check finishes, so routes never flash the sign-in screen. */
  booting: boolean
  boot: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  updateProfile: (data: { name?: string; avatarUrl?: string }) => Promise<void>
  /** Completes a Google sign-in whose token was already exchanged with our API. */
  finishGoogle: (res: { token: string; user: User }) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  booting: true,
  boot: async () => {
    if (!tokenStore.get()) {
      set({ booting: false })
      return
    }
    try {
      set({ user: await authApi.me(), booting: false })
    } catch {
      tokenStore.clear()
      set({ user: null, booting: false })
    }
  },
  login: async (email, password) => {
    const res = await authApi.login(email, password)
    tokenStore.set(res.token)
    set({ user: res.user })
  },
  register: async (name, email, password) => {
    const res = await authApi.register(name, email, password)
    tokenStore.set(res.token)
    set({ user: res.user })
  },
  updateProfile: async (data) => {
    const res = await authApi.updateProfile(data)
    tokenStore.set(res.token)
    set({ user: res.user })
  },
  finishGoogle: (res) => {
    tokenStore.set(res.token)
    set({ user: res.user })
  },
  logout: () => {
    tokenStore.clear()
    set({ user: null })
  },
}))

onUnauthorized(() => useAuthStore.setState({ user: null }))
