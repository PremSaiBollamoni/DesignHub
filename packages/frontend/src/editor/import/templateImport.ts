import type { DesignDocument, DesignElement, ImageElement, TextElement } from '@/models/design'
import { aiApi } from '@/services/api/aiApi'
import { contentApi } from '@/services/api/contentApi'
import { projectApi } from '@/services/api/projectApi'
import { canvasToBlob } from '@/services/export/exportTypes'
import { uid } from '@/utils/common'
import { inkColor, inkRatio, maskCanvas, mergeLines, paintOutText, type TextBox } from './recoverText'

export interface ImportProgress {
  (fraction: number, label: string): void
}

interface RawPage {
  canvas: HTMLCanvasElement
  boxes: TextBox[]
}

const MAX_SIDE = 3000

async function loadBitmap(file: File): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(file)
  const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * k)
  c.height = Math.round(bmp.height * k)
  c.getContext('2d', { willReadFrequently: true })!.drawImage(bmp, 0, 0, c.width, c.height)
  return c
}

/**
 * Pictures have no text layer, so read it with OCR. Words are grouped into lines and split wherever there is a wide gap,
 * so a footer like "phone | whatsapp | website" becomes separate boxes instead of one stretched line.
 */
async function readImage(file: File, progress: ImportProgress): Promise<RawPage[]> {
  const canvas = await loadBitmap(file)
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng', 1, { logger: (m) => m.status === 'recognizing text' && progress(0.1 + m.progress * 0.4, 'Reading the text') })
  try {
    const { data } = await worker.recognize(canvas, {}, { blocks: true })
    const boxes: TextBox[] = []
    for (const block of data.blocks ?? [])
      for (const para of block.paragraphs)
        for (const line of para.lines) {
          const words = line.words.filter((w) => w.confidence >= 60 && /[A-Za-z0-9]/.test(w.text) && w.bbox.y1 - w.bbox.y0 > 10)
          let group: typeof words = []
          const flush = () => {
            if (!group.length) return
            const x0 = Math.min(...group.map((w) => w.bbox.x0))
            const x1 = Math.max(...group.map((w) => w.bbox.x1))
            const y0 = Math.min(...group.map((w) => w.bbox.y0))
            const y1 = Math.max(...group.map((w) => w.bbox.y1))
            const h = y1 - y0
            boxes.push({ text: group.map((w) => w.text).join(' '), x: x0, y: y0, width: x1 - x0, height: h, fontSize: Math.max(8, h * 0.78), color: '#000000', bold: false, align: 'left' })
            group = []
          }
          for (const w of words) {
            const prev = group[group.length - 1]
            if (prev && w.bbox.x0 - prev.bbox.x1 > (w.bbox.y1 - w.bbox.y0) * 1.8) flush()
            group.push(w)
          }
          flush()
        }
    return [{ canvas, boxes }]
  } finally {
    await worker.terminate()
  }
}

/** PDFs already carry real text, so positions and sizes are exact and no OCR guessing is needed. */
async function readPdf(file: File, progress: ImportProgress): Promise<RawPage[]> {
  const pdfjs = await import('pdfjs-dist')
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  const pages: RawPage[] = []
  const count = Math.min(pdf.numPages, 20)
  for (let n = 1; n <= count; n++) {
    progress(0.05 + (n / count) * 0.4, `Reading page ${n} of ${count}`)
    const page = await pdf.getPage(n)
    const base = page.getViewport({ scale: 1 })
    const scale = Math.min(3, MAX_SIDE / Math.max(base.width, base.height), 2.5)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    await page.render({ canvas, canvasContext: ctx, viewport }).promise
    const content = await page.getTextContent()
    const raw: TextBox[] = []
    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue
      const t = pdfjs.Util.transform(viewport.transform, item.transform)
      const size = Math.hypot(t[2]!, t[3]!)
      const style = content.styles[item.fontName]
      raw.push({
        text: item.str,
        x: t[4]!,
        y: t[5]! - size * 0.86,
        width: item.width * scale,
        height: size * 1.08,
        fontSize: size,
        color: '#000000',
        bold: /bold|black|heavy|semibold/i.test(`${item.fontName} ${style?.fontFamily ?? ''}`),
        align: 'left',
      })
    }
    pages.push({ canvas, boxes: mergeLines(raw) })
  }
  return pages
}

