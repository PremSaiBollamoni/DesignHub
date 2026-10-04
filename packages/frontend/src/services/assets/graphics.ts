import { ICONS, type IconName } from '@/components/ui/iconPaths'

export interface Graphic {
  id: string
  name: string
  svg: string
  /** True when the artwork carries its own colors and ignores the tint. */
  colored?: boolean
}

function strokeSvg(paths: string): string {
  const body = paths
    .split('|')
    .map((d) => `<path d="${d}"/>`)
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`
}

const GRAPHIC_ICONS: IconName[] = [
  'star', 'heart', 'bell', 'user', 'users', 'home', 'folder', 'mail', 'calendar', 'clock', 'tag', 'link', 'search', 'settings', 'image', 'video', 'audio',
  'chart', 'table', 'sparkle', 'magic', 'send', 'share', 'download', 'upload', 'play', 'pin', 'card', 'sun', 'moon', 'check', 'info', 'alert', 'cursor', 'hand',
  'layers', 'template', 'shapes', 'text', 'brand', 'pen', 'scissors', 'crop', 'rotate', 'refresh', 'eye', 'lock', 'comment', 'history',
]

export const LINE_ICONS: Graphic[] = GRAPHIC_ICONS.map((name) => ({ id: `icon-${name}`, name, svg: strokeSvg(ICONS[name]) }))

const svg = (inner: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">${inner}</svg>`

/** Hand-built vector art, so the library works with no external service. Colors are baked in. */
export const ILLUSTRATIONS: Graphic[] = [
  { id: 'sun-hills', name: 'Sun over hills', colored: true, svg: svg('<circle cx="100" cy="80" r="42" fill="#FFB020"/><path d="M0 200V140q50-50 100-10t100-20v90z" fill="#FF5A36"/><path d="M0 200v-30q60-40 110 0t90-10v40z" fill="#151515"/>') },
  { id: 'blob-orange', name: 'Orange blob', colored: true, svg: svg('<path d="M148 40c30 24 38 66 20 98s-62 52-98 38S14 126 28 86 118 16 148 40z" fill="#FFB547"/>') },
  { id: 'blob-blue', name: 'Blue blob', colored: true, svg: svg('<path d="M160 52c26 28 22 74-6 102s-76 36-104 8S22 82 54 54s80-30 106-2z" fill="#FF5A36"/>') },
  { id: 'waves', name: 'Waves', colored: true, svg: svg('<path d="M0 70q25-30 50 0t50 0 50 0 50 0v40q-25 30-50 0t-50 0-50 0-50 0z" fill="#FF5A36"/><path d="M0 130q25-30 50 0t50 0 50 0 50 0v40q-25 30-50 0t-50 0-50 0-50 0z" fill="#FFB547"/>') },
  { id: 'leaf', name: 'Leaf', colored: true, svg: svg('<path d="M30 170C20 80 80 20 176 24c4 96-52 156-140 150z" fill="#0C8A6A"/><path d="M36 168C70 110 110 76 160 40" stroke="#E4F6EF" stroke-width="6" fill="none" stroke-linecap="round"/>') },
  { id: 'burst', name: 'Burst', colored: true, svg: svg('<path d="M100 8l16 38 38-16-16 38 38 16-38 16 16 38-38-16-16 38-16-38-38 16 16-38-38-16 38-16-16-38 38 16z" fill="#FFB547"/>') },
  { id: 'rings', name: 'Rings', colored: true, svg: svg('<circle cx="100" cy="100" r="86" fill="none" stroke="#151515" stroke-width="10"/><circle cx="100" cy="100" r="56" fill="none" stroke="#FF5A36" stroke-width="10"/><circle cx="100" cy="100" r="26" fill="#FFB547"/>') },
  { id: 'mountains', name: 'Mountains', colored: true, svg: svg('<path d="M0 180L70 70l40 60 30-40 60 90z" fill="#151515"/><path d="M70 70l16 24-16-8-16 8z" fill="#fff"/><circle cx="150" cy="50" r="20" fill="#FFB020"/>') },
  { id: 'cloud', name: 'Cloud', colored: true, svg: svg('<path d="M52 140a34 34 0 0 1 2-68 46 46 0 0 1 88 8 30 30 0 0 1 4 60z" fill="#DCE3FF"/>') },
  { id: 'arch', name: 'Arch', colored: true, svg: svg('<path d="M30 180V100a70 70 0 0 1 140 0v80z" fill="#FFB547"/><path d="M62 180V104a38 38 0 0 1 76 0v76z" fill="#FFEAE4"/>') },
  { id: 'dots', name: 'Dot grid', colored: true, svg: svg(Array.from({ length: 36 }, (_, i) => `<circle cx="${25 + (i % 6) * 30}" cy="${25 + Math.floor(i / 6) * 30}" r="6" fill="#FF5A36"/>`).join('')) },
  { id: 'squiggle', name: 'Squiggle', colored: true, svg: svg('<path d="M10 100q20-50 40 0t40 0 40 0 40 0 20-10" fill="none" stroke="#FFB547" stroke-width="12" stroke-linecap="round"/>') },
  { id: 'checker', name: 'Checkerboard', colored: true, svg: svg(Array.from({ length: 16 }, (_, i) => ((i % 4) + Math.floor(i / 4)) % 2 === 0 ? `<rect x="${(i % 4) * 50}" y="${Math.floor(i / 4) * 50}" width="50" height="50" fill="#151515"/>` : '').join('')) },
]
