import { useMemo, useState } from 'react'
import type { ChartKind, FrameData, ShapeKind } from '@/models/design'
import { dragProps } from '@/editor/actions/dropActions'
import { insertAsset, type AssetPayload } from '@/editor/actions/assetActions'
import { LINE_ICONS } from '@/services/assets/graphics'
import { Icon } from '@/components/ui/Icon'
import { PanelShell } from './PanelShell'
import { insertQrCode } from '@/editor/actions/creativeTools'
import { useEditorUiStore } from '@/stores/editorUiStore'
import { Button } from '@/components/ui/Button'
import { errorMessage, toast } from '@/stores/toastStore'

const SHAPES: { shape: ShapeKind; label: string; path: string }[] = [
  { shape: 'rect', label: 'Rectangle', path: 'M4 7h16v10H4z' },
  { shape: 'ellipse', label: 'Circle', path: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z' },
  { shape: 'triangle', label: 'Triangle', path: 'M12 4l9 16H3z' },
  { shape: 'diamond', label: 'Diamond', path: 'M12 3l9 9-9 9-9-9z' },
  { shape: 'star', label: 'Star', path: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z' },
  { shape: 'polygon', label: 'Hexagon', path: 'M12 3l8 4.5v9L12 21l-8-4.5v-9z' },
  { shape: 'heart', label: 'Heart', path: 'M12 20s-8-4.8-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6.2-8 11-8 11z' },
  { shape: 'cross', label: 'Cross', path: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z' },
  { shape: 'speech', label: 'Speech bubble', path: 'M4 4h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-8l-5 5v-5H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z' },
  { shape: 'chevron', label: 'Chevron', path: 'M3 4h9l9 8-9 8H3l9-8z' },
  { shape: 'burst', label: 'Burst', path: 'M12 2l2 4.5 4.7-1.7-1.7 4.7L22 12l-5 2.5 1.7 4.7-4.7-1.7L12 22l-2-4.5-4.7 1.7L7 14.5 2 12l5-2.5L5.3 4.8 10 6.5z' },
  { shape: 'line', label: 'Line', path: 'M4 12h16' },
  { shape: 'arrow', label: 'Arrow', path: 'M4 12h14M13 7l5 5-5 5' },
]

const FRAMES: { frame: FrameData['frame']; label: string; path: string }[] = [
  { frame: 'rect', label: 'Square frame', path: 'M4 4h16v16H4z' },
  { frame: 'rounded', label: 'Rounded frame', path: 'M7 4h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z' },
  { frame: 'ellipse', label: 'Circle frame', path: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z' },
  { frame: 'star', label: 'Star frame', path: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z' },
  { frame: 'heart', label: 'Heart frame', path: 'M12 20s-8-4.8-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6.2-8 11-8 11z' },
]

const CHARTS: { chart: ChartKind; label: string }[] = [
  { chart: 'bar', label: 'Bar chart' },
  { chart: 'line', label: 'Line chart' },
  { chart: 'area', label: 'Area chart' },
  { chart: 'pie', label: 'Pie chart' },
  { chart: 'donut', label: 'Donut chart' },
]

function Item({ payload, label, children }: { payload: AssetPayload; label: string; children: React.ReactNode }) {
  return (
    <button className="tile" aria-label={`Add ${label}`} title={label} onClick={() => void insertAsset(payload)} {...dragProps(payload)}>
      {children}
    </button>
  )
}

export function ElementsPanel() {
  const [q, setQ] = useState('')
  const [qr, setQr] = useState('')
  const drawing = useEditorUiStore((s) => s.drawing)
  const brush = useEditorUiStore((s) => s.brush)
  const icons = useMemo(() => LINE_ICONS.filter((g) => g.name.includes(q.toLowerCase())), [q])
  return (
    <PanelShell title="Elements" search={{ value: q, onChange: setQ, placeholder: 'Search graphics' }}>
      {!q && (
        <>
          <section className="drawer__section">
            <h3>Shapes and lines</h3>
            <div className="tile-grid">
              {SHAPES.map((s) => (
                <Item key={s.shape} payload={{ kind: 'shape', shape: s.shape }} label={s.label}>
                  <svg width="34" height="34" viewBox="0 0 24 24" fill={s.shape === 'line' || s.shape === 'arrow' ? 'none' : 'currentColor'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={s.path} />
                  </svg>
                </Item>
              ))}
            </div>
          </section>
          <section className="drawer__section">
            <h3>Frames for photos</h3>
            <div className="tile-grid">
              {FRAMES.map((f) => (
                <Item key={f.frame} payload={{ kind: 'frame', frame: f.frame }} label={f.label}>
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeDasharray="2.5 2.5" strokeLinejoin="round">
                    <path d={f.path} />
                  </svg>
                </Item>
              ))}
            </div>
          </section>
          <section className="drawer__section" style={{ display: 'grid', gap: 8 }}>
            <h3>Draw</h3>
            <Button icon="pen" onClick={() => useEditorUiStore.getState().setDrawing(!drawing)} aria-pressed={drawing} variant={drawing ? 'primary' : 'default'}>
              {drawing ? 'Drawing… press Esc to stop' : 'Start drawing'}
            </Button>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 10, alignItems: 'center' }}>
              <label className="color-swatch" title="Brush colour">
                <i style={{ background: brush.color }} />
                <input type="color" aria-label="Brush colour" value={brush.color} onChange={(e) => useEditorUiStore.getState().setBrush({ color: e.target.value })} />
              </label>
              <input className="range" type="range" min={2} max={60} aria-label="Brush size" value={brush.size} onChange={(e) => useEditorUiStore.getState().setBrush({ size: Number(e.target.value) })} />
            </div>
          </section>
          <section className="drawer__section" style={{ display: 'grid', gap: 8 }}>
            <h3>QR code</h3>
            <input className="input" placeholder="Paste a link or text" aria-label="QR code content" value={qr} onChange={(e) => setQr(e.target.value)} />
            <Button disabled={!qr.trim()} onClick={() => void insertQrCode(qr.trim()).then(() => setQr('')).catch((e) => toast.error(errorMessage(e)))}>
              Add QR code
            </Button>
          </section>
          <section className="drawer__section">
            <h3>Charts and tables</h3>
            <div className="tile-grid">
              {CHARTS.map((c) => (
                <Item key={c.chart} payload={{ kind: 'chart', chart: c.chart }} label={c.label}>
                  <span style={{ display: 'grid', justifyItems: 'center', gap: 4, fontSize: 11 }}>
                    <Icon name="chart" size={26} />
                    {c.label.replace(' chart', '')}
                  </span>
                </Item>
              ))}
              <Item payload={{ kind: 'table' }} label="Table">
                <span style={{ display: 'grid', justifyItems: 'center', gap: 4, fontSize: 11 }}>
                  <Icon name="table" size={26} />
                  Table
                </span>
              </Item>
            </div>
          </section>
        </>
      )}
      <section className="drawer__section">
        <h3>Graphics</h3>
        {icons.length === 0 ? (
          <p className="help">No graphic matches “{q}”.</p>
        ) : (
          <div className="tile-grid">
            {icons.map((g) => (
              <Item key={g.id} payload={{ kind: 'icon', svg: g.svg, name: g.name }} label={g.name}>
                <span style={{ width: 34, height: 34, display: 'block' }} dangerouslySetInnerHTML={{ __html: g.svg.replace('<svg', '<svg width="34" height="34"') }} />
              </Item>
            ))}
          </div>
        )}
      </section>
    </PanelShell>
  )
}
