import { useEffect, useRef, useState } from 'react'
import type { ImageData } from '@/models/design'
import { updateElements } from '@/editor/actions/elementActions'
import { useEditorStore } from '@/stores/editorStore'
import { useEditorUiStore } from '@/stores/editorUiStore'
import { Button } from '@/components/ui/Button'

type Handle = 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | 'image'
interface Rect {
  l: number
  t: number
  r: number
  b: number
}

const MIN = 24

/**
 * Non-destructive crop. The whole image is shown dimmed, the crop window is bright, and either can be dragged.
 * Applying stores a source-pixel crop on the element, so the original file is never altered.
 */
export function CropOverlay() {
  const id = useEditorUiStore((s) => s.croppingId)
  const setCropping = useEditorUiStore((s) => s.setCropping)
  const el = useEditorStore((s) => (id ? s.elements[id] : undefined))
  const zoom = useEditorUiStore((s) => s.zoom)
  const panX = useEditorUiStore((s) => s.panX)
  const panY = useEditorUiStore((s) => s.panY)
  const [win, setWin] = useState<Rect | null>(null)
  const [imgBox, setImgBox] = useState<Rect | null>(null)
  const drag = useRef<{ handle: Handle; x: number; y: number; win: Rect; img: Rect } | null>(null)

  const image = el && el.type === 'image' ? (el.data as ImageData) : null
  const nw = image?.naturalWidth ?? 0
  const nh = image?.naturalHeight ?? 0

  useEffect(() => {
    if (!image || !nw || !nh) {
      setWin(null)
      return
    }
    const c = image.crop ?? { x: 0, y: 0, width: nw, height: nh }
    const s = image.width / c.width
    setWin({ l: 0, t: 0, r: image.width, b: image.height })
    setImgBox({ l: -c.x * s, t: -c.y * s, r: (-c.x + nw) * s, b: (-c.y + nh) * s })
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!id) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCropping(null)
      if (e.key === 'Enter') apply()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }) // eslint-disable-line react-hooks/exhaustive-deps

  if (!id || !image || !win || !imgBox) return null

  const scale = (imgBox.r - imgBox.l) / nw

  function start(handle: Handle, e: React.PointerEvent) {
    e.preventDefault()
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    drag.current = { handle, x: e.clientX, y: e.clientY, win: { ...win! }, img: { ...imgBox! } }
  }

  function move(e: React.PointerEvent) {
    const d = drag.current
    if (!d) return
    const dx = (e.clientX - d.x) / zoom
    const dy = (e.clientY - d.y) / zoom
    if (d.handle === 'image') {
      // Slide the picture under a fixed window, but never expose empty space.
      const w = d.img.r - d.img.l
      const h = d.img.b - d.img.t
      const l = Math.min(d.win.l, Math.max(d.win.r - w, d.img.l + dx))
      const t = Math.min(d.win.t, Math.max(d.win.b - h, d.img.t + dy))
      setImgBox({ l, t, r: l + w, b: t + h })
      return
    }
    const next = { ...d.win }
    const h = d.handle
    if (h === 'move') {
      const w = d.win.r - d.win.l
      const hh = d.win.b - d.win.t
      next.l = Math.min(imgBox!.r - w, Math.max(imgBox!.l, d.win.l + dx))
      next.t = Math.min(imgBox!.b - hh, Math.max(imgBox!.t, d.win.t + dy))
      next.r = next.l + w
      next.b = next.t + hh
    } else {
      if (h.includes('w')) next.l = Math.min(d.win.r - MIN, Math.max(imgBox!.l, d.win.l + dx))
      if (h.includes('e')) next.r = Math.max(d.win.l + MIN, Math.min(imgBox!.r, d.win.r + dx))
      if (h.includes('n')) next.t = Math.min(d.win.b - MIN, Math.max(imgBox!.t, d.win.t + dy))
      if (h.includes('s')) next.b = Math.max(d.win.t + MIN, Math.min(imgBox!.b, d.win.b + dy))
    }
    setWin(next)
  }

  function apply() {
    const w = useEditorStore.getState().elements[id!]
    if (!w || w.type !== 'image' || !win || !imgBox) return
    const crop = {
      x: Math.max(0, (win.l - imgBox.l) / scale),
      y: Math.max(0, (win.t - imgBox.t) / scale),
      width: Math.min(nw, (win.r - win.l) / scale),
      height: Math.min(nh, (win.b - win.t) / scale),
    }
    updateElements([id!], { crop, x: w.data.x + win.l, y: w.data.y + win.t, width: win.r - win.l, height: win.b - win.t })
    setCropping(null)
  }

  const px = (v: number) => v * zoom
  const origin = { left: panX + image.x * zoom, top: panY + image.y * zoom }
  const rot = `rotate(${image.rotation}deg)`
  const handles: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
  return (
    <div className="crop" style={{ left: origin.left, top: origin.top, width: px(image.width), height: px(image.height), transform: rot, transformOrigin: 'center' }} onPointerMove={move} onPointerUp={() => (drag.current = null)}>
      <div className="crop__full" style={{ left: px(imgBox.l), top: px(imgBox.t), width: px(imgBox.r - imgBox.l), height: px(imgBox.b - imgBox.t) }} onPointerDown={(e) => start('image', e)}>
        <img src={image.src} alt="" draggable={false} crossOrigin="anonymous" />
      </div>
      <div className="crop__win" style={{ left: px(win.l), top: px(win.t), width: px(win.r - win.l), height: px(win.b - win.t) }} onPointerDown={(e) => start('move', e)}>
        <div className="crop__window-img" style={{ left: px(imgBox.l - win.l), top: px(imgBox.t - win.t), width: px(imgBox.r - imgBox.l), height: px(imgBox.b - imgBox.t) }}>
          <img src={image.src} alt="" draggable={false} crossOrigin="anonymous" />
        </div>
        {handles.map((h) => (
          <i key={h} className={`crop__h crop__h--${h}`} onPointerDown={(e) => start(h, e)} />
        ))}
      </div>
      <div className="crop__bar" style={{ top: px(win.t) - 46 < -panY - 10 ? px(win.b) + 10 : px(win.t) - 46, left: px(win.l) }} onPointerDown={(e) => e.stopPropagation()}>
        <Button size="sm" variant="primary" onClick={apply}>
          Apply crop
        </Button>
        <Button size="sm" onClick={() => setCropping(null)}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
