import { accountApi } from '@/services/api/accountApi'
import { useEditorStore } from '@/stores/editorStore'
import { exportGif, exportMp4 } from './animatedExport'
import { exportPdf, exportRaster } from './rasterExport'
import { exportSvg } from './svgExport'
import { collectPages, type ExportOptions, type ExportResult } from './exportTypes'

export type { ExportFormat, ExportOptions } from './exportTypes'

export const FORMAT_INFO: Record<ExportOptions['format'], { label: string; hint: string; animated?: boolean }> = {
  png: { label: 'PNG', hint: 'Sharp images with transparency' },
  jpg: { label: 'JPG', hint: 'Smaller files for photos' },
  pdf: { label: 'PDF', hint: 'Print or share all pages in one file' },
  svg: { label: 'SVG', hint: 'Vector shapes and text you can edit elsewhere' },
  zip: { label: 'ZIP of images', hint: 'Every page as its own PNG' },
  gif: { label: 'GIF', hint: 'Looping animation', animated: true },
  mp4: { label: 'MP4 video', hint: 'Plays your animations page by page', animated: true },
}

/** Renders in the browser, then records the export on the server (which also enforces plan limits). */
export async function runExport(o: ExportOptions): Promise<ExportResult> {
  const { pages, width, height } = collectPages(o.format === 'zip' ? 'all' : o.scope)
  const projectId = useEditorStore.getState().projectId
  await accountApi.recordExport({ projectId, format: o.format === 'zip' ? 'zip' : o.format, pageCount: pages.length, sizeBytes: 0 })
  switch (o.format) {
    case 'png':
    case 'jpg':
      return exportRaster(pages, width, height, o)
    case 'zip':
      return exportRaster(pages, width, height, { ...o, format: 'png', scope: 'all' })
    case 'pdf':
      return exportPdf(pages, width, height, o)
    case 'svg':
      return exportSvg(pages, width, height, o)
    case 'gif':
      return exportGif(pages, width, height, o)
    case 'mp4':
      return exportMp4(pages, width, height, o)
  }
}
