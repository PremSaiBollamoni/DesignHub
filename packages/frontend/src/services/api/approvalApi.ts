import { get, post } from './http'

export type ApprovalStatus = 'NO_TEAM' | 'NONE' | 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED' | 'EXPIRED'

export interface ApprovalState {
  status: ApprovalStatus
  id?: number
  teamId?: number
  teamName?: string
  requestedById?: number
  requestedBy?: string
  message?: string
  feedback?: string
  caption?: string
  decidedBy?: string
  decidedAt?: string
  requestedAt?: string
  canSubmit: boolean
  canReview: boolean
  canPublish: boolean
  reviewers: string[]
}

export interface EmailDelivery {
  email: string
  name: string
  sent: boolean
  problem?: string
}

export interface WaitingItem {
  projectId: number
  title: string
  requestedBy: string
  requestedAt: string
  thumbnail: string
}

export const approvalApi = {
  status: (projectId: number) => get<ApprovalState>(`/api/approvals/project/${projectId}`),
  waiting: () => get<WaitingItem[]>('/api/approvals/waiting'),
  submit: (projectId: number, message: string) =>
    post<{ approval: ApprovalState; emails: EmailDelivery[]; emailConfigured: boolean }>(`/api/approvals/project/${projectId}/submit`, { message }),
  approve: (id: number, caption: string) => post<ApprovalState>(`/api/approvals/${id}/approve`, { caption }),
  requestChanges: (id: number, feedback: string) => post<ApprovalState>(`/api/approvals/${id}/request-changes`, { feedback }),
}
