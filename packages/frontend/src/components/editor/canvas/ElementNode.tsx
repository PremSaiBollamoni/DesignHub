import { memo, useCallback } from 'react'
import { Group } from 'react-konva'
import type Konva from 'konva'
import type { DesignElement } from '@/models/design'
import { animationState } from '@/services/render/animation'
import { useEditorStore } from '@/stores/editorStore'
import { TextBody } from './bodies/TextBody'
import { ShapeBody } from './bodies/ShapeBody'
import { ImageBody } from './bodies/ImageBody'
import { IconBody } from './bodies/IconBody'
import { FrameBody } from './bodies/FrameBody'
import { ChartBody } from './bodies/ChartBody'
import { TableBody } from './bodies/TableBody'
import { VideoBody } from './bodies/VideoBody'
import { AudioBody } from './bodies/AudioBody'

export interface NodeHandlers {
  onPointerDown: (id: string, additive: boolean) => void
  onDragStart: (id: string, node: Konva.Node) => void
  onDragMove: (id: string, node: Konva.Node) => void
  onDragEnd: (id: string, node: Konva.Node) => void
  onDblClick: (id: string) => void
  onContext: (id: string, x: number, y: number) => void
}

interface Props {
  element: DesignElement
  pageW: number
  pageH: number
  interactive: boolean
  time: number | null
  playMedia: boolean
  seekMedia?: number | null
  handlers?: NodeHandlers
  editingText?: boolean
}

function Body({ element, interactive, playMedia, seekMedia, editingText }: Pick<Props, 'element' | 'interactive' | 'playMedia' | 'seekMedia' | 'editingText'>) {
  switch (element.type) {
    case 'text':
      return <TextBody id={element.id} data={element.data} measure={interactive} hidden={editingText} />
    case 'shape':
      return <ShapeBody data={element.data} />
    case 'image':
      return <ImageBody data={element.data} />
    case 'icon':
      return <IconBody data={element.data} />
    case 'frame':
      return <FrameBody data={element.data} />
    case 'chart':
      return <ChartBody data={element.data} />
    case 'table':
      return <TableBody data={element.data} />
    case 'video':
      return <VideoBody id={element.id} data={element.data} autoplay={playMedia} seekTo={seekMedia} />
    case 'audio':
      return <AudioBody id={element.id} data={element.data} interactive={interactive} />
  }
}

export const ElementNode = memo(function ElementNode(props: Props) {
  const { element: el, pageW, pageH, interactive, time, handlers } = props
  const d = el.data
  const anim = time != null ? animationState(d.animation, time, pageW, pageH) : null
  const down = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!interactive || !handlers) return
      e.cancelBubble = true
      handlers.onPointerDown(el.id, 'shiftKey' in e.evt && (e.evt.shiftKey || (e.evt as MouseEvent).metaKey || (e.evt as MouseEvent).ctrlKey))
    },
    [interactive, handlers, el.id],
  )

  const shadow = d.shadow
  return (
    <Group
      id={el.id}
      name="element"
      x={d.x + d.width / 2 + (anim?.dx ?? 0)}
      y={d.y + d.height / 2 + (anim?.dy ?? 0)}
      offsetX={d.width / 2}
      offsetY={d.height / 2}
      rotation={d.rotation + (anim?.rotation ?? 0)}
      scaleX={anim?.scale ?? 1}
      scaleY={anim?.scale ?? 1}
      opacity={d.opacity * (anim?.opacity ?? 1)}
      visible={!d.hidden}
      draggable={interactive && !d.locked && !props.editingText}
      listening={interactive || el.type === 'audio'}
      shadowColor={shadow?.color}
      shadowBlur={shadow?.blur}
      shadowOffsetX={shadow?.x}
      shadowOffsetY={shadow?.y}
      shadowOpacity={shadow?.opacity}
      shadowEnabled={!!shadow}
      onMouseDown={down}
      onTouchStart={down}
      onDragStart={(e) => handlers?.onDragStart(el.id, e.target)}
      onDragMove={(e) => handlers?.onDragMove(el.id, e.target)}
      onDragEnd={(e) => handlers?.onDragEnd(el.id, e.target)}
      onContextMenu={(e) => {
        e.evt.preventDefault()
        e.cancelBubble = true
        handlers?.onContext(el.id, e.evt.clientX, e.evt.clientY)
      }}
      onDblClick={() => handlers?.onDblClick(el.id)}
      onDblTap={() => handlers?.onDblClick(el.id)}
    >
      <Body element={el} interactive={interactive} playMedia={props.playMedia} seekMedia={props.seekMedia} editingText={props.editingText} />
    </Group>
  )
})

/** Subscribes to exactly one element, so editing one object never re-renders its siblings. */
export const ConnectedElementNode = memo(function ConnectedElementNode({ id, ...rest }: Omit<Props, 'element' | 'editingText'> & { id: string; editingText: string | null }) {
  const element = useEditorStore((s) => s.elements[id])
  if (!element) return null
  return <ElementNode element={element} {...rest} editingText={rest.editingText === id} />
})
