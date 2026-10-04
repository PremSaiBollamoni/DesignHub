import Konva from 'konva'
import { parseBackground, type DesignElement } from '@/models/design'
import { loadFont } from '@/services/assets/fonts'
import { loadImage, svgToDataUrl, tintSvg } from '@/services/render/imageCache'
import { PageRenderer } from '@/services/render/pageRenderer'
import { displayText } from '@/components/editor/canvas/bodies/TextBody'
import { checkAborted, type ExportOptions, type ExportPage, type ExportResult } from './exportTypes'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function transform(e: DesignElement): string {
  const d = e.data
  return d.rotation ? ` transform="rotate(${d.rotation} ${d.x + d.width / 2} ${d.y + d.height / 2})"` : ''
}

function polygon(points: number[]): string {
  return points.reduce<string[]>((acc, v, i) => (i % 2 ? acc : [...acc, `${v},${points[i + 1]}`]), []).join(' ')
}

function shapeSvg(e: Extract<DesignElement, { type: 'shape' }>): string {
  const d = e.data
  const fill = d.fill === 'transparent' ? 'none' : d.fill
  const stroke = d.stroke && d.strokeWidth > 0 ? ` stroke="${d.stroke}" stroke-width="${d.strokeWidth}"${d.dash ? ` stroke-dasharray="${d.strokeWidth * 2} ${d.strokeWidth * 1.5}"` : ''}` : ''
  const attrs = `fill="${fill}"${stroke}`
  const { x, y, width: w, height: h } = d
  const op = d.opacity !== 1 ? ` opacity="${d.opacity}"` : ''
  const tf = transform(e)
  switch (d.shape) {
    case 'rect':
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${d.cornerRadius ?? 0}" ${attrs}${op}${tf}/>`
    case 'ellipse':
      return `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}" ${attrs}${op}${tf}/>`
    case 'triangle':
      return `<polygon points="${polygon([x + w / 2, y, x + w, y + h, x, y + h])}" ${attrs}${op}${tf}/>`
    case 'diamond':
      return `<polygon points="${polygon([x + w / 2, y, x + w, y + h / 2, x + w / 2, y + h, x, y + h / 2])}" ${attrs}${op}${tf}/>`
    case 'line':
    case 'arrow':
      return `<line x1="${x}" y1="${y}" x2="${x + w}" y2="${y}" stroke="${d.stroke ?? d.fill}" stroke-width="${d.strokeWidth || 6}" stroke-linecap="round"${op}${tf}/>`
    default:
      return ''
  }
}

function textSvg(e: Extract<DesignElement, { type: 'text' }>): string {
  const d = e.data
  const content = displayText(d)
  const probe = new Konva.Text({
    text: content,
    width: d.width,
    fontFamily: d.fontFamily,
    fontSize: d.fontSize,
    fontStyle: `${d.italic ? 'italic ' : ''}${d.fontWeight}`,
    lineHeight: d.lineHeight,
    letterSpacing: d.letterSpacing,
    wrap: 'word',
  })
  const lines = probe.textArr.map((l) => l.text)
  probe.destroy()
  const anchor = d.align === 'center' ? 'middle' : d.align === 'right' ? 'end' : 'start'
  const lx = d.align === 'center' ? d.x + d.width / 2 : d.align === 'right' ? d.x + d.width : d.x
  const lh = d.fontSize * d.lineHeight
  const deco = [d.underline && 'underline', d.strike && 'line-through'].filter(Boolean).join(' ')
  const bg = d.background ? `<rect x="${d.x}" y="${d.y}" width="${d.width}" height="${d.height}" fill="${d.background}"${transform(e)}/>` : ''
  const tspans = lines.map((l, i) => `<tspan x="${lx}" y="${d.y + lh * i + lh / 2}">${esc(l)}</tspan>`).join('')
  return `${bg}<text font-family="${esc(d.fontFamily)}, sans-serif" font-size="${d.fontSize}" font-weight="${d.fontWeight}" font-style="${d.italic ? 'italic' : 'normal'}" letter-spacing="${d.letterSpacing}" fill="${d.fill}" text-anchor="${anchor}" dominant-baseline="central"${deco ? ` text-decoration="${deco}"` : ''}${d.opacity !== 1 ? ` opacity="${d.opacity}"` : ''}${transform(e)}>${tspans}</text>`
}

async function dataUrlOf(src: string): Promise<string> {
  if (src.startsWith('data:')) return src
  const img = await loadImage(src)
  const c = document.createElement('canvas')
  c.width = img.naturalWidth
  c.height = img.naturalHeight
  c.getContext('2d')!.drawImage(img, 0, 0)
  return c.toDataURL('image/png')
}

