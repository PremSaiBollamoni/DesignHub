import { useEffect, useRef, useState, type DragEvent } from 'react'
import { useEditorStore } from '@/stores/editorStore'
import { useEditorUiStore } from '@/stores/editorUiStore'
import { clamp } from '@/utils/common'
import { fitScale } from '@/utils/geometry'
import { dropOntoCanvas } from '@/editor/actions/dropActions'
import { EditorCanvas } from './EditorCanvas'
import { TextEditOverlay } from './TextEditOverlay'
import { CropOverlay } from './CropOverlay'
import { RemoteCursors } from './RemoteCursors'
import { CommentPins } from './CommentPins'
import { CanvasContextMenu } from './CanvasContextMenu'
import { Rulers } from './Rulers'

const MIN_ZOOM = 0.05
const MAX_ZOOM = 8

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
}

export function CanvasWorkspace() {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [panning, setPanning] = useState(false)
  const spaceDown = useRef(false)
  const dragStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const pageW = useEditorStore((s) => s.width)
  const pageH = useEditorStore((s) => s.height)
  const pageId = useEditorStore((s) => s.currentPageId)
  const autoFit = useEditorUiStore((s) => s.autoFit)
  const zoom = useEditorUiStore((s) => s.zoom)
  const setView = useEditorUiStore((s) => s.setView)
  const rightOpen = useEditorUiStore((s) => s.rightOpen)
  const leftPanel = useEditorUiStore((s) => s.leftPanel)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const r = entry!.contentRect
      setSize({ w: Math.floor(r.width), h: Math.floor(r.height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Fit the page into view until the person takes over zoom or pan.
  useEffect(() => {
    if (!autoFit || !size.w || !size.h) return
    const z = clamp(fitScale(pageW, pageH, size.w, size.h, size.w < 700 ? 24 : 64), MIN_ZOOM, 2)
    setView({ zoom: z, panX: (size.w - pageW * z) / 2, panY: (size.h - pageH * z) / 2 })
  }, [autoFit, size.w, size.h, pageW, pageH, pageId, rightOpen, leftPanel, setView])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const ui = useEditorUiStore.getState()
      const rect = el.getBoundingClientRect()
      if (e.ctrlKey || e.metaKey) {
        const px = e.clientX - rect.left
        const py = e.clientY - rect.top
        const next = clamp(ui.zoom * Math.exp(-e.deltaY * 0.0022), MIN_ZOOM, MAX_ZOOM)
        const ratio = next / ui.zoom
        ui.setView({ zoom: next, panX: px - (px - ui.panX) * ratio, panY: py - (py - ui.panY) * ratio, autoFit: false })
      } else {
        ui.setView({ panX: ui.panX - e.deltaX, panY: ui.panY - e.deltaY, autoFit: false })
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isTyping(e.target)) {
        e.preventDefault()
        spaceDown.current = true
        ref.current?.classList.add('is-pan-ready')
      }
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceDown.current = false
        ref.current?.classList.remove('is-pan-ready')
      }
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  function onPointerDownCapture(e: React.PointerEvent) {
    if (e.button === 1 || (spaceDown.current && e.button === 0)) {
      e.preventDefault()
      e.stopPropagation()
      const ui = useEditorUiStore.getState()
      dragStart.current = { x: e.clientX, y: e.clientY, panX: ui.panX, panY: ui.panY }
      setPanning(true)
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    }
  }
  function onPointerMove(e: React.PointerEvent) {
    const s = dragStart.current
    if (!s) return
    useEditorUiStore.getState().setView({ panX: s.panX + e.clientX - s.x, panY: s.panY + e.clientY - s.y, autoFit: false })
  }
  function endPan() {
    dragStart.current = null
    setPanning(false)
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    const rect = ref.current!.getBoundingClientRect()
    const ui = useEditorUiStore.getState()
    const point = { x: (e.clientX - rect.left - ui.panX) / ui.zoom, y: (e.clientY - rect.top - ui.panY) / ui.zoom }
    void dropOntoCanvas(e.dataTransfer, point)
  }

  return (
    <div
      ref={ref}
      className={`workspace ${panning ? 'is-panning' : ''}`}
      onPointerDownCapture={onPointerDownCapture}
      onPointerMove={onPointerMove}
      onPointerUp={endPan}
      onPointerCancel={endPan}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      data-zoom={zoom}
    >
      {size.w > 0 && <EditorCanvas width={size.w} height={size.h} />}
      <Rulers width={pageW} height={pageH} />
      <RemoteCursors />
      <CommentPins />
      <TextEditOverlay />
      <CropOverlay />
      <CanvasContextMenu />
    </div>
  )
}
