import type { AudioElement, ChartElement, FrameElement, IconElement, ImageElement, ShapeElement, TableElement, TextElement, VideoElement } from '@/models/design'
import { CommonProps } from './CommonProps'
import { ChartProps, FrameProps, IconProps, MediaProps, TableProps } from './OtherProps'
import { PageProps } from './PageProps'
import { ImageProps } from './ImageProps'
import { ShapeProps } from './ShapeProps'
import { TextProps } from './TextProps'
import { useSelectedElements } from './useSelection'
import { useEditorStore } from '@/stores/editorStore'

export function DesignTab() {
  const elements = useSelectedElements()
  const canEdit = useEditorStore((s) => s.access !== 'VIEWER' && s.access !== 'COMMENTER')
  if (!canEdit) return <p className="help">You can view and comment on this design. Ask the owner for edit access to change it.</p>
  if (!elements.length) return <PageProps />

  const type = elements.every((e) => e.type === elements[0]!.type) ? elements[0]!.type : null
  const label = elements.length > 1 ? `${elements.length} elements selected` : (elements[0]!.data.name ?? elements[0]!.type)
  return (
    <>
      <h3 style={{ fontFamily: 'var(--font-ui)', fontSize: 14, letterSpacing: 0, padding: '12px 0 0' }}>{label}</h3>
      {type === 'text' && <TextProps elements={elements as TextElement[]} />}
      {type === 'shape' && <ShapeProps elements={elements as ShapeElement[]} />}
      {type === 'image' && <ImageProps elements={elements as ImageElement[]} />}
      {type === 'frame' && <FrameProps elements={elements as FrameElement[]} />}
      {type === 'chart' && <ChartProps elements={elements as ChartElement[]} />}
      {type === 'table' && elements.length === 1 && <TableProps elements={elements as TableElement[]} />}
      {type === 'icon' && <IconProps elements={elements as IconElement[]} />}
      {(type === 'video' || type === 'audio') && elements.length === 1 && <MediaProps element={elements[0] as VideoElement | AudioElement} />}
      <CommonProps elements={elements} />
    </>
  )
}
