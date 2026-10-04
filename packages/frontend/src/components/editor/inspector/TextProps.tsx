import { useState } from 'react'
import type { TextElement } from '@/models/design'
import { aiApi } from '@/services/api/aiApi'
import { FONT_FAMILIES, loadFont, weightsFor, WEIGHT_NAMES } from '@/services/assets/fonts'
import { selectActiveKit, useBrandStore } from '@/stores/brandStore'
import { errorMessage, toast } from '@/stores/toastStore'
import { updateElements } from '@/editor/actions/elementActions'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { ColorField, Group, NumField, Row, Seg, SliderField } from './controls'

type TextD = TextElement['data']
const EFFECTS: { name: string; apply: (d: TextD) => Partial<TextD> }[] = [
  { name: 'None', apply: (d) => ({ shadow: undefined, stroke: undefined, strokeWidth: 0, background: undefined, fill: d.fill === 'transparent' ? '#151515' : d.fill }) },
  { name: 'Shadow', apply: () => ({ shadow: { color: '#000000', blur: 4, x: 3, y: 4, opacity: 0.45 } }) },
  { name: 'Lift', apply: () => ({ shadow: { color: '#000000', blur: 28, x: 0, y: 12, opacity: 0.35 } }) },
  { name: 'Hollow', apply: (d) => ({ stroke: d.fill === 'transparent' ? '#151515' : d.fill, strokeWidth: Math.max(2, d.fontSize / 28), fill: 'transparent' }) },
  { name: 'Neon', apply: () => ({ fill: '#ffffff', stroke: '#ff5a36', strokeWidth: 2, shadow: { color: '#ff5a36', blur: 26, x: 0, y: 0, opacity: 1 } }) },
  { name: 'Echo', apply: (d) => ({ shadow: { color: d.fill === 'transparent' ? '#ff5a36' : '#ff5a36', blur: 0, x: 6, y: 6, opacity: 0.85 } }) },
  { name: 'Highlight', apply: () => ({ background: '#ffb547' }) },
]

