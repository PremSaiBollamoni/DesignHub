import { Group, Image as KImage, Rect } from 'react-konva'
import { parseBackground, type DesignElement } from '@/models/design'
import { useLoadedImage } from './hooks'
import { ElementNode, ConnectedElementNode, type NodeHandlers } from './ElementNode'

export function PageBackground({ background, width, height, interactive }: { background: string; width: number; height: number; interactive: boolean }) {
  const bg = parseBackground(background)
  const img = useLoadedImage(bg.type === 'image' ? bg.src : undefined)
  if (bg.type === 'image' && img) {
    const scale = bg.fit === 'contain' ? Math.min(width / img.width, height / img.height) : Math.max(width / img.width, height / img.height)
    const w = img.width * scale
    const h = img.height * scale
    return (
      <Group name="page-bg">
        <Rect width={width} height={height} fill="#ffffff" listening={interactive} name="page-bg" />
        <KImage image={img} x={(width - w) / 2} y={(height - h) / 2} width={w} height={h} listening={false} />
      </Group>
    )
  }
  if (bg.type === 'gradient') {
    const rad = (bg.angle * Math.PI) / 180
    const len = Math.max(width, height) / 2
    return (
      <Rect
        name="page-bg"
        width={width}
        height={height}
        listening={interactive}
        fillLinearGradientStartPoint={{ x: width / 2 - Math.cos(rad) * len, y: height / 2 - Math.sin(rad) * len }}
        fillLinearGradientEndPoint={{ x: width / 2 + Math.cos(rad) * len, y: height / 2 + Math.sin(rad) * len }}
        fillLinearGradientColorStops={[0, bg.from, 1, bg.to]}
      />
    )
  }
  return <Rect name="page-bg" width={width} height={height} listening={interactive} fill={bg.type === 'solid' ? bg.color : '#ffffff'} />
}

interface StaticProps {
  background: string
  elements: DesignElement[]
  width: number
  height: number
  time: number | null
  playMedia?: boolean
  seekMedia?: number | null
}

/** Pure render of one page from plain data. Used by present mode, share view, exports and thumbnails. */
export function StaticPageScene({ background, elements, width, height, time, playMedia = false, seekMedia = null }: StaticProps) {
  return (
    <>
      <PageBackground background={background} width={width} height={height} interactive={false} />
      <Group clipX={0} clipY={0} clipWidth={width} clipHeight={height} listening={false}>
        {elements.map((el) => (
          <ElementNode key={el.id} element={el} pageW={width} pageH={height} interactive={false} time={time} playMedia={playMedia} seekMedia={seekMedia} />
        ))}
      </Group>
    </>
  )
}

interface EditProps {
  background: string
  ids: string[]
  width: number
  height: number
  time: number | null
  handlers: NodeHandlers
  editingText: string | null
}

/** Editable page. Each element subscribes to the store on its own. */
export function EditablePageScene({ background, ids, width, height, time, handlers, editingText }: EditProps) {
  return (
    <>
      <PageBackground background={background} width={width} height={height} interactive />
      <Group clipX={0} clipY={0} clipWidth={width} clipHeight={height}>
        {ids.map((id) => (
          <ConnectedElementNode key={id} id={id} pageW={width} pageH={height} interactive={time == null} time={time} playMedia={time != null} handlers={handlers} editingText={editingText} />
        ))}
      </Group>
    </>
  )
}
