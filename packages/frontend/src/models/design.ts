export type ElementType = 'text' | 'shape' | 'image' | 'video' | 'audio' | 'icon' | 'chart' | 'table' | 'frame'

export type AnimationKind =
  | 'none'
  | 'fade'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'slide-down'
  | 'zoom'
  | 'spin'
  | 'pop'
  | 'blur'

export interface ElementAnimation {
  kind: AnimationKind
  duration: number
  delay: number
}

export interface BaseData {
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
  locked?: boolean
  hidden?: boolean
  name?: string
  groupId?: string
  animation?: ElementAnimation
  /** Last-writer-wins timestamp (ms) so out-of-order collaboration ops never overwrite newer edits. */
  ts?: number
  shadow?: { color: string; blur: number; x: number; y: number; opacity: number }
}

export interface TextData extends BaseData {
  text: string
  fontFamily: string
  fontSize: number
  fontWeight: number
  italic?: boolean
  underline?: boolean
  strike?: boolean
  fill: string
  align: 'left' | 'center' | 'right' | 'justify'
  lineHeight: number
  letterSpacing: number
  uppercase?: boolean
  /** -100..100: bends the text along an arc (positive arches up). */
  curve?: number
  list?: 'bullet' | 'number'
  stroke?: string
  strokeWidth?: number
  background?: string
}

export type ShapeKind = 'rect' | 'ellipse' | 'triangle' | 'star' | 'polygon' | 'line' | 'arrow' | 'heart' | 'diamond' | 'cross' | 'speech' | 'burst' | 'chevron'

export interface ShapeData extends BaseData {
  shape: ShapeKind
  fill: string
  stroke?: string
  strokeWidth: number
  cornerRadius?: number
  sides?: number
  dash?: boolean
  gradient?: { from: string; to: string; angle: number }
}

export interface Crop {
  x: number
  y: number
  width: number
  height: number
}

export interface ImageData extends BaseData {
  src: string
  naturalWidth?: number
  naturalHeight?: number
  crop?: Crop
  flipX?: boolean
  flipY?: boolean
  cornerRadius?: number
  filters?: { brightness: number; contrast: number; saturation: number; blur: number; grayscale: boolean }
  stroke?: string
  strokeWidth?: number
  alt?: string
}

export interface VideoData extends BaseData {
  src: string
  poster?: string
  muted: boolean
  loop: boolean
  trimStart?: number
  trimEnd?: number
  naturalDuration?: number
}

export interface AudioData extends BaseData {
  src: string
  title: string
  loop: boolean
  volume: number
}

export interface IconData extends BaseData {
  /** Inline SVG markup with a single fill colour that `fill` overrides. */
  svg: string
  fill: string
}

export type ChartKind = 'bar' | 'line' | 'pie' | 'donut' | 'area'

export interface ChartData extends BaseData {
  chart: ChartKind
  series: { label: string; value: number }[]
  colors: string[]
  showLabels: boolean
  title?: string
  textColor: string
  fontFamily: string
}

export interface TableData extends BaseData {
  cells: string[][]
  headerRow: boolean
  headerFill: string
  headerText: string
  cellFill: string
  cellText: string
  borderColor: string
  fontSize: number
  fontFamily: string
  colWidths: number[]
  rowHeight: number
}

export interface FrameData extends BaseData {
  frame: 'rect' | 'ellipse' | 'rounded' | 'star' | 'heart'
  fill: string
  src?: string
  imageScale?: number
  imageOffsetX?: number
  imageOffsetY?: number
}

interface Wrap<T extends ElementType, D extends BaseData> {
  id: string
  type: T
  zIndex: number
  data: D
}

export type TextElement = Wrap<'text', TextData>
export type ShapeElement = Wrap<'shape', ShapeData>
export type ImageElement = Wrap<'image', ImageData>
export type VideoElement = Wrap<'video', VideoData>
export type AudioElement = Wrap<'audio', AudioData>
export type IconElement = Wrap<'icon', IconData>
export type ChartElement = Wrap<'chart', ChartData>
export type TableElement = Wrap<'table', TableData>
export type FrameElement = Wrap<'frame', FrameData>

export type DesignElement =
  | TextElement
  | ShapeElement
  | ImageElement
  | VideoElement
  | AudioElement
  | IconElement
  | ChartElement
  | TableElement
  | FrameElement

export interface DesignPage {
  id: string
  name: string
  background: string
  durationSeconds?: number | null
  position: number
  elements: DesignElement[]
  notes?: string | null
}

export interface DesignDocument {
  projectId: number
  revision: number
  width: number
  height: number
  pages: DesignPage[]
}

export type PageBackground =
  | { type: 'solid'; color: string }
  | { type: 'gradient'; from: string; to: string; angle: number }
  | { type: 'image'; src: string; fit: 'cover' | 'contain' }

export function parseBackground(raw: string | null | undefined): PageBackground {
  if (!raw) return { type: 'solid', color: '#ffffff' }
  if (raw.startsWith('{')) {
    try {
      return JSON.parse(raw) as PageBackground
    } catch {
      /* fall through to solid */
    }
  }
  return { type: 'solid', color: raw }
}

export function serializeBackground(bg: PageBackground): string {
  return bg.type === 'solid' ? bg.color : JSON.stringify(bg)
}
