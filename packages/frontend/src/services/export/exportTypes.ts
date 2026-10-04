import type { DesignElement } from '@/models/design'
import { naturalPageDuration } from '@/services/render/animation'
import { useEditorStore } from '@/stores/editorStore'

export type ExportFormat = 'png' | 'jpg' | 'pdf' | 'svg' | 'zip' | 'gif' | 'mp4'

export interface ExportOptions {
  format: ExportFormat
  scope: 'current' | 'all'
  /** Output pixels per design pixel. */
  scale: number
  quality: number
  fps: number
  fileName: string
  onProgress?: (fraction: number, label: string) => void
  signal?: AbortSignal
}

export interface ExportPage {
  id: string
  name: string
  background: string
  elements: DesignElement[]
  duration: number
}

export interface ExportResult {
  blob: Blob
  fileName: string
  pageCount: number
}

export function collectPages(scope: 'current' | 'all'): { pages: ExportPage[]; width: number; height: number } {
  const s = useEditorStore.getState()
  const ids = scope === 'current' ? [s.currentPageId] : s.pageIds
  const pages = ids.map((id) => {
    const meta = s.pages[id]!
    const elements = (s.pageElementIds[id] ?? []).map((eid) => s.elements[eid]!).filter((e) => e && !e.data.hidden)
    return { id, name: meta.name, background: meta.background, elements, duration: meta.durationSeconds ?? naturalPageDuration(elements) }
  })
  return { pages, width: s.width, height: s.height }
}

export function checkAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('Export cancelled', 'AbortError')
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('The image could not be encoded'))), type, quality))
}

/** Flattens transparency onto white so JPEG and PDF never show black backgrounds. */
export function flatten(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const out = document.createElement('canvas')
  out.width = canvas.width
  out.height = canvas.height
  const ctx = out.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, out.width, out.height)
  ctx.drawImage(canvas, 0, 0)
  return out
}
