import { useEffect } from 'react'
import { dragProps } from '@/editor/actions/dropActions'
import { insertAsset } from '@/editor/actions/assetActions'
import { insertElements } from '@/editor/actions/elementActions'
import { createText } from '@/editor/model/defaults'
import { loadFont } from '@/services/assets/fonts'
import { selectActiveKit, useBrandStore } from '@/stores/brandStore'
import { useEditorStore } from '@/stores/editorStore'
import { PanelShell } from './PanelShell'

interface Pairing {
  name: string
  heading: { family: string; weight: number; size: number; color: string }
  body: { family: string; weight: number; size: number; color: string }
}

const PAIRINGS: Pairing[] = [
  { name: 'Studio', heading: { family: 'Bricolage Grotesque', weight: 800, size: 120, color: '#151515' }, body: { family: 'Inter Tight', weight: 400, size: 36, color: '#4A4E57' } },
  { name: 'Editorial', heading: { family: 'Fraunces', weight: 600, size: 110, color: '#151515' }, body: { family: 'Inter Tight', weight: 400, size: 34, color: '#4A4E57' } },
  { name: 'Poster', heading: { family: 'Anton', weight: 400, size: 150, color: '#FFB547' }, body: { family: 'Space Grotesk', weight: 500, size: 36, color: '#151515' } },
  { name: 'Friendly', heading: { family: 'Poppins', weight: 700, size: 100, color: '#FF5A36' }, body: { family: 'DM Sans', weight: 400, size: 34, color: '#151515' } },
  { name: 'Handwritten', heading: { family: 'Caveat', weight: 700, size: 140, color: '#151515' }, body: { family: 'Work Sans', weight: 400, size: 32, color: '#4A4E57' } },
]

export function TextPanel() {
  const kit = useBrandStore(selectActiveKit)
  useEffect(() => {
    PAIRINGS.forEach((p) => {
      void loadFont(p.heading.family, [p.heading.weight])
      void loadFont(p.body.family, [p.body.weight])
    })
    kit?.fonts.forEach((f) => void loadFont(f.family, [f.weight]))
  }, [kit])

  function addPairing(p: Pairing) {
    const s = useEditorStore.getState()
    const cx = s.width / 2
    const cy = s.height / 2
    const head = createText({ cx, cy: cy - p.heading.size * 0.4 }, 'heading', { text: 'Your headline', fontFamily: p.heading.family, fontWeight: p.heading.weight, fontSize: p.heading.size, fill: p.heading.color, name: 'Headline', width: s.width * 0.8, height: p.heading.size * 1.2 })
    const body = createText({ cx, cy: cy + p.heading.size * 0.6 }, 'body', { text: 'A line of supporting text that explains it', fontFamily: p.body.family, fontWeight: p.body.weight, fontSize: p.body.size, fill: p.body.color, width: s.width * 0.8, height: p.body.size * 1.2 })
    insertElements([head, body])
  }

  return (
    <PanelShell title="Text">
      <section className="drawer__section" style={{ display: 'grid', gap: 8 }}>
        <h3>Add text</h3>
        <button className="text-preset" style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800 }} onClick={() => void insertAsset({ kind: 'text', preset: 'heading' })} {...dragProps({ kind: 'text', preset: 'heading' })}>
          Add a heading
        </button>
        <button className="text-preset" style={{ fontWeight: 600, fontSize: 18 }} onClick={() => void insertAsset({ kind: 'text', preset: 'subheading' })} {...dragProps({ kind: 'text', preset: 'subheading' })}>
          Add a subheading
        </button>
        <button className="text-preset" onClick={() => void insertAsset({ kind: 'text', preset: 'body' })} {...dragProps({ kind: 'text', preset: 'body' })}>
          Add a little body text
        </button>
      </section>
      {kit && kit.fonts.length > 0 && (
        <section className="drawer__section" style={{ display: 'grid', gap: 8 }}>
          <h3>Your brand fonts</h3>
          {kit.fonts.map((f, i) => (
            <button
              key={i}
              className="text-preset"
              style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight, fontSize: f.role === 'Heading' ? 24 : 17 }}
              onClick={() => {
                const s = useEditorStore.getState()
                insertElements([createText({ cx: s.width / 2, cy: s.height / 2 }, f.role === 'Heading' ? 'heading' : 'body', { fontFamily: f.family, fontWeight: f.weight, text: f.role })])
              }}
            >
              {f.family} · {f.role}
            </button>
          ))}
        </section>
      )}
      <section className="drawer__section" style={{ display: 'grid', gap: 8 }}>
        <h3>Font pairings</h3>
        {PAIRINGS.map((p) => (
          <button key={p.name} className="text-preset" onClick={() => addPairing(p)} aria-label={`Add ${p.name} pairing`}>
            <div style={{ fontFamily: `"${p.heading.family}"`, fontWeight: p.heading.weight, fontSize: 24, color: p.heading.color, lineHeight: 1.1 }}>{p.name}</div>
            <div style={{ fontFamily: `"${p.body.family}"`, fontWeight: p.body.weight, fontSize: 13, color: p.body.color }}>{p.heading.family} with {p.body.family}</div>
          </button>
        ))}
      </section>
    </PanelShell>
  )
}
