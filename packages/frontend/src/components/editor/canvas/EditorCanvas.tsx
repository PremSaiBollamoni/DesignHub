import { useCallback, useEffect, useRef, useState } from 'react'
import { Layer, Line, Rect, Stage } from 'react-konva'
import type Konva from 'konva'
import { useEditorStore } from '@/stores/editorStore'
import { useEditorUiStore } from '@/stores/editorUiStore'
import { rotatedBounds, intersects } from '@/utils/geometry'
import { insertStroke } from '@/editor/actions/creativeTools'
import { collabSession } from '@/services/realtime/collabSession'
import { EditablePageScene } from './PageScene'
import { SelectionLayer } from './SelectionLayer'
import { useNodeHandlers } from './useNodeHandlers'

interface Props {
  width: number
  height: number
}

const GRID = 50

type Marquee = { x: number; y: number; width: number; height: number }

export function EditorCanvas({ width: viewW, height: viewH }: Props) {
  const stageRef = useRef<Konva.Stage>(null)
  const getStage = useCallback(() => stageRef.current, [])
  const zoom = useEditorUiStore((s) => s.zoom)
  const panX = useEditorUiStore((s) => s.panX)
  const panY = useEditorUiStore((s) => s.panY)
  const playhead = useEditorUiStore((s) => s.playhead)
  const showGrid = useEditorUiStore((s) => s.showGrid)
  const drawing = useEditorUiStore((s) => s.drawing)
  const brush = useEditorUiStore((s) => s.brush)
  const [stroke, setStroke] = useState<number[]>([])
  const strokePts = useRef<{ x: number; y: number }[] | null>(null)
  const editingTextId = useEditorUiStore((s) => s.editingTextId)
  const pageW = useEditorStore((s) => s.width)
  const pageH = useEditorStore((s) => s.height)
  const pageId = useEditorStore((s) => s.currentPageId)
  const background = useEditorStore((s) => s.pages[s.currentPageId]?.background ?? '#ffffff')
  const ids = useEditorStore((s) => s.pageElementIds[s.currentPageId]) ?? []
  const { handlers, guides } = useNodeHandlers(getStage)
  const [marquee, setMarquee] = useState<Marquee | null>(null)
  const marqueeStart = useRef<{ x: number; y: number; additive: boolean } | null>(null)

  const pointer = () => stageRef.current?.getRelativePointerPosition() ?? null

  function onStageDown(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    if (playhead != null) return
    if (drawing) {
      const p0 = pointer()
      if (p0) {
        strokePts.current = [p0]
        setStroke([p0.x, p0.y])
      }
      return
    }
    const target = e.target
    if (target !== stageRef.current && target.name() !== 'page-bg') return
    if ((e.evt as MouseEvent).button === 1) return
    const p = pointer()
    if (!p) return
    const additive = 'shiftKey' in e.evt && e.evt.shiftKey
    if (!additive) useEditorStore.getState().select([])
    useEditorUiStore.getState().setCropping(null)
    useEditorUiStore.getState().setEditingText(null)
    marqueeStart.current = { x: p.x, y: p.y, additive }
  }

  function onStageContext(e: Konva.KonvaEventObject<PointerEvent>) {
    e.evt.preventDefault()
    if (e.target !== stageRef.current && e.target.name() !== 'page-bg') return
    useEditorStore.getState().select([])
    useEditorUiStore.getState().setContextMenu({ x: e.evt.clientX, y: e.evt.clientY })
  }

  function onStageMove() {
    const p = pointer()
    if (!p) return
    collabSession.sendCursor(p.x, p.y, pageId)
    if (strokePts.current) {
      strokePts.current.push(p)
      setStroke((cur) => [...cur, p.x, p.y])
      return
    }
    const start = marqueeStart.current
    if (!start) return
    setMarquee({ x: Math.min(start.x, p.x), y: Math.min(start.y, p.y), width: Math.abs(p.x - start.x), height: Math.abs(p.y - start.y) })
  }

  useEffect(() => {
    function finish() {
      if (strokePts.current) {
        const pts = strokePts.current
        strokePts.current = null
        setStroke([])
        const b = useEditorUiStore.getState().brush
        insertStroke(pts, b.color, b.size)
        return
      }
      const start = marqueeStart.current
      marqueeStart.current = null
      setMarquee((m) => {
        if (start && m && (m.width > 3 / zoom || m.height > 3 / zoom)) {
          const box = { left: m.x, top: m.y, right: m.x + m.width, bottom: m.y + m.height }
          const s = useEditorStore.getState()
          const hit = (s.pageElementIds[s.currentPageId] ?? []).filter((id) => {
            const el = s.elements[id]!
            return !el.data.hidden && !el.data.locked && intersects(box, rotatedBounds(el.data, el.data.rotation))
          })
          s.select(hit, { additive: start.additive })
        }
        return null
      })
    }
    window.addEventListener('mouseup', finish)
    return () => window.removeEventListener('mouseup', finish)
  }, [zoom])

  return (
    <Stage ref={stageRef} width={viewW} height={viewH} x={panX} y={panY} scaleX={zoom} scaleY={zoom} onMouseDown={onStageDown} onTouchStart={onStageDown} onMouseMove={onStageMove} onContextMenu={onStageContext}>
      <Layer listening={false}>
        <Rect width={pageW} height={pageH} fill="#ffffff" shadowColor="#000" shadowBlur={32} shadowOpacity={0.22} shadowOffsetY={8} />
      </Layer>
      <Layer listening={!drawing}>
        <EditablePageScene key={pageId} background={background} ids={ids} width={pageW} height={pageH} time={playhead} handlers={handlers} editingText={editingTextId} />
      </Layer>
      {showGrid && (
        <Layer listening={false}>
          {Array.from({ length: Math.floor(pageW / GRID) + 1 }, (_, i) => (
            <Line key={`gx${i}`} points={[i * GRID, 0, i * GRID, pageH]} stroke="#8a8a96" opacity={i % 5 === 0 ? 0.35 : 0.18} strokeWidth={1 / zoom} />
          ))}
          {Array.from({ length: Math.floor(pageH / GRID) + 1 }, (_, i) => (
            <Line key={`gy${i}`} points={[0, i * GRID, pageW, i * GRID]} stroke="#8a8a96" opacity={i % 5 === 0 ? 0.35 : 0.18} strokeWidth={1 / zoom} />
          ))}
        </Layer>
      )}
      {drawing && (
        <Layer listening={false}>
          <Line points={stroke} stroke={brush.color} strokeWidth={brush.size} lineCap="round" lineJoin="round" tension={0.4} />
        </Layer>
      )}
      {playhead == null && !drawing && <SelectionLayer stage={getStage} guides={guides} zoom={zoom} pageW={pageW} pageH={pageH} marquee={marquee} />}
    </Stage>
  )
}
