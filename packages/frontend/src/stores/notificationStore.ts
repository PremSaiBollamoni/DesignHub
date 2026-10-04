import { create } from 'zustand'
import type { NotificationItem } from '@/models/api'
import { accountApi } from '@/services/api/accountApi'

interface NotificationState {
  items: NotificationItem[]
  unread: number
  loading: boolean
  load: () => Promise<void>
  receive: (n: NotificationItem) => void
  markRead: (id: number) => Promise<void>
  markAllRead: () => Promise<void>
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  items: [],
  unread: 0,
  loading: false,
  load: async () => {
    set({ loading: true })
    try {
      const [items, count] = await Promise.all([accountApi.notifications(), accountApi.unreadCount()])
      set({ items, unread: count.count })
    } finally {
      set({ loading: false })
    }
  },
  receive: (n) => set((s) => ({ items: [n, ...s.items].slice(0, 50), unread: s.unread + 1 })),
  markRead: async (id) => {
    const target = get().items.find((n) => n.id === id)
    if (!target || target.read) return
    set((s) => ({ items: s.items.map((n) => (n.id === id ? { ...n, read: true } : n)), unread: Math.max(0, s.unread - 1) }))
    await accountApi.markRead(id).catch(() => undefined)
  },
  markAllRead: async () => {
    set((s) => ({ items: s.items.map((n) => ({ ...n, read: true })), unread: 0 }))
    await accountApi.markAllRead().catch(() => undefined)
  },
}))
