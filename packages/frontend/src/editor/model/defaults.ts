import type {
  AudioElement,
  BaseData,
  ChartElement,
  ElementAnimation,
  FrameElement,
  IconElement,
  ImageElement,
  ShapeElement,
  ShapeKind,
  TableElement,
  TextElement,
  VideoElement,
} from '@/models/design'
import { uid } from '@/utils/common'

export const DEFAULT_ANIMATION: ElementAnimation = { kind: 'fade', duration: 0.8, delay: 0 }

function base(x: number, y: number, width: number, height: number, name: string): BaseData {
  return { x, y, width, height, rotation: 0, opacity: 1, name }
}

export interface Origin {
  /** Page-space center where the new element should land. */
  cx: number
  cy: number
}

const place = (o: Origin, w: number, h: number) => ({ x: Math.round(o.cx - w / 2), y: Math.round(o.cy - h / 2) })

export type TextPreset = 'heading' | 'subheading' | 'body'

const TEXT_PRESETS: Record<TextPreset, { text: string; size: number; weight: number; family: string; name: string }> = {
  heading: { text: 'Add a heading', size: 96, weight: 800, family: 'Bricolage Grotesque', name: 'Heading' },
  subheading: { text: 'Add a subheading', size: 52, weight: 600, family: 'Inter Tight', name: 'Subheading' },
  body: { text: 'Add a little bit of body text', size: 32, weight: 400, family: 'Inter Tight', name: 'Body text' },
}

export function createText(o: Origin, preset: TextPreset = 'body', overrides: Partial<TextElement['data']> = {}): TextElement {
  const p = TEXT_PRESETS[preset]
  const width = Math.round(Math.max(p.size * 7, 360))
  const height = Math.round(p.size * 1.2)
  return {
    id: uid(),
    type: 'text',
    zIndex: 0,
    data: {
      ...base(place(o, width, height).x, place(o, width, height).y, width, height, p.name),
      text: p.text,
      fontFamily: p.family,
      fontSize: p.size,
      fontWeight: p.weight,
      fill: '#151515',
      align: 'left',
      lineHeight: 1.15,
      letterSpacing: 0,
      ...overrides,
    },
  }
}

export function createShape(o: Origin, shape: ShapeKind, fill = '#FF5A36', size = 320): ShapeElement {
  const line = shape === 'line' || shape === 'arrow'
  const width = line ? size : size
  const height = line ? 0 : shape === 'rect' ? Math.round(size * 0.7) : size
  const p = place(o, width, height)
  return {
    id: uid(),
    type: 'shape',
    zIndex: 0,
    data: {
      ...base(p.x, p.y, width, height, shapeName(shape)),
      shape,
      fill: line ? 'transparent' : fill,
      stroke: line ? fill : undefined,
      strokeWidth: line ? 8 : 0,
      cornerRadius: 0,
      sides: shape === 'polygon' ? 6 : undefined,
    },
  }
}

function shapeName(shape: ShapeKind) {
  return shape === 'rect' ? 'Rectangle' : shape.charAt(0).toUpperCase() + shape.slice(1)
}

export function createImage(o: Origin, src: string, naturalWidth: number, naturalHeight: number, maxSize: number): ImageElement {
  const scale = Math.min(1, maxSize / Math.max(naturalWidth, naturalHeight))
  const width = Math.max(8, Math.round(naturalWidth * scale))
  const height = Math.max(8, Math.round(naturalHeight * scale))
  const p = place(o, width, height)
  return { id: uid(), type: 'image', zIndex: 0, data: { ...base(p.x, p.y, width, height, 'Image'), src, naturalWidth, naturalHeight } }
}

export function createVideo(o: Origin, src: string, naturalWidth: number, naturalHeight: number, duration: number, maxSize: number): VideoElement {
  const scale = Math.min(1, maxSize / Math.max(naturalWidth, naturalHeight))
  const width = Math.round(naturalWidth * scale)
  const height = Math.round(naturalHeight * scale)
  const p = place(o, width, height)
  return {
    id: uid(),
    type: 'video',
    zIndex: 0,
    data: { ...base(p.x, p.y, width, height, 'Video'), src, muted: true, loop: true, naturalDuration: duration },
  }
}

export function createAudio(o: Origin, src: string, title: string): AudioElement {
  const p = place(o, 420, 96)
  return { id: uid(), type: 'audio', zIndex: 0, data: { ...base(p.x, p.y, 420, 96, title), src, title, loop: false, volume: 1 } }
}

export function createIcon(o: Origin, svg: string, fill = '#151515', size = 220, name = 'Graphic'): IconElement {
  const p = place(o, size, size)
  return { id: uid(), type: 'icon', zIndex: 0, data: { ...base(p.x, p.y, size, size, name), svg, fill } }
}

export function createChart(o: Origin, chart: ChartElement['data']['chart'], palette: string[]): ChartElement {
  const w = 640
  const h = 420
  const p = place(o, w, h)
  return {
    id: uid(),
    type: 'chart',
    zIndex: 0,
    data: {
      ...base(p.x, p.y, w, h, 'Chart'),
      chart,
      series: [
        { label: 'Q1', value: 42 },
        { label: 'Q2', value: 68 },
        { label: 'Q3', value: 55 },
        { label: 'Q4', value: 84 },
      ],
      colors: palette,
      showLabels: true,
      textColor: '#151515',
      fontFamily: 'Inter Tight',
    },
  }
}

export function createTable(o: Origin, rows = 4, cols = 3): TableElement {
  const colWidth = 200
  const rowHeight = 64
  const w = colWidth * cols
  const h = rowHeight * rows
  const p = place(o, w, h)
  const cells = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => (r === 0 ? `Column ${c + 1}` : '')))
  return {
    id: uid(),
    type: 'table',
    zIndex: 0,
    data: {
      ...base(p.x, p.y, w, h, 'Table'),
      cells,
      headerRow: true,
      headerFill: '#FF5A36',
      headerText: '#FFFFFF',
      cellFill: '#FFFFFF',
      cellText: '#151515',
      borderColor: '#D8D5CC',
      fontSize: 24,
      fontFamily: 'Inter Tight',
      colWidths: Array(cols).fill(colWidth),
      rowHeight,
    },
  }
}

export function createFrame(o: Origin, frame: FrameElement['data']['frame']): FrameElement {
  const size = 420
  const p = place(o, size, size)
  return { id: uid(), type: 'frame', zIndex: 0, data: { ...base(p.x, p.y, size, size, 'Frame'), frame, fill: '#E4E2DC' } }
}
