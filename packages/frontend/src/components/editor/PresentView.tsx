import { useEffect, useRef, useState } from 'react'
import { Layer, Stage } from 'react-konva'
import type { DesignDocument } from '@/models/design'
import { naturalPageDuration } from '@/services/render/animation'
import { StaticPageScene } from './canvas/PageScene'
import { IconButton } from '@/components/ui/Button'

interface Props {
  doc: Pick<DesignDocument, 'width' | 'height' | 'pages'>
  startIndex?: number
  onExit: () => void
}

/** Full-screen playback. Animations run per page; arrow keys or clicks move between pages. */
export function PresentView({ doc, startIndex = 0, onExit }: Props) {
  const [index, setIndex] = useState(startIndex)
  const [time, setTime] = useState(0)
  const [showNotes, setShowNotes] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight })
  const page = doc.pages[index]!
  const total = page.durationSeconds ?? naturalPageDuration(page.elements)

  useEffect(() => {
    box.current?.requestFullscreen?.().catch(() => undefined)
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    const onFs = () => !document.fullscreenElement && onExit()
    window.addEventListener('resize', onResize)
    document.addEventListener('fullscreenchange', onFs)
    return () => {
      window.removeEventListener('resize', onResize)
      document.removeEventListener('fullscreenchange', onFs)
      if (document.fullscreenElement) void document.exitFullscreen()
    }
  }, [onExit])

  useEffect(() => {
    setTime(0)
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min((now - start) / 1000, total)
      setTime(t)
      if (t < total) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [index, total])

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit()
      if (e.key.toLowerCase() === 'n') setShowNotes((v) => !v)
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)) setIndex((i) => Math.min(doc.pages.length - 1, i + 1))
      if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) setIndex((i) => Math.max(0, i - 1))
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [doc.pages.length, onExit])

  const scale = Math.min(size.w / doc.width, size.h / doc.height)
  return (
    <div ref={box} style={{ position: 'fixed', inset: 0, zIndex: 150, background: '#000', display: 'grid', placeItems: 'center' }} onClick={() => setIndex((i) => Math.min(doc.pages.length - 1, i + 1))}>
      <Stage width={doc.width * scale} height={doc.height * scale} scaleX={scale} scaleY={scale}>
        <Layer listening={false}>
          <StaticPageScene key={page.id} background={page.background} elements={page.elements.filter((e) => !e.data.hidden)} width={doc.width} height={doc.height} time={time} playMedia />
        </Layer>
      </Stage>
      <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8, alignItems: 'center', color: '#fff' }} onClick={(e) => e.stopPropagation()}>
        <span style={{ fontSize: 13, opacity: 0.8 }}>{index + 1} / {doc.pages.length}</span>
        <span style={{ fontSize: 12, opacity: 0.7 }}>N for notes</span>
        <IconButton icon="close" label="Exit presentation" onClick={onExit} style={{ color: '#fff' }} />
      </div>
      {showNotes && page.notes && (
        <div style={{ position: 'absolute', left: 16, right: 16, bottom: 16, maxHeight: '30vh', overflow: 'auto', padding: '14px 18px', borderRadius: 12, background: 'rgb(0 0 0 / 75%)', color: '#fff', fontSize: 18, whiteSpace: 'pre-wrap' }} onClick={(e) => e.stopPropagation()}>
          {page.notes}
        </div>
      )}
    </div>
  )
}
