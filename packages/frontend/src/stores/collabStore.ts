import { create } from 'zustand'
import type { CommentItem, PresenceUser } from '@/models/api'
import type { ConnectionStatus } from '@/services/realtime/realtimeClient'

export interface RemoteCursor {
  sessionId: string
  userId: number
  name: string
  color: string
  x: number
  y: number
  pageId: string
  at: number
}

export interface ChatMessage {
  id: string
  userId: number
  name: string
  text: string
  at: number
}

export type SaveState = 'saved' | 'saving' | 'offline' | 'error'

interface CollabState {
  connection: ConnectionStatus
  saveState: SaveState
  presence: PresenceUser[]
  cursors: Record<string, RemoteCursor>
  chat: ChatMessage[]
  comments: CommentItem[]
  setConnection: (c: ConnectionStatus) => void
  setSaveState: (s: SaveState) => void
  setPresence: (p: PresenceUser[]) => void
  setCursor: (c: RemoteCursor) => void
  pruneCursors: (activeSessions: Set<string>) => void
  addChat: (m: ChatMessage) => void
  setComments: (c: CommentItem[]) => void
  upsertComment: (c: CommentItem) => void
  removeComment: (id: number) => void
  reset: () => void
}

export const useCollabStore = create<CollabState>((set, get) => ({
  connection: 'idle',
  saveState: 'saved',
  presence: [],
  cursors: {},
  chat: [],
  comments: [],
  setConnection: (connection) => set({ connection }),
  setSaveState: (saveState) => set({ saveState }),
  setPresence: (presence) => set({ presence }),
  setCursor: (c) => set({ cursors: { ...get().cursors, [c.sessionId]: c } }),
  pruneCursors: (active) => {
    const next: Record<string, RemoteCursor> = {}
    for (const [k, v] of Object.entries(get().cursors)) if (active.has(k)) next[k] = v
    set({ cursors: next })
  },
  addChat: (m) => set({ chat: [...get().chat, m].slice(-200) }),
  setComments: (comments) => set({ comments }),
  upsertComment: (c) => {
    const exists = get().comments.some((x) => x.id === c.id)
    set({ comments: exists ? get().comments.map((x) => (x.id === c.id ? c : x)) : [...get().comments, c] })
  },
  removeComment: (id) => set({ comments: get().comments.filter((c) => c.id !== id && c.parentId !== id) }),
  reset: () => set({ connection: 'idle', saveState: 'saved', presence: [], cursors: {}, chat: [], comments: [] }),
}))
