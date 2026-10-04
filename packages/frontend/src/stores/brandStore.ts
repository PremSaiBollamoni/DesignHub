import { create } from 'zustand'
import type { BrandKit } from '@/models/api'
import { contentApi } from '@/services/api/contentApi'

type KitInput = Pick<BrandKit, 'name' | 'colors' | 'fonts' | 'guidelines'>

interface BrandState {
  kits: BrandKit[]
  activeId: number | null
  loaded: boolean
  load: () => Promise<void>
  setActive: (id: number) => void
  create: (data: KitInput) => Promise<BrandKit>
  save: (id: number, data: KitInput) => Promise<void>
  remove: (id: number) => Promise<void>
  refresh: () => Promise<void>
}

export const useBrandStore = create<BrandState>((set, get) => ({
  kits: [],
  activeId: null,
  loaded: false,
  load: async () => {
    if (get().loaded) return
    await get().refresh()
  },
  refresh: async () => {
    const kits = await contentApi.brandKits()
    const activeId = kits.some((k) => k.id === get().activeId) ? get().activeId : (kits[0]?.id ?? null)
    set({ kits, activeId, loaded: true })
  },
  setActive: (id) => set({ activeId: id }),
  create: async (data) => {
    const kit = await contentApi.createBrandKit(data)
    set({ kits: [...get().kits, kit], activeId: kit.id })
    return kit
  },
  save: async (id, data) => {
    const kit = await contentApi.updateBrandKit(id, data)
    set({ kits: get().kits.map((k) => (k.id === id ? kit : k)) })
  },
  remove: async (id) => {
    await contentApi.deleteBrandKit(id)
    const kits = get().kits.filter((k) => k.id !== id)
    set({ kits, activeId: kits[0]?.id ?? null })
  },
}))

export const selectActiveKit = (s: BrandState) => s.kits.find((k) => k.id === s.activeId) ?? null
