import { create } from 'zustand'
import type { Team } from '@/models/api'
import { accountApi } from '@/services/api/accountApi'

interface TeamState {
  teams: Team[]
  loaded: boolean
  load: () => Promise<void>
  create: (name: string) => Promise<Team>
  remove: (id: number) => Promise<void>
}

export const useTeamStore = create<TeamState>((set, get) => ({
  teams: [],
  loaded: false,
  load: async () => {
    set({ teams: await accountApi.teams(), loaded: true })
  },
  create: async (name) => {
    const team = await accountApi.createTeam(name)
    set({ teams: [...get().teams, team] })
    return team
  },
  remove: async (id) => {
    await accountApi.deleteTeam(id)
    set({ teams: get().teams.filter((t) => t.id !== id) })
  },
}))
