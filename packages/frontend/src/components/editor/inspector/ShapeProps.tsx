import type { ShapeElement, ShapeKind } from '@/models/design'
import { updateElements } from '@/editor/actions/elementActions'
import { ColorField, Group, NumField, Row, SliderField } from './controls'

const FILLABLE: ShapeKind[] = ['rect', 'ellipse', 'triangle', 'star', 'polygon', 'heart', 'diamond']

export function ShapeProps({ elements }: { elements: ShapeElement[] }) {
  const ids = elements.map((e) => e.id)
  const d = elements[0]!.data
  const set = (patch: Partial<ShapeElement['data']>, key?: string) => updateElements(ids, patch, { coalesceKey: key ? `shape-${key}` : undefined })
  const line = d.shape === 'line' || d.shape === 'arrow'
  const fillable = FILLABLE.includes(d.shape)
  const gradient = d.gradient

  return (
    <>
      {fillable && (
        <Group title="Fill">
          <div className="seg" role="group" aria-label="Fill type">
            <button aria-pressed={!gradient} style={{ width: 'auto', padding: '0 12px' }} onClick={() => set({ gradient: undefined })}>
              Solid
            </button>
            <button aria-pressed={!!gradient} style={{ width: 'auto', padding: '0 12px' }} onClick={() => set({ gradient: { from: d.fill === 'transparent' ? '#FF5A36' : d.fill, to: '#FFB547', angle: 45 } })}>
              Gradient
            </button>
          </div>
          {gradient ? (
            <>
              <Row label="From">
                <ColorField ariaLabel="Gradient start" value={gradient.from} onChange={(c) => set({ gradient: { ...gradient, from: c } }, 'g1')} />
              </Row>
              <Row label="To">
                <ColorField ariaLabel="Gradient end" value={gradient.to} onChange={(c) => set({ gradient: { ...gradient, to: c } }, 'g2')} />
              </Row>
              <Row label="Angle">
                <SliderField ariaLabel="Gradient angle" value={gradient.angle} min={0} max={360} format={(v) => `${v}°`} onChange={(v) => set({ gradient: { ...gradient, angle: v } }, 'ga')} />
              </Row>
            </>
          ) : (
            <ColorField ariaLabel="Fill color" value={d.fill} allowNone onChange={(c) => set({ fill: c }, 'fill')} />
          )}
        </Group>
      )}
      <Group title={line ? 'Line' : 'Outline'}>
        <ColorField ariaLabel="Outline color" value={d.stroke ?? (line ? d.fill : 'transparent')} allowNone={!line} onChange={(c) => set({ stroke: c === 'transparent' ? undefined : c, strokeWidth: c === 'transparent' ? 0 : Math.max(line ? 2 : 2, d.strokeWidth) }, 'stroke')} />
        <Row label="Weight">
          <SliderField ariaLabel="Outline weight" value={d.strokeWidth} min={0} max={60} step={0.5} onChange={(v) => set({ strokeWidth: v }, 'sw')} />
        </Row>
        <Row label="Style">
          <button className="btn btn--sm" aria-pressed={!!d.dash} onClick={() => set({ dash: !d.dash })}>
            {d.dash ? 'Use solid line' : 'Use dashed line'}
          </button>
        </Row>
      </Group>
      {d.shape === 'rect' && (
        <Group title="Corners">
          <Row label="Radius">
            <SliderField ariaLabel="Corner radius" value={d.cornerRadius ?? 0} min={0} max={Math.round(Math.min(d.width, d.height) / 2)} onChange={(v) => set({ cornerRadius: v }, 'cr')} />
          </Row>
        </Group>
      )}
      {d.shape === 'polygon' && (
        <Group title="Sides">
          <NumField ariaLabel="Number of sides" value={d.sides ?? 6} min={3} max={12} onChange={(v) => set({ sides: Math.round(v) })} />
        </Group>
      )}
    </>
  )
}
