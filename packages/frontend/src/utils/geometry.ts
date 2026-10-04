export interface Box {
  x: number
  y: number
  width: number
  height: number
}

export interface Bounds {
  left: number
  top: number
  right: number
  bottom: number
}

/** Axis-aligned bounds of a box rotated around its own center (degrees). */
export function rotatedBounds(b: Box, rotation: number): Bounds {
  if (!rotation) return { left: b.x, top: b.y, right: b.x + b.width, bottom: b.y + b.height }
  const rad = (rotation * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const cx = b.x + b.width / 2
  const cy = b.y + b.height / 2
  const hw = b.width / 2
  const hh = b.height / 2
  const xs: number[] = []
  const ys: number[] = []
  for (const [px, py] of [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ] as const) {
    xs.push(cx + px * cos - py * sin)
    ys.push(cy + px * sin + py * cos)
  }
  return { left: Math.min(...xs), top: Math.min(...ys), right: Math.max(...xs), bottom: Math.max(...ys) }
}

export function unionBounds(list: Bounds[]): Bounds {
  return {
    left: Math.min(...list.map((b) => b.left)),
    top: Math.min(...list.map((b) => b.top)),
    right: Math.max(...list.map((b) => b.right)),
    bottom: Math.max(...list.map((b) => b.bottom)),
  }
}

export function intersects(a: Bounds, b: Bounds): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

export function fitScale(contentW: number, contentH: number, viewW: number, viewH: number, padding = 48): number {
  const sw = (viewW - padding * 2) / contentW
  const sh = (viewH - padding * 2) / contentH
  return Math.max(0.05, Math.min(sw, sh))
}
