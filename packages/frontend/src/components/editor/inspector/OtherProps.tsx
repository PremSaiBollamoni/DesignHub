import { useState } from 'react'
import type { AudioElement, ChartElement, ChartKind, FrameElement, IconElement, TableElement, VideoElement } from '@/models/design'
import { updateElements } from '@/editor/actions/elementActions'
import { mediaRegistry } from '@/components/editor/canvas/bodies/mediaRegistry'
import { exportTableXlsx } from '@/services/export/tableXlsx'
import { toast } from '@/stores/toastStore'
import { Button, IconButton } from '@/components/ui/Button'
import { ColorField, Group, NumField, Row, SliderField } from './controls'

export function FrameProps({ elements }: { elements: FrameElement[] }) {
  const ids = elements.map((e) => e.id)
  const d = elements[0]!.data
  const set = (patch: Partial<FrameElement['data']>, key?: string) => updateElements(ids, patch, { coalesceKey: key ? `frame-${key}` : undefined })
  return (
    <>
      <Group title="Frame">
        <select className="select select--sm" aria-label="Frame shape" value={d.frame} onChange={(e) => set({ frame: e.target.value as FrameElement['data']['frame'] })}>
          <option value="rect">Rectangle</option>
          <option value="rounded">Rounded</option>
          <option value="ellipse">Circle or oval</option>
          <option value="star">Star</option>
          <option value="heart">Heart</option>
        </select>
        <Row label="Background">
          <ColorField ariaLabel="Frame background" value={d.fill} onChange={(c) => set({ fill: c }, 'fill')} />
        </Row>
      </Group>
      {d.src ? (
        <Group title="Image inside">
          <Row label="Zoom">
            <SliderField ariaLabel="Image zoom" value={Math.round((d.imageScale ?? 1) * 100)} min={100} max={400} format={(v) => `${v}%`} onChange={(v) => set({ imageScale: v / 100 }, 'zoom')} />
          </Row>
          <Row label="Shift X">
            <SliderField ariaLabel="Image horizontal shift" value={d.imageOffsetX ?? 0} min={-400} max={400} onChange={(v) => set({ imageOffsetX: v }, 'ox')} />
          </Row>
          <Row label="Shift Y">
            <SliderField ariaLabel="Image vertical shift" value={d.imageOffsetY ?? 0} min={-400} max={400} onChange={(v) => set({ imageOffsetY: v }, 'oy')} />
          </Row>
          <Button size="sm" variant="ghost" onClick={() => set({ src: undefined })}>
            Remove image
          </Button>
        </Group>
      ) : (
        <Group>
          <p className="field__hint">Drag a photo from the side panel onto this frame to fill it.</p>
        </Group>
      )}
    </>
  )
}

export function ChartProps({ elements }: { elements: ChartElement[] }) {
  const ids = elements.map((e) => e.id)
  const d = elements[0]!.data
  const set = (patch: Partial<ChartElement['data']>, key?: string) => updateElements(ids, patch, { coalesceKey: key ? `chart-${key}` : undefined })
  return (
    <>
      <Group title="Chart">
        <select className="select select--sm" aria-label="Chart type" value={d.chart} onChange={(e) => set({ chart: e.target.value as ChartKind })}>
          <option value="bar">Bar</option>
          <option value="line">Line</option>
          <option value="area">Area</option>
          <option value="pie">Pie</option>
          <option value="donut">Donut</option>
        </select>
        <Row label="Labels">
          <button className="btn btn--sm" aria-pressed={d.showLabels} onClick={() => set({ showLabels: !d.showLabels })}>
            {d.showLabels ? 'Hide value labels' : 'Show value labels'}
          </button>
        </Row>
        <Row label="Text">
          <ColorField ariaLabel="Chart text color" value={d.textColor} onChange={(c) => set({ textColor: c }, 'tc')} />
        </Row>
      </Group>
      <Group title="Data">
        {d.series.map((s, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '24px 1fr 70px 28px', gap: 6, alignItems: 'center' }}>
            <label className="color-swatch" style={{ width: 24, height: 24 }} title="Series color">
              <i style={{ background: d.colors[i % d.colors.length] }} />
              <input type="color" aria-label={`Color for ${s.label || 'series'}`} value={d.colors[i % d.colors.length] ?? '#FF5A36'} onChange={(e) => set({ colors: d.colors.map((c, j) => (j === i % d.colors.length ? e.target.value.toUpperCase() : c)) }, 'col')} />
            </label>
            <input className="input input--sm" aria-label="Label" value={s.label} onChange={(e) => set({ series: d.series.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) }, 'lbl')} />
            <input className="input input--sm" aria-label="Value" type="number" value={s.value} onChange={(e) => set({ series: d.series.map((x, j) => (j === i ? { ...x, value: Number(e.target.value) || 0 } : x)) }, 'val')} />
            <IconButton icon="close" size="sm" label="Remove row" disabled={d.series.length <= 1} onClick={() => set({ series: d.series.filter((_, j) => j !== i) })} />
          </div>
        ))}
        <Button size="sm" icon="plus" disabled={d.series.length >= 12} onClick={() => set({ series: [...d.series, { label: `Item ${d.series.length + 1}`, value: 50 }] })}>
          Add row
        </Button>
      </Group>
    </>
  )
}

