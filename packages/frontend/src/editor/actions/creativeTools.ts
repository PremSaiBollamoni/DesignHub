import QRCode from 'qrcode'
import { insertElements } from './elementActions'
import { createIcon } from '@/editor/model/defaults'
import { useEditorStore } from '@/stores/editorStore'

/** A QR code is a vector graphic, so it stays sharp at any size and can be recoloured like any icon. */
export async function insertQrCode(text: string): Promise<void> {
  // The library only accepts hex colours, so draw in black and swap in currentColor, which lets the element be recoloured.
  const raw = await QRCode.toString(text, { type: 'svg', margin: 1, color: { dark: '#000000', light: '#00000000' }, errorCorrectionLevel: 'M' })
  const svg = raw.replace(/#000000(?!0)/g, 'currentColor')
  const s = useEditorStore.getState()
  const el = createIcon({ cx: s.width / 2, cy: s.height / 2 }, svg, '#151515', Math.round(Math.min(s.width, s.height) * 0.28), 'QR code')
  insertElements([el])
}

/** Turns a freehand stroke into an editable vector element with gently smoothed corners. */
export function insertStroke(points: { x: number; y: number }[], color: string, size: number): void {
  if (points.length < 2) return
  const pad = size
  const minX = Math.min(...points.map((p) => p.x)) - pad
  const minY = Math.min(...points.map((p) => p.y)) - pad
  const maxX = Math.max(...points.map((p) => p.x)) + pad
  const maxY = Math.max(...points.map((p) => p.y)) + pad
  const w = Math.max(2, maxX - minX)
  const h = Math.max(2, maxY - minY)
  const pts = points.map((p) => ({ x: p.x - minX, y: p.y - minY }))
  let d = `M${pts[0]!.x.toFixed(1)} ${pts[0]!.y.toFixed(1)}`
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i]!.x + pts[i + 1]!.x) / 2
    const my = (pts[i]!.y + pts[i + 1]!.y) / 2
    d += `Q${pts[i]!.x.toFixed(1)} ${pts[i]!.y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`
  }
  const last = pts[pts.length - 1]!
  d += `L${last.x.toFixed(1)} ${last.y.toFixed(1)}`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w.toFixed(1)} ${h.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}"><path d="${d}" fill="none" stroke="currentColor" stroke-width="${size}" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  const el = createIcon({ cx: minX + w / 2, cy: minY + h / 2 }, svg, color, 10, 'Drawing')
  el.data.width = w
  el.data.height = h
  el.data.x = minX
  el.data.y = minY
  insertElements([el])
}