async function imageSvg(e: Extract<DesignElement, { type: 'image' }>): Promise<string> {
  const d = e.data
  const href = await dataUrlOf(d.src)
  const nw = d.naturalWidth ?? d.width
  const nh = d.naturalHeight ?? d.height
  const c = d.crop ?? { x: 0, y: 0, width: nw, height: nh }
  const flip = d.flipX || d.flipY ? ` transform="translate(${d.flipX ? d.width : 0} ${d.flipY ? d.height : 0}) scale(${d.flipX ? -1 : 1} ${d.flipY ? -1 : 1})"` : ''
  const op = d.opacity !== 1 ? ` opacity="${d.opacity}"` : ''
  return `<svg x="${d.x}" y="${d.y}" width="${d.width}" height="${d.height}" viewBox="${c.x} ${c.y} ${c.width} ${c.height}" preserveAspectRatio="none" overflow="hidden"${op}${transform(e)}><g${flip}><image href="${href}" width="${nw}" height="${nh}"/></g></svg>`
}

/** Shapes, text and pictures stay real vectors; richer objects (charts, tables, frames…) are embedded as crisp raster images. */
async function elementSvg(e: DesignElement, raster: PageRenderer): Promise<string> {
  switch (e.type) {
    case 'shape': {
      const s = shapeSvg(e)
      if (s) return s
      break
    }
    case 'text':
      if (e.data.curve) break
      await loadFont(e.data.fontFamily, [e.data.fontWeight], !!e.data.italic)
      return textSvg(e)
    case 'image':
      return imageSvg(e)
    case 'icon':
      return `<image href="${svgToDataUrl(tintSvg(e.data.svg, e.data.fill))}" x="${e.data.x}" y="${e.data.y}" width="${e.data.width}" height="${e.data.height}"${transform(e)}/>`
    default:
  }
  const d = e.data
  const pad = Math.ceil((d.shadow?.blur ?? 0) * 2)
  const w = Math.ceil(d.width + pad * 2)
  const h = Math.ceil(d.height + pad * 2)
  const canvas = await raster.render({ background: '{"type":"solid","color":"rgba(0,0,0,0)"}', elements: [{ ...e, data: { ...d, x: pad, y: pad, rotation: 0 } } as DesignElement] }, { width: w, height: h, pixelRatio: 2 })
  const rot = d.rotation ? ` transform="rotate(${d.rotation} ${d.x + d.width / 2} ${d.y + d.height / 2})"` : ''
  return `<image href="${canvas.toDataURL('image/png')}" x="${d.x - pad}" y="${d.y - pad}" width="${w}" height="${h}"${rot}/>`
}

function backgroundSvg(bg: string, w: number, h: number): string {
  const b = parseBackground(bg)
  if (b.type === 'gradient') {
    const rad = (b.angle * Math.PI) / 180
    const x1 = 50 - Math.cos(rad) * 50
    const y1 = 50 - Math.sin(rad) * 50
    return `<defs><linearGradient id="bg" x1="${x1}%" y1="${y1}%" x2="${100 - x1}%" y2="${100 - y1}%"><stop offset="0" stop-color="${b.from}"/><stop offset="1" stop-color="${b.to}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#bg)"/>`
  }
  return `<rect width="${w}" height="${h}" fill="${b.type === 'solid' ? b.color : '#ffffff'}"/>`
}

export async function exportSvg(pages: ExportPage[], width: number, height: number, o: ExportOptions): Promise<ExportResult> {
  const raster = new PageRenderer()
  try {
    const docs: { name: string; svg: string }[] = []
    for (let i = 0; i < pages.length; i++) {
      checkAborted(o.signal)
      o.onProgress?.(i / pages.length, `Converting page ${i + 1} of ${pages.length}`)
      const page = pages[i]!
      const bgImage = parseBackground(page.background)
      const parts = [backgroundSvg(page.background, width, height)]
      if (bgImage.type === 'image') parts.push(`<image href="${await dataUrlOf(bgImage.src)}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid ${bgImage.fit === 'cover' ? 'slice' : 'meet'}"/>`)
      for (const el of page.elements) parts.push(await elementSvg(el, raster))
      docs.push({ name: `${o.fileName}${pages.length > 1 ? `-${i + 1}` : ''}.svg`, svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${parts.join('')}</svg>` })
    }
    if (docs.length === 1) return { blob: new Blob([docs[0]!.svg], { type: 'image/svg+xml' }), fileName: docs[0]!.name, pageCount: 1 }
    const { default: JSZip } = await import('jszip')
    const zip = new JSZip()
    docs.forEach((d) => zip.file(d.name, d.svg))
    return { blob: await zip.generateAsync({ type: 'blob' }), fileName: `${o.fileName}-svg.zip`, pageCount: docs.length }
  } finally {
    raster.dispose()
  }
}