export function TableProps({ elements }: { elements: TableElement[] }) {
  const el = elements[0]!
  const d = el.data
  const set = (patch: Partial<TableElement['data']>, key?: string) => updateElements([el.id], patch, { coalesceKey: key ? `table-${key}` : undefined })
  const rows = d.cells.length
  const cols = d.colWidths.length

  const resize = (nextRows: number, nextCols: number) => {
    const cells = Array.from({ length: nextRows }, (_, r) => Array.from({ length: nextCols }, (_, c) => d.cells[r]?.[c] ?? (r === 0 && d.headerRow ? `Column ${c + 1}` : '')))
    const colWidths = Array.from({ length: nextCols }, (_, c) => d.colWidths[c] ?? d.colWidths[0] ?? 200)
    set({ cells, colWidths, width: colWidths.reduce((a, b) => a + b, 0), height: nextRows * d.rowHeight })
  }

  return (
    <>
      <Group title="Table">
        <div className="prop-pair">
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span className="label">Rows</span>
            <IconButton icon="minus" size="sm" label="Remove a row" disabled={rows <= 1} onClick={() => resize(rows - 1, cols)} />
            <b>{rows}</b>
            <IconButton icon="plus" size="sm" label="Add a row" disabled={rows >= 30} onClick={() => resize(rows + 1, cols)} />
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span className="label">Columns</span>
            <IconButton icon="minus" size="sm" label="Remove a column" disabled={cols <= 1} onClick={() => resize(rows, cols - 1)} />
            <b>{cols}</b>
            <IconButton icon="plus" size="sm" label="Add a column" disabled={cols >= 10} onClick={() => resize(rows, cols + 1)} />
          </div>
        </div>
        <Row label="Font size">
          <NumField ariaLabel="Table font size" value={d.fontSize} min={8} max={120} onChange={(v) => set({ fontSize: v }, 'fs')} />
        </Row>
        <Row label="Header row">
          <button className="btn btn--sm" aria-pressed={d.headerRow} onClick={() => set({ headerRow: !d.headerRow })}>
            {d.headerRow ? 'Turn off header' : 'Turn on header'}
          </button>
        </Row>
        {d.headerRow && (
          <Row label="Header">
            <ColorField ariaLabel="Header fill" value={d.headerFill} onChange={(c) => set({ headerFill: c }, 'hf')} />
          </Row>
        )}
        <Row label="Cells">
          <ColorField ariaLabel="Cell fill" value={d.cellFill} onChange={(c) => set({ cellFill: c }, 'cf')} />
        </Row>
        <Row label="Border">
          <ColorField ariaLabel="Border color" value={d.borderColor} onChange={(c) => set({ borderColor: c }, 'bc')} />
        </Row>
      </Group>
      <Group title="Contents">
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 4 }}>
          {d.cells.flatMap((row, r) =>
            Array.from({ length: cols }, (_, c) => (
              <input key={`${r}-${c}`} className="input input--sm" aria-label={`Row ${r + 1}, column ${c + 1}`} value={row[c] ?? ''} onChange={(e) => set({ cells: d.cells.map((rr, ri) => (ri === r ? rr.map((cc, ci) => (ci === c ? e.target.value : cc)) : rr)) }, `cell-${r}-${c}`)} />
            )),
          )}
        </div>
        <Button
          size="sm"
          icon="download"
          onClick={() =>
            void exportTableXlsx(d.cells, 'table').catch(() => toast.error('The spreadsheet could not be created'))
          }
        >
          Download as spreadsheet
        </Button>
      </Group>
    </>
  )
}

