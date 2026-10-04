import type { Access, Collaborator, CommentItem, ProjectSummary, ShareLink } from '@/models/api'
import type { DesignDocument } from '@/models/design'
import { apiBase, del, get, patch, post } from './http'

export const sharingApi = {
  collaborators: (projectId: number) => get<Collaborator[]>(`/api/collaborators/project/${projectId}`),
  invite: (projectId: number, email: string, role: Access) => post<Collaborator>(`/api/collaborators/project/${projectId}`, { email, role }),
  removeCollaborator: (projectId: number, userId: number) => del(`/api/collaborators/project/${projectId}/${userId}`),

  links: (projectId: number) => get<ShareLink[]>(`/api/share-links/project/${projectId}`),
  createLink: (projectId: number, role: Access, expiresInDays?: number) =>
    post<ShareLink>(`/api/share-links/project/${projectId}`, { role, expiresInDays }),
  revokeLink: (projectId: number, linkId: number) => del(`/api/share-links/project/${projectId}/${linkId}`),
  acceptLink: (token: string) => post<{ projectId: number }>(`/api/share-links/accept/${token}`),
  publicView: (token: string) =>
    get<{ project: ProjectSummary; design: DesignDocument; role: Access }>(`/api/public/shares/${token}`),

  comments: (projectId: number) => get<CommentItem[]>(`/api/comments/project/${projectId}`),
  addComment: (
    projectId: number,
    data: { body: string; parentId?: number; pageId?: string; elementId?: string; x?: number; y?: number; mentions?: number[] },
  ) => post<CommentItem>(`/api/comments/project/${projectId}`, data),
  resolveComment: (projectId: number, id: number, resolved: boolean) =>
    patch<CommentItem>(`/api/comments/project/${projectId}/${id}`, { resolved }),
  deleteComment: (projectId: number, id: number) => del(`/api/comments/project/${projectId}/${id}`),

  shareUrl: (token: string) => `${window.location.origin}/s/${token}`,
  apiBase,
}
