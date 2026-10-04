import type {
  ActivityItem,
  AiSetting,
  BillingRecord,
  EmailSettings,
  NotificationItem,
  Plan,
  Team,
  TeamMember,
  Usage,
  Access,
} from '@/models/api'
import { del, get, post, put } from './http'

export const accountApi = {
  notifications: (limit = 30) => get<NotificationItem[]>('/api/notifications', { limit }),
  unreadCount: () => get<{ count: number }>('/api/notifications/unread-count'),
  markRead: (id: number) => post<void>(`/api/notifications/${id}/read`),
  markAllRead: () => post<void>('/api/notifications/read-all'),

  preferences: () => get<Record<string, string>>('/api/preferences'),
  setPreference: (key: string, value: string) => put<void>(`/api/preferences/${encodeURIComponent(key)}`, { value }),
  emailSettings: () => get<EmailSettings>('/api/email-settings'),
  saveEmailSettings: (s: EmailSettings) => put<EmailSettings>('/api/email-settings', s),

  activity: (projectId?: number, limit = 40) => get<ActivityItem[]>('/api/activity', { projectId, limit }),
  productUpdates: () => get<{ id: number; title: string; body: string; createdAt: string }[]>('/api/product-updates'),

  usage: () => get<Usage>('/api/subscription'),
  plans: () => get<Plan[]>('/api/subscription/plans'),
  billing: () => get<BillingRecord[]>('/api/subscription/billing'),
  changePlan: (planCode: string) => post<Usage>('/api/subscription/change', { planCode }),

  recordExport: (data: { projectId?: number; format: string; pageCount: number; sizeBytes: number }) => post<unknown>('/api/export', data),

  teams: () => get<Team[]>('/api/teams'),
  createTeam: (name: string) => post<Team>('/api/teams', { name }),
  deleteTeam: (id: number) => del(`/api/teams/${id}`),
  teamMembers: (id: number) => get<TeamMember[]>(`/api/teams/${id}/members`),
  addTeamMember: (id: number, email: string, role: Access) => post<TeamMember>(`/api/teams/${id}/members`, { email, role }),
  removeTeamMember: (id: number, userId: number) => del(`/api/teams/${id}/members/${userId}`),

  aiSettings: () => get<AiSetting[]>('/api/ai-settings'),
  saveAiSetting: (
    provider: string,
    data: { apiKey?: string; textModel?: string; imageModel?: string; baseUrl?: string; active?: boolean },
  ) => put<void>(`/api/ai-settings/${provider}`, data),
  testAiSetting: (provider: string, data: { apiKey?: string; textModel?: string; baseUrl?: string; useIfWorks?: boolean }) =>
    post<{ ok: boolean; message: string; model: string; latencyMs: number; reply?: string }>(`/api/ai-settings/${provider}/test`, data),
  deleteAiSetting: (provider: string) => del(`/api/ai-settings/${provider}`),
  aiUsage: () => get<{ provider: string; kind: string; requests: number; characters: number }[]>('/api/ai-settings/usage'),
}
