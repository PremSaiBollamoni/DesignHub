/** Shared helpers for turning a flat picture of a page into editable text plus a clean background. */
export interface TextBox {
  text: string
  x: number
  y: number
  width: number
  height: number
  fontSize: number
  color: string
  bold: boolean
  align: 'left' | 'center' | 'right'
}

function px(ctx: CanvasRenderingContext2D, x: number, y: number): [number, number, number] {
  const d = ctx.getImageData(Math.max(0, x), Math.max(0, y), 1, 1).data
  return [d[0]!, d[1]!, d[2]!]
}

const median = (v: number[]) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)]!
const hex = (c: number[]) => '#' + c.map((n) => Math.round(n).toString(16).padStart(2, '0')).join('').toUpperCase()

/** Colour around a box, sampled just outside its edges. */
export function surroundingColor(ctx: CanvasRenderingContext2D, b: TextBox): [number, number, number] {
  const W = ctx.canvas.width
  const H = ctx.canvas.height
  const rs: number[] = []
  const gs: number[] = []
  const bs: number[] = []
  const add = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return
    const [r, g, bl] = px(ctx, Math.round(x), Math.round(y))
    rs.push(r)
    gs.push(g)
    bs.push(bl)
  }
  for (let i = 0; i <= 8; i++) {
    const x = b.x + (b.width * i) / 8
    const y = b.y + (b.height * i) / 8
    add(x, b.y - 3)
    add(x, b.y + b.height + 3)
    add(b.x - 3, y)
    add(b.x + b.width + 3, y)
  }
  return rs.length ? [median(rs), median(gs), median(bs)] : [255, 255, 255]
}

/** The text colour is the pixel inside the box that differs most from its surroundings. */
export function inkColor(ctx: CanvasRenderingContext2D, b: TextBox): string {
  const bg = surroundingColor(ctx, b)
  const x = Math.max(0, Math.floor(b.x))
  const y = Math.max(0, Math.floor(b.y))
  const w = Math.max(1, Math.min(ctx.canvas.width - x, Math.ceil(b.width)))
  const h = Math.max(1, Math.min(ctx.canvas.height - y, Math.ceil(b.height)))
  const data = ctx.getImageData(x, y, w, h).data
  let best = 0
  let pick: number[] = bg
  for (let i = 0; i < data.length; i += 4) {
    const d = Math.abs(data[i]! - bg[0]) + Math.abs(data[i + 1]! - bg[1]) + Math.abs(data[i + 2]! - bg[2])
    if (d > best) {
      best = d
      pick = [data[i]!, data[i + 1]!, data[i + 2]!]
    }
  }
  return best < 60 ? hex(bg[0] > 128 ? [22, 24, 29] : [255, 255, 255]) : hex(pick)
}

function sideColor(ctx: CanvasRenderingContext2D, b: TextBox, side: 'l' | 'r' | 't' | 'b'): [number, number, number] {
  const W = ctx.canvas.width
  const H = ctx.canvas.height
  const rs: number[] = []
  const gs: number[] = []
  const bs: number[] = []
  for (let i = 0; i <= 6; i++) {
    const f = i / 6
    const x = side === 'l' ? b.x - 4 : side === 'r' ? b.x + b.width + 4 : b.x + b.width * f
    const y = side === 't' ? b.y - 4 : side === 'b' ? b.y + b.height + 4 : b.y + b.height * f
    if (x < 0 || y < 0 || x >= W || y >= H) continue
    const [r, g, bl] = px(ctx, Math.round(x), Math.round(y))
    rs.push(r)
    gs.push(g)
    bs.push(bl)
  }
  return rs.length ? [median(rs), median(gs), median(bs)] : surroundingColor(ctx, b)
}

/** Paints over the text so editable copies can sit on top. Fills blend the colours on all four sides, so gradients stay smooth. */
export function paintOutText(canvas: HTMLCanvasElement, boxes: TextBox[]): void {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  const sides = boxes.map((b) => ({ l: sideColor(ctx, b, 'l'), r: sideColor(ctx, b, 'r'), t: sideColor(ctx, b, 't'), b: sideColor(ctx, b, 'b') }))
  const css = (v: number[]) => `rgb(${v.map(Math.round).join(',')})`
  boxes.forEach((b, i) => {
    const pad = Math.max(3, b.height * 0.16)
    const x = b.x - pad
    const y = b.y - pad
    const w = b.width + pad * 2
    const h = b.height + pad * 2
    const c = sides[i]!
    const hg = ctx.createLinearGradient(x, 0, x + w, 0)
    hg.addColorStop(0, css(c.l))
    hg.addColorStop(1, css(c.r))
    ctx.fillStyle = hg
    ctx.fillRect(x, y, w, h)
    const vg = ctx.createLinearGradient(0, y, 0, y + h)
    vg.addColorStop(0, css(c.t))
    vg.addColorStop(1, css(c.b))
    ctx.globalAlpha = 0.5
    ctx.fillStyle = vg
    ctx.fillRect(x, y, w, h)
    ctx.globalAlpha = 1
  })
}

/** Share of the box covered by strokes: heavy lettering is bold, thin lettering is regular. */
export function inkRatio(ctx: CanvasRenderingContext2D, b: TextBox): number {
  const bg = surroundingColor(ctx, b)
  const x = Math.max(0, Math.floor(b.x))
  const y = Math.max(0, Math.floor(b.y))
  const w = Math.max(1, Math.min(ctx.canvas.width - x, Math.ceil(b.width)))
  const h = Math.max(1, Math.min(ctx.canvas.height - y, Math.ceil(b.height)))
  const d = ctx.getImageData(x, y, w, h).data
  let ink = 0
  for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i]! - bg[0]) + Math.abs(d[i + 1]! - bg[1]) + Math.abs(d[i + 2]! - bg[2]) > 150) ink++
  return ink / (w * h)
}

/** Black on white mask of the text areas, for the server-side inpainting model. */
export function maskCanvas(width: number, height: number, boxes: TextBox[]): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = width
  c.height = height
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = '#fff'
  boxes.forEach((b) => {
    const pad = Math.max(3, b.height * 0.18)
    ctx.fillRect(b.x - pad, b.y - pad, b.width + pad * 2, b.height + pad * 2)
  })
  return c
}

/** Joins words on one baseline into a single box so a heading stays one editable line. */
export function mergeLines(boxes: TextBox[]): TextBox[] {
  const sorted = [...boxes].sort((a, b) => a.y - b.y || a.x - b.x)
  const out: TextBox[] = []
  for (const b of sorted) {
    const prev = out[out.length - 1]
    const sameLine = prev && Math.abs(prev.y + prev.height - (b.y + b.height)) < b.height * 0.35 && b.x - (prev.x + prev.width) < b.height * 1.2 && b.x >= prev.x
    if (sameLine) {
      const right = Math.max(prev.x + prev.width, b.x + b.width)
      prev.text = `${prev.text} ${b.text}`
      prev.width = right - prev.x
      prev.height = Math.max(prev.height, b.height)
      prev.fontSize = Math.max(prev.fontSize, b.fontSize)
      prev.bold = prev.bold || b.bold
    } else out.push({ ...b })
  }
  return out
}
