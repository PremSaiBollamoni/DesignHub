import { Group, Rect, Text } from 'react-konva'
import type Konva from 'konva'
import { Image as KImage } from 'react-konva'
import type { FrameData } from '@/models/design'
import { useLoadedImage } from '../hooks'

function clipFor(d: FrameData) {
  return (ctx: Konva.Context) => {
    const w = d.width
    const h = d.height
    ctx.beginPath()
    switch (d.frame) {
      case 'ellipse':
        ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
        break
      case 'rounded': {
        const r = Math.min(w, h) * 0.12
        ctx.moveTo(r, 0)
        ctx.arcTo(w, 0, w, h, r)
        ctx.arcTo(w, h, 0, h, r)
        ctx.arcTo(0, h, 0, 0, r)
        ctx.arcTo(0, 0, w, 0, r)
        break
      }
      case 'star': {
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? 1 : 0.46
          const a = (Math.PI * i) / 5 - Math.PI / 2
          const px = w / 2 + (Math.cos(a) * w * r) / 2
          const py = h / 2 + (Math.sin(a) * h * r) / 2
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        break
      }
      case 'heart': {
        const X = (v: number) => (v * w) / 100
        const Y = (v: number) => (v * h) / 100
        ctx.moveTo(X(50), Y(92))
        ctx.bezierCurveTo(X(8), Y(62), X(-2), Y(34), X(18), Y(14))
        ctx.bezierCurveTo(X(34), Y(-1), X(50), Y(14), X(50), Y(24))
        ctx.bezierCurveTo(X(50), Y(14), X(66), Y(-1), X(82), Y(14))
        ctx.bezierCurveTo(X(102), Y(34), X(92), Y(62), X(50), Y(92))
        break
      }
      default:
        ctx.rect(0, 0, w, h)
    }
    ctx.closePath()
  }
}

/** A frame clips its image to a shape. The image is positioned with scale and offset, never destructively cropped. */
export function FrameBody({ data: d }: { data: FrameData }) {
  const img = useLoadedImage(d.src)
  let imageProps: { x: number; y: number; width: number; height: number } | null = null
  if (img) {
    const cover = Math.max(d.width / img.width, d.height / img.height) * (d.imageScale ?? 1)
    const w = img.width * cover
    const h = img.height * cover
    imageProps = { width: w, height: h, x: (d.width - w) / 2 + (d.imageOffsetX ?? 0), y: (d.height - h) / 2 + (d.imageOffsetY ?? 0) }
  }
  return (
    <Group clipFunc={clipFor(d)}>
      <Rect width={d.width} height={d.height} fill={d.fill} />
      {img && imageProps ? (
        <KImage image={img} {...imageProps} />
      ) : (
        <Text
          width={d.width}
          height={d.height}
          text="Drop an image here"
          align="center"
          verticalAlign="middle"
          fontSize={Math.max(14, Math.min(d.width, d.height) * 0.07)}
          fontFamily="Inter Tight"
          fill="#868B95"
          listening={false}
        />
      )}
    </Group>
  )
}
