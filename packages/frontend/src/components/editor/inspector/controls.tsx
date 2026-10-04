import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Popover } from '@/components/ui/Menu'
import { selectActiveKit, useBrandStore } from '@/stores/brandStore'
import { clamp } from '@/utils/common'

export function Group({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="prop-group">
      {title && <h4>{title}</h4>}
      {children}
    </section>
  )
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="prop-row">
      <span className="label">{label}</span>
      <div>{children}</div>
    </div>
  )
}

interface NumProps {
  label?: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  ariaLabel: string
  digits?: number
}

/** Text-backed number box: typing never fights the cursor, and the value commits on Enter or blur. */
export function NumField({ label, value, onChange, min = -100000, max = 100000, step = 1, ariaLabel, digits = 1 }: NumProps) {
  const fmt = (v: number) => String(Math.round(v * 10 ** digits) / 10 ** digits)
  const [text, setText] = useState(fmt(value))
  useEffect(() => setText(fmt(value)), [value]) // eslint-disable-line react-hooks/exhaustive-deps

  function commit(raw: string) {
    const n = parseFloat(raw)
    if (Number.isNaN(n)) return setText(fmt(value))
    const v = clamp(n, min, max)
    setText(fmt(v))
    if (v !== value) onChange(v)
  }
  return (
    <div className="num">
      {label && <span>{label}</span>}
      <input
        className="input input--sm"
        inputMode="decimal"
        aria-label={ariaLabel}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault()
            const next = clamp(value + (e.key === 'ArrowUp' ? step : -step) * (e.shiftKey ? 10 : 1), min, max)
            onChange(next)
          }
        }}
        style={label ? undefined : { paddingLeft: 8 }}
      />
    </div>
  )
}

interface ColorProps {
  value: string
  onChange: (hex: string) => void
  ariaLabel: string
  allowNone?: boolean
}

const BASIC = ['#151515', '#FFFFFF', '#FF5A36', '#FFB547', '#FFB547', '#0C8A6A', '#B833E0', '#E4E2DC']

export function ColorField({ value, onChange, ariaLabel, allowNone }: ColorProps) {
  const kit = useBrandStore(selectActiveKit)
  const isNone = !value || value === 'transparent'
  const hex = /^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'
  const [text, setText] = useState(isNone ? '' : value.toUpperCase())
  useEffect(() => setText(isNone ? '' : value.toUpperCase()), [value, isNone])
  const swatches = [...(kit?.colors.map((c) => c.hex) ?? []), ...BASIC]
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div className="color-field">
        <label className="color-swatch" title={ariaLabel}>
          <i style={{ background: isNone ? 'transparent' : value }} />
          <input type="color" aria-label={ariaLabel} value={hex} onChange={(e) => onChange(e.target.value.toUpperCase())} />
        </label>
        <input
          className="input input--sm"
          aria-label={`${ariaLabel} hex`}
          value={text}
          placeholder={allowNone ? 'None' : '#000000'}
          maxLength={7}
          onChange={(e) => {
            setText(e.target.value)
            if (/^#[0-9a-f]{6}$/i.test(e.target.value)) onChange(e.target.value.toUpperCase())
          }}
          onBlur={() => setText(isNone ? '' : value.toUpperCase())}
        />
        {'EyeDropper' in window && (
          <button className="icon-btn icon-btn--sm" aria-label="Pick a colour from the screen" title="Pick a colour from the screen" onClick={() => void new (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper().open().then((r) => onChange(r.sRGBHex.toUpperCase())).catch(() => undefined)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M14 6l4 4M5 19l1-4 9-9 3 3-9 9zM17 3l4 4-2 2-4-4z" /></svg>
          </button>
        )}
        {allowNone && (
          <button className="btn btn--sm btn--ghost" onClick={() => onChange('transparent')} disabled={isNone}>
            None
          </button>
        )}
      </div>
      <div className="palette" aria-label="Quick colors">
        {swatches.slice(0, 14).map((c, i) => (
          <button key={`${c}${i}`} style={{ background: c }} aria-label={`Use ${c}`} onClick={() => onChange(c)} />
        ))}
      </div>
    </div>
  )
}

export function Seg<T extends string | number | boolean>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; node: ReactNode; label: string }[]; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} aria-pressed={value === o.value} aria-label={o.label} title={o.label} onClick={() => onChange(o.value)}>
          {o.node}
        </button>
      ))}
    </div>
  )
}

export function SliderField({ value, onChange, min, max, step = 1, ariaLabel, format }: { value: number; onChange: (v: number) => void; min: number; max: number; step?: number; ariaLabel: string; format?: (v: number) => string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 44px', gap: 8, alignItems: 'center' }}>
      <input className="range" type="range" aria-label={ariaLabel} min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <span style={{ fontSize: 12, color: 'var(--ink-2)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{format ? format(value) : value}</span>
    </div>
  )
}

/** Compact swatch that opens the full colour picker in a popover, for toolbars. */
export function ColorChip({ value, onChange, ariaLabel, allowNone }: ColorProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const close = useCallback(() => setAnchor(null), [])
  const none = !value || value === 'transparent'
  return (
    <>
      <button
        className="color-chip"
        aria-label={ariaLabel}
        title={ariaLabel}
        onClick={(e) => {
          const t = e.currentTarget
          setAnchor((cur) => (cur ? null : t))
        }}
      >
        <i style={{ background: none ? 'transparent' : value }} />
      </button>
      {anchor && (
        <Popover anchor={anchor} onClose={close} width={250}>
          <div style={{ padding: 8 }}>
            <ColorField value={value} onChange={onChange} ariaLabel={ariaLabel} allowNone={allowNone} />
          </div>
        </Popover>
      )}
    </>
  )
}