export function MediaProps({ element }: { element: VideoElement | AudioElement }) {
  const [playing, setPlaying] = useState(false)
  const d = element.data
  const set = (patch: Partial<VideoElement['data'] & AudioElement['data']>, key?: string) => updateElements([element.id], patch, { coalesceKey: key ? `media-${key}` : undefined })
  return (
    <Group title={element.type === 'video' ? 'Video' : 'Audio'}>
      <Button size="sm" icon={playing ? 'pause' : 'play'} onClick={() => setPlaying(mediaRegistry.toggle(element.id))}>
        {playing ? 'Pause preview' : 'Play preview'}
      </Button>
      {element.type === 'video' ? (
        <>
          {(d as VideoElement['data']).naturalDuration ? (
            <>
              <Row label="Start">
                <SliderField ariaLabel="Trim start in seconds" value={(d as VideoElement['data']).trimStart ?? 0} min={0} max={Math.max(0.1, ((d as VideoElement['data']).trimEnd ?? (d as VideoElement['data']).naturalDuration!) - 0.1)} step={0.1} format={(v) => `${v.toFixed(1)}s`} onChange={(v) => set({ trimStart: v }, 'ts')} />
              </Row>
              <Row label="End">
                <SliderField ariaLabel="Trim end in seconds" value={(d as VideoElement['data']).trimEnd ?? (d as VideoElement['data']).naturalDuration!} min={Math.min((d as VideoElement['data']).naturalDuration!, ((d as VideoElement['data']).trimStart ?? 0) + 0.1)} max={(d as VideoElement['data']).naturalDuration!} step={0.1} format={(v) => `${v.toFixed(1)}s`} onChange={(v) => set({ trimEnd: v }, 'te')} />
              </Row>
              <p className="field__hint">Only the part between Start and End plays. The original file is unchanged.</p>
            </>
          ) : null}
          <Row label="Sound">
            <button className="btn btn--sm" aria-pressed={!(d as VideoElement['data']).muted} onClick={() => set({ muted: !(d as VideoElement['data']).muted })}>
              {(d as VideoElement['data']).muted ? 'Turn sound on' : 'Mute video'}
            </button>
          </Row>
          <Row label="Repeat">
            <button className="btn btn--sm" aria-pressed={d.loop} onClick={() => set({ loop: !d.loop })}>
              {d.loop ? 'Play once' : 'Loop video'}
            </button>
          </Row>
        </>
      ) : (
        <>
          <Row label="Volume">
            <SliderField ariaLabel="Volume" value={Math.round((d as AudioElement['data']).volume * 100)} min={0} max={100} format={(v) => `${v}%`} onChange={(v) => set({ volume: v / 100 }, 'vol')} />
          </Row>
          <Row label="Repeat">
            <button className="btn btn--sm" aria-pressed={d.loop} onClick={() => set({ loop: !d.loop })}>
              {d.loop ? 'Play once' : 'Loop audio'}
            </button>
          </Row>
        </>
      )}
    </Group>
  )
}

export function IconProps({ elements }: { elements: IconElement[] }) {
  const ids = elements.map((e) => e.id)
  return (
    <Group title="Graphic color">
      <ColorField ariaLabel="Graphic color" value={elements[0]!.data.fill} onChange={(c) => updateElements(ids, { fill: c }, { coalesceKey: 'icon-fill' })} />
    </Group>
  )
}
