import { useEffect, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { updateElements } from '@/editor/actions/elementActions'
import { updatePage } from '@/editor/actions/pageActions'
import { naturalPageDuration } from '@/services/render/animation'
import { useEditorStore } from '@/stores/editorStore'
import { useEditorUiStore } from '@/stores/editorUiStore'
import { IconButton } from '@/components/ui/Button'
import type { DesignElement } from '@/models/design'

/** Per-element entrance timing for the current page, with a playhead for live preview. */
export function Timeline() {
  const pageId = useEditorStore((s) => s.currentPageId)
  const pageDuration = useEditorStore((s) => s.pages[s.currentPageId]?.durationSeconds ?? null)
  const animated = useEditorStore(
    useShallow((s) => (s.pageElementIds[s.currentPageId] ?? []).map((id) => s.elements[id]!).filter((e): e is DesignElement => !!e && !!e.data.animation && e.data.animation.kind !== 'none')),
  )
  const all = useEditorStore(useShallow((s) => (s.pageElementIds[s.currentPageId] ?? []).map((id) => s.elements[id]!).filter(Boolean)))
  const playhead = useEditorUiStore((s) => s.playhead)
  const playing = useEditorUiStore((s) => s.playing)
  const setPlayhead = useEditorUiStore((s) => s.setPlayhead)
  const total = pageDuration ?? naturalPageDuration(all)
  const raf = useRef(0)
  const start = useRef(0)

  useEffect(() => {
    if (!playing) return
    start.current = performance.now() - (playhead ?? 0) * 1000
    const tick = (now: number) => {
      const t = (now - start.current) / 1000
      if (t >= total) {
        setPlayhead(null, false)
        return
      }
      setPlayhead(t, true)
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [playing, total]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => setPlayhead(null, false), [pageId, setPlayhead])

  function drag(e: React.PointerEvent, el: DesignElement, mode: 'move' | 'resize') {
    e.preventDefault()
    const track = (e.currentTarget as HTMLElement).closest('.tl-track') as HTMLElement
    const w = track.clientWidth
    const a = el.data.animation!
    const x0 = e.clientX
    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)
    const move = (ev: PointerEvent) => {
      const dt = ((ev.clientX - x0) / w) * total
      if (mode === 'move') updateElements([el.id], { animation: { ...a, delay: Math.max(0, Math.round((a.delay + dt) * 20) / 20) } }, { coalesceKey: `tl-${el.id}` })
      else updateElements([el.id], { animation: { ...a, duration: Math.max(0.1, Math.round((a.duration + dt) * 20) / 20) } }, { coalesceKey: `tl-${el.id}` })
    }
    const up = () => {
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', up)
    }
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', up)
  }

  return (
    <div className="timeline" aria-label="Animation timeline">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <IconButton icon={playing ? 'pause' : 'play'} label={playing ? 'Pause preview' : 'Play preview'} onClick={() => (playing ? setPlayhead(playhead, false) : setPlayhead(playhead ?? 0, true))} />
        <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 13, minWidth: 90 }}>
          {(playhead ?? 0).toFixed(1)} s of {total.toFixed(1)} s
        </span>
        <input className="range" type="range" min={0} max={total} step={0.05} value={playhead ?? 0} aria-label="Scrub timeline" onChange={(e) => setPlayhead(Number(e.target.value), false)} style={{ flex: 1 }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          Page length
          <input className="input input--sm" type="number" min={1} max={600} step={0.5} style={{ width: 70 }} value={total} onChange={(e) => updatePage(pageId, { durationSeconds: Math.max(1, Number(e.target.value) || 1) }, 'dur')} aria-label="Page length in seconds" />
        </label>
        {playhead != null && <IconButton icon="close" label="Stop preview" onClick={() => setPlayhead(null, false)} />}
      </div>
      {animated.length === 0 ? (
        <p className="field__hint">No animated elements on this page. Select something and choose an entrance animation in the Motion panel.</p>
      ) : (
        animated.map((el) => {
          const a = el.data.animation!
          return (
            <div key={el.id} className="tl-row">
              <span className="tl-row__name">{el.data.name ?? el.type}</span>
              <div className="tl-track">
                <div className="tl-bar" style={{ left: `${(a.delay / total) * 100}%`, width: `${(a.duration / total) * 100}%` }} onPointerDown={(e) => drag(e, el, e.nativeEvent.offsetX > (e.currentTarget as HTMLElement).clientWidth - 8 ? 'resize' : 'move')} title={`${a.kind}: starts at ${a.delay}s, lasts ${a.duration}s`} />
                {playhead != null && <div className="tl-playhead" style={{ left: `${(playhead / total) * 100}%` }} />}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
