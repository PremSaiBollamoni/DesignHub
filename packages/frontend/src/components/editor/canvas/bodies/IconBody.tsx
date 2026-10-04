import { Image as KImage, Rect } from 'react-konva'
import type { IconData } from '@/models/design'
import { useSvgImage } from '../hooks'

export function IconBody({ data: d }: { data: IconData }) {
  const img = useSvgImage(d.svg, d.fill)
  if (!img) return <Rect width={d.width} height={d.height} fill="rgba(128,128,128,0.15)" />
  return <KImage image={img} width={d.width} height={d.height} />
}
