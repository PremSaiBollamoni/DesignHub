import type { DesignElement } from '@/models/design'
import { rotatedBounds, type Bounds } from '@/utils/geometry'

export interface SnapTargets {
  xs: number[]
  ys: number[]
}

export interface Guides {
  vertical: number[]
  horizontal: number[]
}

export const NO_GUIDES: Guides = { vertical: [], horizontal: [] }

/** Edges and centers of the page and every non-moving element: the lines a dragged box can lock onto. */
export function buildTargets(pageW: number, pageH: number, others: DesignElement[]): SnapTargets {
  const xs = [0, pageW / 2, pageW]
  const ys = [0, pageH / 2, pageH]
  for (const e of others) {
    if (e.data.hidden) continue
    const b = rotatedBounds(e.data, e.data.rotation)
    xs.push(b.left, (b.left + b.right) / 2, b.right)
    ys.push(b.top, (b.top + b.bottom) / 2, b.bottom)
  }
  return { xs, ys }
}

function nearest(values: number[], targets: number[], threshold: number): { delta: number; line: number } | null {
  let best: { delta: number; line: number } | null = null
  for (const v of values) {
    for (const t of targets) {
      const d = t - v
      if (Math.abs(d) <= threshold && (!best || Math.abs(d) < Math.abs(best.delta))) best = { delta: d, line: t }
    }
  }
  return best
}

/** Returns the correction to apply to the moving bounds plus the guide lines to draw. */
export function snapBounds(b: Bounds, targets: SnapTargets, threshold: number): { dx: number; dy: number; guides: Guides } {
  const sx = nearest([b.left, (b.left + b.right) / 2, b.right], targets.xs, threshold)
  const sy = nearest([b.top, (b.top + b.bottom) / 2, b.bottom], targets.ys, threshold)
  return {
    dx: sx?.delta ?? 0,
    dy: sy?.delta ?? 0,
    guides: { vertical: sx ? [sx.line] : [], horizontal: sy ? [sy.line] : [] },
  }
}
