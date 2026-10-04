import { PageRenderer } from '@/services/render/pageRenderer'
import { canvasToBlob, checkAborted, flatten, type ExportOptions, type ExportPage, type ExportResult } from './exportTypes'

export async function exportRaster(pages: ExportPage[], width: number, height: number, o: ExportOptions): Promise<ExportResult> {
  const renderer = new PageRenderer()
  const jpg = o.format === 'jpg'
  const mime = jpg ? 'image/jpeg' : 'image/png'
  const ext = jpg ? 'jpg' : 'png'
  try {
    const files: { name: string; blob: Blob }[] = []
    for (let i = 0; i < pages.length; i++) {
      checkAborted(o.signal)
      o.onProgress?.(i / pages.length, `Rendering page ${i + 1} of ${pages.length}`)
      const canvas = await renderer.render(pages[i]!, { width, height, pixelRatio: o.scale })
      files.push({ name: `${o.fileName}${pages.length > 1 ? `-${i + 1}` : ''}.${ext}`, blob: await canvasToBlob(jpg ? flatten(canvas) : canvas, mime, o.quality) })
    }
    if (files.length === 1) return { blob: files[0]!.blob, fileName: files[0]!.name, pageCount: 1 }
    const { default: JSZip } = await import('jszip')
    const zip = new JSZip()
    files.forEach((f) => zip.file(f.name, f.blob))
    o.onProgress?.(0.95, 'Packing files')
    return { blob: await zip.generateAsync({ type: 'blob' }), fileName: `${o.fileName}.zip`, pageCount: files.length }
  } finally {
    renderer.dispose()
  }
}

export async function exportPdf(pages: ExportPage[], width: number, height: number, o: ExportOptions): Promise<ExportResult> {
  const { jsPDF } = await import('jspdf')
  const renderer = new PageRenderer()
  try {
    const landscape = width >= height
    const pdf = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'px', format: [width, height], hotfixes: ['px_scaling'], compress: true })
    for (let i = 0; i < pages.length; i++) {
      checkAborted(o.signal)
      o.onProgress?.(i / pages.length, `Rendering page ${i + 1} of ${pages.length}`)
      const canvas = flatten(await renderer.render(pages[i]!, { width, height, pixelRatio: o.scale }))
      if (i > 0) pdf.addPage([width, height], landscape ? 'landscape' : 'portrait')
      pdf.addImage(canvas.toDataURL('image/jpeg', o.quality), 'JPEG', 0, 0, width, height, undefined, 'FAST')
    }
    return { blob: pdf.output('blob'), fileName: `${o.fileName}.pdf`, pageCount: pages.length }
  } finally {
    renderer.dispose()
  }
}
