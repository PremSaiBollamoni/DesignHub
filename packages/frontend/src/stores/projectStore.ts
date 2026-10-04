import { create } from 'zustand'
import type { Folder, ProjectSummary } from '@/models/api'
import { projectApi, type ProjectQuery } from '@/services/api/projectApi'

interface ProjectState {
  items: ProjectSummary[]
  total: number
  folders: Folder[]
  query: ProjectQuery
  loading: boolean
  error: string | null
  setQuery: (patch: Partial<ProjectQuery>) => void
  load: () => Promise<void>
  loadFolders: () => Promise<void>
  patchItem: (id: number, patch: Partial<ProjectSummary>) => void
  removeItem: (id: number) => void
}

let controller: AbortController | null = null

export const useProjectStore = create<ProjectState>((set, get) => ({
  items: [],
  total: 0,
  folders: [],
  query: { view: 'all', sort: 'updated', page: 0, size: 24, q: '' },
  loading: false,
  error: null,
  setQuery: (patch) => set({ query: { ...get().query, page: 0, ...patch } }),
  load: async () => {
    controller?.abort()
    controller = new AbortController()
    set({ loading: true, error: null })
    try {
      const res = await projectApi.list(get().query, controller.signal)
      set({ items: res.items, total: res.total, loading: false })
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      set({ loading: false, error: (e as Error).message })
    }
  },
  loadFolders: async () => set({ folders: await projectApi.folders() }),
  patchItem: (id, patch) => set({ items: get().items.map((p) => (p.id === id ? { ...p, ...patch } : p)) }),
  removeItem: (id) => set({ items: get().items.filter((p) => p.id !== id), total: Math.max(0, get().total - 1) }),
}))