export function TextProps({ elements }: { elements: TextElement[] }) {
  const ids = elements.map((e) => e.id)
  const d = elements[0]!.data
  const kit = useBrandStore(selectActiveKit)
  const [busy, setBusy] = useState(false)
  const set = (patch: Partial<TextElement['data']>, key?: string) => updateElements(ids, patch, { coalesceKey: key ? `text-${key}` : undefined })
  const weights = weightsFor(d.fontFamily)

  function changeFamily(family: string) {
    const allowed = weightsFor(family)
    const weight = allowed.includes(d.fontWeight) ? d.fontWeight : allowed.reduce((a, b) => (Math.abs(b - d.fontWeight) < Math.abs(a - d.fontWeight) ? b : a))
    void loadFont(family, [weight]).then(() => set({ fontFamily: family, fontWeight: weight }))
  }

  async function rewrite() {
    setBusy(true)
    try {
      const res = await aiApi.text(`Improve this copy for a graphic design. Keep roughly the same length. Text: ${d.text}`)
      set({ text: res.text.trim() })
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const bold = d.fontWeight >= 600
  return (
    <>
      <Group title="Text">
        <select className="select select--sm" aria-label="Font family" value={d.fontFamily} onChange={(e) => changeFamily(e.target.value)} style={{ fontFamily: `"${d.fontFamily}"` }}>
          {kit && kit.fonts.length > 0 && (
            <optgroup label="Brand fonts">
              {kit.fonts.map((f) => (
                <option key={`b-${f.family}-${f.role}`} value={f.family}>
                  {f.family}
                </option>
              ))}
            </optgroup>
          )}
          {(['sans', 'serif', 'display', 'script', 'mono'] as const).map((cat) => (
            <optgroup key={cat} label={cat.charAt(0).toUpperCase() + cat.slice(1)}>
              {FONT_FAMILIES.filter((f) => f.category === cat).map((f) => (
                <option key={f.family} value={f.family}>
                  {f.family}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <div className="prop-pair">
          <select className="select select--sm" aria-label="Font weight" value={d.fontWeight} onChange={(e) => set({ fontWeight: Number(e.target.value) })}>
            {weights.map((w) => (
              <option key={w} value={w}>
                {WEIGHT_NAMES[w] ?? w}
              </option>
            ))}
          </select>
          <NumField ariaLabel="Font size" value={d.fontSize} min={4} max={1000} digits={1} onChange={(v) => set({ fontSize: v }, 'size')} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div className="seg" role="group" aria-label="Text style">
            <button aria-pressed={bold} aria-label="Bold" title="Bold" disabled={weights.length < 2} onClick={() => set({ fontWeight: bold ? (weights.find((w) => w <= 400) ?? weights[0]!) : (weights.find((w) => w >= 700) ?? weights[weights.length - 1]!) })}>
              <Icon name="bold" size={15} />
            </button>
            <button aria-pressed={!!d.italic} aria-label="Italic" title="Italic" onClick={() => set({ italic: !d.italic })}>
              <Icon name="italic" size={15} />
            </button>
            <button aria-pressed={!!d.underline} aria-label="Underline" title="Underline" onClick={() => set({ underline: !d.underline })}>
              <Icon name="underline" size={15} />
            </button>
            <button aria-pressed={!!d.strike} aria-label="Strikethrough" title="Strikethrough" onClick={() => set({ strike: !d.strike })}>
              <Icon name="strike" size={15} />
            </button>
          </div>
          <Seg
            label="Alignment"
            value={d.align}
            onChange={(v) => set({ align: v })}
            options={[
              { value: 'left', label: 'Align text left', node: <Icon name="textLeft" size={15} /> },
              { value: 'center', label: 'Align text center', node: <Icon name="textCenter" size={15} /> },
              { value: 'right', label: 'Align text right', node: <Icon name="textRight" size={15} /> },
              { value: 'justify', label: 'Justify text', node: <Icon name="textJustify" size={15} /> },
            ]}
          />
        </div>
        <Row label="Curve">
          <SliderField ariaLabel="Curve text" value={d.curve ?? 0} min={-100} max={100} format={(v) => (v === 0 ? 'Off' : String(v))} onChange={(v) => set({ curve: v || undefined }, 'curve')} />
        </Row>
        <Row label="List">
          <div className="seg" role="group" aria-label="List style">
            {([[undefined, 'None'], ['bullet', '• Bullets'], ['number', '1. Numbers']] as const).map(([val, label]) => (
              <button key={label} aria-pressed={d.list === val} style={{ width: 'auto', padding: '0 10px' }} onClick={() => set({ list: val })}>
                {label}
              </button>
            ))}
          </div>
        </Row>
        <Row label="Case">
          <button className="btn btn--sm" aria-pressed={!!d.uppercase} onClick={() => set({ uppercase: !d.uppercase })}>
            {d.uppercase ? 'Use normal case' : 'Use capitals'}
          </button>
        </Row>
        <Row label="Line gap">
          <SliderField ariaLabel="Line height" value={d.lineHeight} min={0.8} max={3} step={0.05} format={(v) => v.toFixed(2)} onChange={(v) => set({ lineHeight: v }, 'lh')} />
        </Row>
        <Row label="Spacing">
          <SliderField ariaLabel="Letter spacing" value={d.letterSpacing} min={-5} max={40} step={0.5} onChange={(v) => set({ letterSpacing: v }, 'ls')} />
        </Row>
      </Group>
      <Group title="Color">
        <ColorField ariaLabel="Text color" value={d.fill} onChange={(c) => set({ fill: c }, 'fill')} />
      </Group>
      <Group title="Outline and highlight">
        <Row label="Outline">
          <ColorField ariaLabel="Outline color" value={d.stroke ?? 'transparent'} allowNone onChange={(c) => set({ stroke: c === 'transparent' ? undefined : c, strokeWidth: c === 'transparent' ? 0 : Math.max(2, d.strokeWidth ?? 0) }, 'stroke')} />
        </Row>
        {d.stroke && (
          <Row label="Width">
            <SliderField ariaLabel="Outline width" value={d.strokeWidth ?? 0} min={0} max={20} step={0.5} onChange={(v) => set({ strokeWidth: v }, 'sw')} />
          </Row>
        )}
        <Row label="Highlight">
          <ColorField ariaLabel="Highlight color" value={d.background ?? 'transparent'} allowNone onChange={(c) => set({ background: c === 'transparent' ? undefined : c }, 'bg')} />
        </Row>
      </Group>
      <Group title="Effects">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {EFFECTS.map((fx) => (
            <button key={fx.name} className="chip" onClick={() => set(fx.apply(d))}>
              {fx.name}
            </button>
          ))}
        </div>
      </Group>
      <Group title="Writing help">
        <Button size="sm" className="btn--ai" icon="sparkle" loading={busy} onClick={() => void rewrite()}>
          Improve with AI
        </Button>
        <p className="field__hint">Uses the AI provider connected in your profile.</p>
      </Group>
    </>
  )
}
