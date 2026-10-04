import type { AssetFile, BrandKit, Category, TemplateSummary } from '@/models/api'
import type { DesignDocument } from '@/models/design'
import { del, get, post, put, upload } from './http'

export const contentApi = {
  categories: () => get<Category[]>('/api/categories'),
  templates: (query: { categoryId?: number; q?: string; page?: number; size?: number }) =>
    get<{ items: TemplateSummary[]; total: number }>('/api/templates', query as Record<string, string | number>),
  templateDesign: (id: number) => get<DesignDocument>(`/api/templates/${id}/design`),
  publishTemplate: (projectId: number, data: { title: string; categoryId?: number; tags?: string; thumbnail?: string }) =>
    post<TemplateSummary>(`/api/templates/from-project/${projectId}`, data),

  uploads: (kind?: string) => get<AssetFile[]>('/api/upload', { kind }),
  upload: (file: File | Blob, name?: string, extra?: { kind?: string; brandKitId?: number }) => {
    const form = new FormData()
    form.append('file', file, name ?? (file instanceof File ? file.name : 'upload'))
    if (extra?.kind) form.append('kind', extra.kind)
    if (extra?.brandKitId) form.append('brandKitId', String(extra.brandKitId))
    return upload<AssetFile>('/api/upload', form)
  },
  deleteUpload: (id: number) => del(`/api/upload/${id}`),

  brandKits: () => get<BrandKit[]>('/api/brand'),
  createBrandKit: (data: Pick<BrandKit, 'name' | 'colors' | 'fonts' | 'guidelines'>) => post<BrandKit>('/api/brand', data),
  updateBrandKit: (id: number, data: Pick<BrandKit, 'name' | 'colors' | 'fonts' | 'guidelines'>) => put<BrandKit>(`/api/brand/${id}`, data),
  deleteBrandKit: (id: number) => del(`/api/brand/${id}`),
}
