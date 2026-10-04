import { useEffect, useRef, useState } from 'react'
import { updateElements } from '@/editor/actions/elementActions'
import { aiApi } from '@/services/api/aiApi'
import { loadImage } from '@/services/render/imageCache'
import { canvasToBlob } from '@/services/export/exportTypes'
import { useEditorStore } from '@/stores/editorStore'
import { errorMessage, toast } from '@/stores/toastStore'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

/** Paint over what should disappear; the ML worker fills the area in from its surroundings. */
export function EraserModal({ elementId, onClose }: { elementId: string; onClose: () => void }) {
  const el = useEditorStore((s) => s.elements[elementId])
  const src = el?.type === 'image' ? el.data.src : ''
  const view = useRef<HTMLCanvasElement>(null)
  const mask = useRef<HTMLCanvasElement | null>(null)
  const img = useRef<HTMLImageElement | null>(null)
  const [brush, setBrush] = useState(36)
  const [busy, setBusy] = useState(false)
  const [painted, setPainted] = useState(false)
  const drawing = useRef(false)
  const scale = useRef(1)

  useEffect(() => {
    let live = true
    void loadImage(src).then((i) => {
      if (!live || !view.current) return
      img.current = i
      const m = document.createElement('canvas')
      m.width = i.naturalWidth
      m.height = i.naturalHeight
      mask.current = m
      scale.current = Math.min(1, 560 / i.naturalWidth, 420 / i.naturalHeight)
      view.current.width = Math.round(i.naturalWidth * scale.current)
      view.current.height = Math.round(i.naturalHeight * scale.current)
      redraw()
    })
    return () => {
      live = false
    }
  }, [src])

  function redraw() {
    const c = view.current
    if (!c || !img.current || !mask.current) return
    const ctx = c.getContext('2d')!
    ctx.clearRect(0, 0, c.width, c.height)
    ctx.drawImage(img.current, 0, 0, c.width, c.height)
    ctx.save()
    ctx.globalAlpha = 0.55
    ctx.drawImage(mask.current, 0, 0, c.width, c.height)
    ctx.restore()
  }

  function paint(e: React.PointerEvent) {
    const c = view.current
    const m = mask.current
    if (!c || !m) return
    const r = c.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * m.width
    const y = ((e.clientY - r.top) / r.height) * m.height
    const ctx = m.getContext('2d')!
    ctx.fillStyle = '#ff5a36'
    ctx.beginPath()
    ctx.arc(x, y, brush / scale.current / 2, 0, Math.PI * 2)
    ctx.fill()
    setPainted(true)
    redraw()
  }

  async function apply() {
    if (!img.current || !mask.current) return
    setBusy(true)
    try {
      // Server expects white where the picture should be repaired.
      const bw = document.createElement('canvas')
      bw.width = mask.current.width
      bw.height = mask.current.height
      const ctx = bw.getContext('2d')!
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, bw.width, bw.height)
      ctx.globalCompositeOperation = 'source-over'
      ctx.drawImage(mask.current, 0, 0)
      const data = ctx.getImageData(0, 0, bw.width, bw.height)
      for (let i = 0; i < data.data.length; i += 4) {
        const on = data.data[i]! > 40 || data.data[i + 1]! > 40
        data.data[i] = data.data[i + 1] = data.data[i + 2] = on ? 255 : 0
        data.data[i + 3] = 255
      }
      ctx.putImageData(data, 0, 0)
      const original = document.createElement('canvas')
      original.width = img.current.naturalWidth
      original.height = img.current.naturalHeight
      original.getContext('2d')!.drawImage(img.current, 0, 0)
      const asset = await aiApi.inpaint(await canvasToBlob(original, 'image/png'), await canvasToBlob(bw, 'image/png'))
      updateElements([elementId], { src: asset.url })
      toast.success('Erased')
      onClose()
    } catch (e) {
      toast.error(errorMessage(e))
      setBusy(false)
    }
  }

  return (
    <Modal
      title="Magic eraser"
      onClose={onClose}
      locked={busy}
      wide
      footer={
        <>
          <Button variant="ghost" onClick={() => { mask.current?.getContext('2d')?.clearRect(0, 0, mask.current.width, mask.current.height); setPainted(false); redraw() }} disabled={!painted || busy}>
            Clear marks
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button className="btn--ai" icon="sparkle" loading={busy} disabled={!painted} onClick={() => void apply()}>
            Erase marked area
          </Button>
        </>
      }
    >
      <p className="field__hint">Paint over the object you want gone. Works best on simple backgrounds. Needs the image worker running.</p>
      <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13 }}>
        Brush size
        <input className="range" type="range" min={8} max={120} value={brush} onChange={(e) => setBrush(Number(e.target.value))} style={{ maxWidth: 220 }} />
      </label>
      <div style={{ display: 'grid', placeItems: 'center', background: 'var(--surface-2)', borderRadius: 12, padding: 12 }}>
        <canvas
          ref={view}
          aria-label="Paint over the area to erase"
          style={{ maxWidth: '100%', cursor: 'crosshair', touchAction: 'none', borderRadius: 4 }}
          onPointerDown={(e) => { drawing.current = true; e.currentTarget.setPointerCapture(e.pointerId); paint(e) }}
          onPointerMove={(e) => drawing.current && paint(e)}
          onPointerUp={() => (drawing.current = false)}
        />
      </div>
    </Modal>
  )
}
