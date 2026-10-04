import { useEffect, useState } from 'react'
import { parseBackground, serializeBackground, type PageBackground } from '@/models/design'
import { resizeCanvas, updatePage } from '@/editor/actions/pageActions'
import { resizeAndScale } from '@/editor/actions/resizeActions'
import { naturalPageDuration } from '@/services/render/animation'
import { useEditorStore } from '@/stores/editorStore'
import { Button } from '@/components/ui/Button'
import { ColorField, Group, NumField, Row, SliderField } from './controls'

const PRESETS = [
  { label: 'Square post', w: 1080, h: 1080 },
  { label: 'Story', w: 1080, h: 1920 },
  { label: 'Landscape 16:9', w: 1920, h: 1080 },
  { label: 'Poster', w: 1587, h: 2245 },
  { label: 'Banner', w: 1584, h: 396 },
]

export function PageProps() {
  const pageId = useEditorStore((s) => s.currentPageId)
  const page = useEditorStore((s) => s.pages[s.currentPageId])
  const width = useEditorStore((s) => s.width)
  const height = useEditorStore((s) => s.height)
  const elements = useEditorStore((s) => s.elements)
  const ids = useEditorStore((s) => s.pageElementIds[s.currentPageId])
  const [w, setW] = useState(width)
  const [h, setH] = useState(height)
  useEffect(() => {
    setW(width)
    setH(height)
  }, [width, height])
  if (!page) return null
  const bg = parseBackground(page.background)
  const setBg = (next: PageBackground, key?: string) => updatePage(pageId, { background: serializeBackground(next) }, key ? `bg-${key}` : undefined)
  const suggested = naturalPageDuration((ids ?? []).map((id) => elements[id]!).filter(Boolean))

  return (
    <>
      <Group title="Page background">
        <div className="seg" role="group" aria-label="Background type">
          <button aria-pressed={bg.type === 'solid'} style={{ width: 'auto', padding: '0 12px' }} onClick={() => setBg({ type: 'solid', color: bg.type === 'solid' ? bg.color : '#FFFFFF' })}>
            Solid
          </button>
          <button aria-pressed={bg.type === 'gradient'} style={{ width: 'auto', padding: '0 12px' }} onClick={() => setBg({ type: 'gradient', from: '#FF5A36', to: '#FFB547', angle: 45 })}>
            Gradient
          </button>
          {bg.type === 'image' && (
            <button aria-pressed style={{ width: 'auto', padding: '0 12px' }}>
              Image
            </button>
          )}
        </div>
        {bg.type === 'solid' && <ColorField ariaLabel="Background color" value={bg.color} onChange={(c) => setBg({ type: 'solid', color: c }, 'c')} />}
        {bg.type === 'gradient' && (
          <>
            <Row label="From">
              <ColorField ariaLabel="Gradient start" value={bg.from} onChange={(c) => setBg({ ...bg, from: c }, 'g1')} />
            </Row>
            <Row label="To">
              <ColorField ariaLabel="Gradient end" value={bg.to} onChange={(c) => setBg({ ...bg, to: c }, 'g2')} />
            </Row>
            <Row label="Angle">
              <SliderField ariaLabel="Gradient angle" value={bg.angle} min={0} max={360} format={(v) => `${v}°`} onChange={(v) => setBg({ ...bg, angle: v }, 'ga')} />
            </Row>
          </>
        )}
        {bg.type === 'image' && (
          <div style={{ display: 'flex', gap: 6 }}>
            <Button size="sm" onClick={() => setBg({ ...bg, fit: bg.fit === 'cover' ? 'contain' : 'cover' })}>
              {bg.fit === 'cover' ? 'Fit inside' : 'Fill page'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setBg({ type: 'solid', color: '#FFFFFF' })}>
              Remove image
            </Button>
          </div>
        )}
      </Group>

      <Group title="Page timing">
        <Row label="Duration">
          <NumField ariaLabel="Page duration in seconds" value={page.durationSeconds ?? suggested} min={1} max={600} onChange={(v) => updatePage(pageId, { durationSeconds: v }, 'dur')} />
        </Row>
        <p className="field__hint">Used for preview, video and GIF export. Fits your animations at {suggested} seconds.</p>
      </Group>

      <Group title="Canvas size">
        <div className="prop-pair">
          <NumField label="W" ariaLabel="Canvas width" value={w} min={16} max={16000} onChange={setW} />
          <NumField label="H" ariaLabel="Canvas height" value={h} min={16} max={16000} onChange={setH} />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              className="chip"
              onClick={() => {
                setW(p.w)
                setH(p.h)
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Button size="sm" variant="primary" disabled={w === width && h === height} onClick={() => resizeAndScale(Math.round(w), Math.round(h))}>
            Resize and scale content
          </Button>
          <Button size="sm" disabled={w === width && h === height} onClick={() => resizeCanvas(Math.round(w), Math.round(h))}>
            Resize canvas only
          </Button>
        </div>
        <p className="field__hint">Scaling moves and resizes everything on every page to fit. Canvas only keeps elements where they are.</p>
      </Group>
    </>
  )
}
