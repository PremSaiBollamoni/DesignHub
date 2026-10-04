import type { AnimationKind, ElementAnimation } from '@/models/design'

export interface AnimState {
  opacity: number
  dx: number
  dy: number
  scale: number
  rotation: number
}

export const NEUTRAL: AnimState = { opacity: 1, dx: 0, dy: 0, scale: 1, rotation: 0 }

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
const easeOutBack = (t: number) => {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

export const ANIMATION_LABEL: Record<AnimationKind, string> = {
  none: 'None',
  fade: 'Fade in',
  'slide-left': 'Slide from left',
  'slide-right': 'Slide from right',
  'slide-up': 'Rise up',
  'slide-down': 'Drop in',
  zoom: 'Zoom in',
  spin: 'Spin in',
  pop: 'Pop',
  blur: 'Reveal',
}

/** Pure function of time, so editor preview and video/GIF export always agree frame for frame. */
export function animationState(anim: ElementAnimation | undefined, t: number, pageW: number, pageH: number): AnimState {
  if (!anim || anim.kind === 'none') return NEUTRAL
  const raw = (t - anim.delay) / Math.max(0.05, anim.duration)
  if (raw >= 1) return NEUTRAL
  const p = Math.max(0, raw)
  const e = easeOutCubic(p)
  const distance = Math.min(pageW, pageH) * 0.18
  switch (anim.kind) {
    case 'fade':
    case 'blur':
      return { ...NEUTRAL, opacity: e }
    case 'slide-left':
      return { ...NEUTRAL, opacity: e, dx: -distance * (1 - e) }
    case 'slide-right':
      return { ...NEUTRAL, opacity: e, dx: distance * (1 - e) }
    case 'slide-up':
      return { ...NEUTRAL, opacity: e, dy: distance * (1 - e) }
    case 'slide-down':
      return { ...NEUTRAL, opacity: e, dy: -distance * (1 - e) }
    case 'zoom':
      return { ...NEUTRAL, opacity: e, scale: 0.6 + 0.4 * e }
    case 'spin':
      return { ...NEUTRAL, opacity: e, rotation: -180 * (1 - e), scale: 0.5 + 0.5 * e }
    case 'pop':
      return { ...NEUTRAL, opacity: Math.min(1, p * 3), scale: Math.max(0.01, easeOutBack(p)) }
  }
}

/** Seconds the page needs so every entrance animation finishes. */
export function naturalPageDuration(elements: { data: { animation?: ElementAnimation } }[], fallback = 5): number {
  let end = 0
  for (const e of elements) {
    const a = e.data.animation
    if (a && a.kind !== 'none') end = Math.max(end, a.delay + a.duration)
  }
  return Math.max(fallback, Math.ceil(end + 1))
}
