import type { AssetFile } from '@/models/api'
import { post, upload } from './http'

export interface AiLayout {
  background: string
  elements: { id: string; type: 'text' | 'shape'; zIndex: number; data: Record<string, unknown> }[]
}

export interface DecomposedLayer {
  url: string
  bbox: [number, number, number, number]
  score: number
}

export const aiApi = {
  text: (prompt: string, instruction?: string) => post<{ text: string }>('/api/ai/text', { prompt, instruction }),
  image: (prompt: string, width?: number, height?: number) => post<AssetFile>('/api/ai/image', { prompt, width, height }),
  design: (brief: string, width: number, height: number, brand?: string) => post<AiLayout>('/api/ai/design', { brief, width, height, brand }),

  removeBackground: (file: Blob) => {
    const form = new FormData()
    form.append('image', file, 'image.png')
    return upload<AssetFile>('/api/background-removal', form)
  },
  inpaint: (image: Blob, mask: Blob) => {
    const form = new FormData()
    form.append('image', image, 'image.png')
    form.append('mask', mask, 'mask.png')
    return upload<AssetFile>('/api/design-decomposition/inpaint', form)
  },
  decompose: (file: Blob, maxLayers = 8) => {
    const form = new FormData()
    form.append('image', file, 'image.png')
    form.append('maxLayers', String(maxLayers))
    return upload<{ width: number; height: number; layers: DecomposedLayer[]; backgroundUrl?: string }>('/api/design-decomposition', form)
  },
}