async function cleanBackground(page: RawPage, progress: ImportProgress): Promise<HTMLCanvasElement> {
  const { canvas, boxes } = page
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  for (const b of boxes) {
    b.color = inkColor(ctx, b)
    const ratio = inkRatio(ctx, b)
    if (!b.bold) b.bold = ratio > 0.33 || (ratio > 0.27 && /[A-Z]{3}/.test(b.text))
    // Lines sitting on the page's centre line are centred designs; keep them that way when edited.
    if (Math.abs(b.x + b.width / 2 - canvas.width / 2) < canvas.width * 0.02) b.align = 'center'
  }
  const out = document.createElement('canvas')
  out.width = canvas.width
  out.height = canvas.height
  out.getContext('2d')!.drawImage(canvas, 0, 0)
  if (!boxes.length) return out
  progress(0.6, 'Removing the old text from the artwork')
  try {
    const result = await aiApi.inpaint(await canvasToBlob(canvas, 'image/png'), await canvasToBlob(maskCanvas(canvas.width, canvas.height, boxes), 'image/png'))
    const img = new Image()
    img.crossOrigin = 'anonymous'
    await new Promise<void>((res, rej) => {
      img.onload = () => res()
      img.onerror = () => rej(new Error('inpaint result unreadable'))
      img.src = result.url
    })
    out.getContext('2d')!.drawImage(img, 0, 0, out.width, out.height)
  } catch {
    // The ML worker is optional: fall back to filling each text area with the colour around it.
    paintOutText(out, boxes)
  }
  return out
}

function textElement(b: TextBox, pageWidth: number): TextElement {
  const wide = b.align === 'center' ? Math.min(pageWidth * 0.94, b.width * 1.25 + 24) : Math.ceil(b.width * 1.06) + 4
  const width = Math.round(wide)
  return {
    id: uid(),
    type: 'text',
    zIndex: 0,
    data: {
      x: Math.round(b.align === 'center' ? b.x + b.width / 2 - width / 2 : b.x - 2),
      y: Math.round(b.y),
      width,
      height: Math.round(b.height),
      rotation: 0,
      opacity: 1,
      name: b.text.slice(0, 24),
      text: b.text,
      fontFamily: 'Montserrat',
      fontSize: Math.round(b.fontSize * 10) / 10,
      fontWeight: b.bold ? 800 : 400,
      fill: b.color,
      align: b.align,
      lineHeight: 1.1,
      letterSpacing: 0,
    },
  }
}

export interface ImportedDesign {
  projectId: number
}

/** Creates a design whose pages are the clean artwork (an editable picture layer) with every line of text recovered on top. */
export async function importTemplateFile(file: File, title: string, progress: ImportProgress, options: { split?: boolean } = {}): Promise<ImportedDesign> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  progress(0.02, isPdf ? 'Opening the PDF' : 'Loading the picture')
  const raw = isPdf ? await readPdf(file, progress) : await readImage(file, progress)
  if (!raw.length) throw new Error('Nothing could be read from that file')

  const width = raw[0]!.canvas.width
  const height = raw[0]!.canvas.height
  const project = await projectApi.create({ title, width, height })
  const pages: DesignDocument['pages'] = []
  for (let i = 0; i < raw.length; i++) {
    const page = raw[i]!
    const clean = await cleanBackground(page, progress)
    progress(0.7 + (i / raw.length) * 0.25, `Saving page ${i + 1}`)
    const asset = await contentApi.upload(await canvasToBlob(clean, 'image/png'), `${title}-page-${i + 1}.png`)
    let backgroundUrl = asset.url
    const layers: ImageElement[] = []
    if (options.split) {
      progress(0.8, 'Separating logos, badges and objects')
      try {
        const split = await aiApi.decompose(await canvasToBlob(clean, 'image/png'), 10)
        const k = clean.width / split.width
        if (split.backgroundUrl) backgroundUrl = split.backgroundUrl
        for (const l of split.layers) {
          const [bx, by, bw, bh] = l.bbox
          layers.push({ id: uid(), type: 'image', zIndex: 0, data: { x: Math.round(bx * k), y: Math.round(by * k), width: Math.round(bw * k), height: Math.round(bh * k), rotation: 0, opacity: 1, name: 'Object', src: l.url, naturalWidth: Math.round(bw), naturalHeight: Math.round(bh) } })
        }
      } catch {
        /* the ML worker is optional; the artwork simply stays as one layer */
      }
    }
    const art: ImageElement = {
      id: uid(),
      type: 'image',
      zIndex: 0,
      data: { x: 0, y: 0, width, height: Math.round((width * clean.height) / clean.width), rotation: 0, opacity: 1, name: 'Original artwork', src: backgroundUrl, naturalWidth: clean.width, naturalHeight: clean.height },
    }
    const texts = page.boxes.map((b) => textElement(b, width))
    const elements: DesignElement[] = [art, ...layers, ...texts].map((e, z) => ({ ...e, zIndex: z }) as DesignElement)
    pages.push({ id: uid(), name: `Page ${i + 1}`, background: '#ffffff', position: i, durationSeconds: null, elements })
  }
  await projectApi.saveDesign(project.id, { projectId: project.id, revision: 0, width, height, pages })
  progress(1, 'Done')
  return { projectId: project.id }
}
