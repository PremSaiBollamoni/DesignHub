import { useEffect, useState } from 'react'
import type { ImageElement } from '@/models/design'
import { flipSelection } from '@/editor/actions/arrangeActions'
import { setPageBackgroundImage } from '@/editor/actions/assetActions'
import { updateElements } from '@/editor/actions/elementActions'
import { paletteFromImage } from '@/editor/actions/palette'
import { updatePage } from '@/editor/actions/pageActions'
import { useEditorStore } from '@/stores/editorStore'
import { extractText, removeBackground, splitIntoLayers } from '@/editor/actions/imageTools'
import { useEditorUiStore } from '@/stores/editorUiStore'
import { errorMessage, toast } from '@/stores/toastStore'
import { Button } from '@/components/ui/Button'
import { ColorField, Group, Row, SliderField } from './controls'

const PRESETS: { name: string; filters: { brightness: number; contrast: number; saturation: number; blur: number; grayscale: boolean } }[] = [
  { name: 'Original', filters: { brightness: 0, contrast: 0, saturation: 0, blur: 0, grayscale: false } },
  { name: 'Vivid', filters: { brightness: 4, contrast: 18, saturation: 45, blur: 0, grayscale: false } },
  { name: 'Fade', filters: { brightness: 10, contrast: -20, saturation: -25, blur: 0, grayscale: false } },
  { name: 'Drama', filters: { brightness: -8, contrast: 38, saturation: -10, blur: 0, grayscale: false } },
  { name: 'Mono', filters: { brightness: 0, contrast: 14, saturation: 0, blur: 0, grayscale: true } },
  { name: 'Soft', filters: { brightness: 6, contrast: -8, saturation: 8, blur: 2, grayscale: false } },
]

const NO_FILTERS = { brightness: 0, contrast: 0, saturation: 0, blur: 0, grayscale: false }

export function ImageProps({ elements }: { elements: ImageElement[] }) {
  const ids = elements.map((e) => e.id)
  const el = elements[0]!
  const d = el.data
  const single = elements.length === 1
  const setCropping = useEditorUiStore((s) => s.setCropping)
  const [busy, setBusy] = useState<string | null>(null)
  const filters = d.filters ?? NO_FILTERS
  const [palette, setPalette] = useState<string[]>([])
  useEffect(() => {
    let live = true
    void paletteFromImage(d.src).then((p) => live && setPalette(p)).catch(() => live && setPalette([]))
    return () => {
      live = false
    }
  }, [d.src])
  const set = (patch: Partial<ImageElement['data']>, key?: string) => updateElements(ids, patch, { coalesceKey: key ? `img-${key}` : undefined })
  const setFilter = (patch: Partial<typeof NO_FILTERS>, key: string) => set({ filters: { ...filters, ...patch } }, key)

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label)
    try {
      await fn()
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <Group title="Picture">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Button size="sm" icon="crop" disabled={!single || !d.naturalWidth} onClick={() => setCropping(el.id)}>
            Crop
          </Button>
          <Button size="sm" icon="flipH" onClick={() => flipSelection('h')}>
            Flip
          </Button>
          <Button size="sm" icon="flipV" onClick={() => flipSelection('v')}>
            Mirror
          </Button>
        </div>
        <Row label="Corners">
          <SliderField ariaLabel="Corner radius" value={d.cornerRadius ?? 0} min={0} max={Math.round(Math.min(d.width, d.height) / 2)} onChange={(v) => set({ cornerRadius: v }, 'cr')} />
        </Row>
      </Group>

      <Group title="Filters">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PRESETS.map((p) => (
            <button key={p.name} className="chip" aria-pressed={JSON.stringify(filters) === JSON.stringify(p.filters)} onClick={() => set({ filters: p.name === 'Original' ? undefined : p.filters })}>
              {p.name}
            </button>
          ))}
        </div>
      </Group>

      <Group title="Adjust">
        <Row label="Brightness">
          <SliderField ariaLabel="Brightness" value={filters.brightness} min={-100} max={100} onChange={(v) => setFilter({ brightness: v }, 'br')} />
        </Row>
        <Row label="Contrast">
          <SliderField ariaLabel="Contrast" value={filters.contrast} min={-100} max={100} onChange={(v) => setFilter({ contrast: v }, 'co')} />
        </Row>
        <Row label="Saturation">
          <SliderField ariaLabel="Saturation" value={filters.saturation} min={-100} max={100} onChange={(v) => setFilter({ saturation: v }, 'sa')} />
        </Row>
        <Row label="Blur">
          <SliderField ariaLabel="Blur" value={filters.blur} min={0} max={40} onChange={(v) => setFilter({ blur: v }, 'bl')} />
        </Row>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn--sm" aria-pressed={filters.grayscale} onClick={() => setFilter({ grayscale: !filters.grayscale }, 'gs')}>
            {filters.grayscale ? 'Restore color' : 'Black and white'}
          </button>
          <button className="btn btn--sm btn--ghost" onClick={() => set({ filters: undefined })}>
            Reset
          </button>
        </div>
      </Group>

      {palette.length > 0 && (
        <Group title="Colours in this photo">
          <div className="palette">
            {palette.map((c) => (
              <button key={c} style={{ background: c }} title={`${c}. Click to use as the page background`} aria-label={`Use ${c} as page background`} onClick={() => updatePage(useEditorStore.getState().currentPageId, { background: c })} />
            ))}
          </div>
        </Group>
      )}

      <Group title="Border">
        <ColorField ariaLabel="Border color" value={d.stroke ?? 'transparent'} allowNone onChange={(c) => set({ stroke: c === 'transparent' ? undefined : c, strokeWidth: c === 'transparent' ? 0 : Math.max(4, d.strokeWidth ?? 0) }, 'bc')} />
        {d.stroke && (
          <Row label="Weight">
            <SliderField ariaLabel="Border weight" value={d.strokeWidth ?? 0} min={0} max={40} onChange={(v) => set({ strokeWidth: v }, 'bw')} />
          </Row>
        )}
      </Group>

      <Group title="Smart tools">
        <Button size="sm" className="btn--ai" icon="scissors" loading={busy === 'bg'} disabled={!single} onClick={() => void run('bg', () => removeBackground(el.id))}>
          Remove background
        </Button>
        <Button size="sm" className="btn--ai" icon="magic" disabled={!single || !d.naturalWidth} onClick={() => useEditorUiStore.getState().setEraser(el.id)}>
          Magic eraser
        </Button>
        <Button size="sm" className="btn--ai" icon="layers" loading={busy === 'split'} disabled={!single} onClick={() => void run('split', () => splitIntoLayers(el.id))}>
          Split into layers
        </Button>
        <Button size="sm" icon="text" loading={busy === 'ocr'} disabled={!single} onClick={() => void run('ocr', () => extractText(el.id))}>
          Extract text
        </Button>
        <Button size="sm" icon="image" disabled={!single} onClick={() => void setPageBackgroundImage(d.src)}>
          Use as page background
        </Button>
      </Group>

      <Group title="Accessibility">
        <input className="input input--sm" aria-label="Alternative text" placeholder="Describe the image" value={d.alt ?? ''} onChange={(e) => set({ alt: e.target.value }, 'alt')} />
      </Group>
    </>
  )
}
