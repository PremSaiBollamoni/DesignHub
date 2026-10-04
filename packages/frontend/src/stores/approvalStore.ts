import { create } from 'zustand'
import { approvalApi, type ApprovalState } from '@/services/api/approvalApi'

interface ApprovalStore {
  approval: ApprovalState | null
  load: (projectId: number) => Promise<void>
  set: (a: ApprovalState) => void
  reset: () => void
}

export const useApprovalStore = create<ApprovalStore>((set) => ({
  approval: null,
  load: async (projectId) => {
    try {
      set({ approval: await approvalApi.status(projectId) })
    } catch {
      set({ approval: null })
    }
  },
  set: (approval) => set({ approval }),
  reset: () => set({ approval: null }),
}))
