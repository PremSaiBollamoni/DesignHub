import { useEffect, useRef, useState } from 'react'
import { useEditorUiStore } from '@/stores/editorUiStore'

const SIZE = 22

function stepFor(zoom: number): number {
  const target = 70 / zoom
  const pow = 10 ** Math.floor(Math.log10(target))
  for (const m of [1, 2, 5, 10]) if (pow * m >= target) return pow * m
  return pow * 10
}

/** Page-unit rulers along the top and left. Drag out of a ruler to create a guide; drag a guide back to remove it. */
export function Rulers({ width, height }: { width: number; height: number }) {
  const zoom = useEditorUiStore((s) => s.zoom)
  const panX = useEditorUiStore((s) => s.panX)
  const panY = useEditorUiStore((s) => s.panY)
  const guides = useEditorUiStore((s) => s.guides)
  const show = useEditorUiStore((s) => s.showRulers)
  const [live, setLive] = useState<{ axis: 'x' | 'y'; at: number } | null>(null)
  const drag = useRef<{ axis: 'x' | 'y'; index: number | null } | null>(null)
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current
      const r = host.current?.getBoundingClientRect()
      if (!d || !r) return
      const at = d.axis === 'x' ? (e.clientX - r.left - panX) / zoom : (e.clientY - r.top - panY) / zoom
      setLive({ axis: d.axis, at: Math.round(at) })
    }
    const up = (e: PointerEvent) => {
      const d = drag.current
      const r = host.current?.getBoundingClientRect()
      drag.current = null
      if (!d || !r) return
      const pos = d.axis === 'x' ? e.clientX - r.left : e.clientY - r.top
      const at = Math.round(d.axis === 'x' ? (pos - panX) / zoom : (pos - panY) / zoom)
      const ui = useEditorUiStore.getState()
      const list = [...ui.guides[d.axis]]
      if (d.index !== null) list.splice(d.index, 1)
      if (pos > SIZE) list.push(at)
      ui.setGuides({ ...ui.guides, [d.axis]: list })
      setLive(null)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [panX, panY, zoom])

  if (!show) return null
  const step = stepFor(zoom)
  const hostW = host.current?.clientWidth ?? 2000
  const hostH = host.current?.clientHeight ?? 1200
  const xs: number[] = []
  const ys: number[] = []
  for (let v = Math.floor(-panX / zoom / step) * step; v * zoom + panX < hostW; v += step) xs.push(v)
  for (let v = Math.floor(-panY / zoom / step) * step; v * zoom + panY < hostH; v += step) ys.push(v)

  const lines = [
    ...guides.x.map((at, index) => ({ axis: 'x' as const, at, index })),
    ...guides.y.map((at, index) => ({ axis: 'y' as const, at, index })),
  ]

  return (
    <div ref={host} className="rulers" aria-hidden="true">
      <div className="ruler ruler--x" onPointerDown={(e) => { e.preventDefault(); drag.current = { axis: 'y', index: null } }}>
        <svg width="100%" height={SIZE}>
          <rect x={panX} y={0} width={width * zoom} height={SIZE} className="ruler__page" />
          {xs.map((v) => (
            <g key={v} transform={`translate(${v * zoom + panX},0)`}>
              <line y1={SIZE - 8} y2={SIZE} />
              <text x={3} y={11}>{v}</text>
            </g>
          ))}
        </svg>
      </div>
      <div className="ruler ruler--y" onPointerDown={(e) => { e.preventDefault(); drag.current = { axis: 'x', index: null } }}>
        <svg width={SIZE} height="100%">
          <rect x={0} y={panY} width={SIZE} height={height * zoom} className="ruler__page" />
          {ys.map((v) => (
            <g key={v} transform={`translate(0,${v * zoom + panY})`}>
              <line x1={SIZE - 8} x2={SIZE} />
              <text transform={`translate(11,-3) rotate(-90)`} textAnchor="end">{v}</text>
            </g>
          ))}
        </svg>
      </div>
      {lines.map((g) => (
        <div
          key={`${g.axis}${g.index}`}
          className={`guide guide--${g.axis}`}
          style={g.axis === 'x' ? { left: g.at * zoom + panX } : { top: g.at * zoom + panY }}
          title="Drag to move, or drag back onto the ruler to remove"
          onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); drag.current = { axis: g.axis, index: g.index } }}
        />
      ))}
      {live && <div className={`guide guide--${live.axis} is-live`} style={live.axis === 'x' ? { left: live.at * zoom + panX } : { top: live.at * zoom + panY }}><span>{live.at}</span></div>}
    </div>
  )
}
