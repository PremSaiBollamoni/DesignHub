import { Arrow, Ellipse, Line, Path, Rect } from 'react-konva'
import type { ShapeData } from '@/models/design'

const PATHS: Record<string, string> = {
  cross: 'M35 5h30v30h30v30H65v30H35V65H5V35h30z',
  speech: 'M10 8h80a6 6 0 0 1 6 6v50a6 6 0 0 1-6 6H46L24 94V70H10a6 6 0 0 1-6-6V14a6 6 0 0 1 6-6z',
  chevron: 'M4 12h48l44 38-44 38H4l44-38z',
}

const HEART = 'M50 92 C8 62 -2 34 18 14 C34 -1 50 14 50 24 C50 14 66 -1 82 14 C102 34 92 62 50 92 Z'

function polygonPoints(w: number, h: number, sides: number): number[] {
  const pts: number[] = []
  for (let i = 0; i < sides; i++) {
    const a = (Math.PI * 2 * i) / sides - Math.PI / 2
    pts.push(w / 2 + (Math.cos(a) * w) / 2, h / 2 + (Math.sin(a) * h) / 2)
  }
  return pts
}

function starPoints(w: number, h: number, spikes = 5, inner = 0.46): number[] {
  const pts: number[] = []
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? 1 : inner
    const a = (Math.PI * i) / spikes - Math.PI / 2
    pts.push(w / 2 + (Math.cos(a) * w * r) / 2, h / 2 + (Math.sin(a) * h * r) / 2)
  }
  return pts
}

function gradientProps(d: ShapeData) {
  if (!d.gradient) return {}
  const rad = (d.gradient.angle * Math.PI) / 180
  const cx = d.width / 2
  const cy = d.height / 2
  const len = Math.max(d.width, d.height) / 2
  return {
    fillLinearGradientStartPoint: { x: cx - Math.cos(rad) * len, y: cy - Math.sin(rad) * len },
    fillLinearGradientEndPoint: { x: cx + Math.cos(rad) * len, y: cy + Math.sin(rad) * len },
    fillLinearGradientColorStops: [0, d.gradient.from, 1, d.gradient.to],
    fill: undefined,
  }
}

export function ShapeBody({ data: d }: { data: ShapeData }) {
  const stroke = d.stroke && d.strokeWidth > 0 ? d.stroke : undefined
  const common = {
    fill: d.fill === 'transparent' ? undefined : d.fill,
    stroke,
    strokeWidth: stroke ? d.strokeWidth : 0,
    dash: d.dash && stroke ? [d.strokeWidth * 2, d.strokeWidth * 1.5] : undefined,
    ...gradientProps(d),
  }
  const w = d.width
  const h = d.height
  switch (d.shape) {
    case 'rect':
      return <Rect width={w} height={h} cornerRadius={d.cornerRadius ?? 0} {...common} />
    case 'ellipse':
      return <Ellipse x={w / 2} y={h / 2} radiusX={Math.max(0.5, w / 2)} radiusY={Math.max(0.5, h / 2)} {...common} />
    case 'triangle':
      return <Line points={[w / 2, 0, w, h, 0, h]} closed lineJoin="round" {...common} />
    case 'diamond':
      return <Line points={[w / 2, 0, w, h / 2, w / 2, h, 0, h / 2]} closed lineJoin="round" {...common} />
    case 'star':
      return <Line points={starPoints(w, h)} closed lineJoin="round" {...common} />
    case 'polygon':
      return <Line points={polygonPoints(w, h, d.sides ?? 6)} closed lineJoin="round" {...common} />
    case 'heart':
      return <Path data={HEART} scaleX={w / 100} scaleY={h / 100} {...common} strokeScaleEnabled={false} />
    case 'cross':
    case 'speech':
    case 'chevron':
      return <Path data={PATHS[d.shape]!} scaleX={w / 100} scaleY={h / 100} {...common} strokeScaleEnabled={false} />
    case 'burst':
      return <Line points={starPoints(w, h, 14, 0.8)} closed lineJoin="round" {...common} />
    case 'line':
      return <Line points={[0, 0, w, 0]} stroke={d.stroke ?? d.fill} strokeWidth={d.strokeWidth || 6} lineCap="round" hitStrokeWidth={Math.max(16, d.strokeWidth)} dash={common.dash} />
    case 'arrow':
      return (
        <Arrow
          points={[0, 0, w, 0]}
          stroke={d.stroke ?? d.fill}
          fill={d.stroke ?? d.fill}
          strokeWidth={d.strokeWidth || 6}
          pointerLength={Math.max(14, d.strokeWidth * 3)}
          pointerWidth={Math.max(14, d.strokeWidth * 3)}
          lineCap="round"
          hitStrokeWidth={Math.max(16, d.strokeWidth)}
          dash={common.dash}
        />
      )
  }
}
