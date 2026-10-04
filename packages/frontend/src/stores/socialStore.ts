import { create } from 'zustand'
import type { SocialAccount, SocialPlatform, SocialPost } from '@/models/api'
import { socialApi } from '@/services/api/socialApi'

interface SocialState {
  platforms: SocialPlatform[]
  accounts: SocialAccount[]
  posts: SocialPost[]
  loaded: boolean
  load: () => Promise<void>
  replacePost: (post: SocialPost) => void
  removePost: (id: number) => void
  removeAccount: (id: number) => void
}

export const useSocialStore = create<SocialState>((set, get) => ({
  platforms: [],
  accounts: [],
  posts: [],
  loaded: false,
  load: async () => {
    const [platforms, accounts, posts] = await Promise.all([socialApi.platforms(), socialApi.accounts(), socialApi.posts()])
    set({ platforms, accounts, posts, loaded: true })
  },
  replacePost: (post) => {
    const exists = get().posts.some((p) => p.id === post.id)
    set({ posts: exists ? get().posts.map((p) => (p.id === post.id ? post : p)) : [post, ...get().posts] })
  },
  removePost: (id) => set({ posts: get().posts.filter((p) => p.id !== id) }),
  removeAccount: (id) => set({ accounts: get().accounts.filter((a) => a.id !== id) }),
}))
