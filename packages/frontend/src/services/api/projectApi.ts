import type { DesignDocument } from '@/models/design'
import type { Folder, ProjectPage, ProjectSummary, VersionMeta } from '@/models/api'
import { del, get, patch, post, put } from './http'

export interface ProjectQuery {
  q?: string
  view?: 'all' | 'favorites' | 'shared' | 'trash'
  folderId?: number
  sort?: 'updated' | 'created' | 'title'
  page?: number
  size?: number
}

export const projectApi = {
  list: (query: ProjectQuery, signal?: AbortSignal) => get<ProjectPage>('/api/projects', query as Record<string, string | number>, signal),
  get: (id: number) => get<ProjectSummary>(`/api/projects/${id}`),
  create: (data: { title: string; width?: number; height?: number; templateId?: number; teamId?: number; folderId?: number }) =>
    post<ProjectSummary>('/api/projects', data),
  update: (id: number, data: { title?: string; folderId?: number; clearFolder?: boolean; thumbnail?: string; teamId?: number }) =>
    patch<ProjectSummary>(`/api/projects/${id}`, data),
  duplicate: (id: number) => post<ProjectSummary>(`/api/projects/${id}/duplicate`),
  trash: (id: number) => post<void>(`/api/projects/${id}/trash`),
  restore: (id: number) => post<void>(`/api/projects/${id}/restore`),
  deleteForever: (id: number) => del(`/api/projects/${id}`),
  favorite: (id: number) => post<{ favorite: boolean }>(`/api/projects/${id}/favorite`),
  loadDesign: (id: number) => get<DesignDocument>(`/api/projects/${id}/design`),
  saveDesign: (id: number, doc: DesignDocument) => put<{ revision: number }>(`/api/projects/${id}/design`, doc),

  folders: () => get<Folder[]>('/api/categories/folders'),
  createFolder: (name: string) => post<Folder>('/api/categories/folders', { name }),
  renameFolder: (id: number, name: string) => patch<Folder>(`/api/categories/folders/${id}`, { name }),
  deleteFolder: (id: number) => del(`/api/categories/folders/${id}`),

  versions: (id: number) => get<VersionMeta[]>(`/api/versions/project/${id}`),
  saveVersion: (id: number, label: string, auto = false, thumbnail?: string) =>
    post<VersionMeta>(`/api/versions/project/${id}`, { label, auto, thumbnail }),
  restoreVersion: (id: number, versionId: number) => post<void>(`/api/versions/project/${id}/${versionId}/restore`),
  deleteVersion: (id: number, versionId: number) => del(`/api/versions/project/${id}/${versionId}`),
}
