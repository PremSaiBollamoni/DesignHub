import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { insertAsset } from '@/editor/actions/assetActions'
import { updateElements } from '@/editor/actions/elementActions'
import { updatePage } from '@/editor/actions/pageActions'
import { loadFont } from '@/services/assets/fonts'
import { selectActiveKit, useBrandStore } from '@/stores/brandStore'
import { useEditorStore } from '@/stores/editorStore'
import { Button } from '@/components/ui/Button'
import { PanelShell } from './PanelShell'
import { recolorToBrand } from '@/editor/actions/brandActions'
import { toast } from '@/stores/toastStore'

export function BrandPanel() {
  const { kits, load, setActive } = useBrandStore()
  const kit = useBrandStore(selectActiveKit)
  useEffect(() => {
    void load()
  }, [load])
  useEffect(() => {
    kit?.fonts.forEach((f) => void loadFont(f.family, [f.weight]))
  }, [kit])

  function applyColor(hex: string) {
    const s = useEditorStore.getState()
    if (!s.selection.length) return updatePage(s.currentPageId, { background: hex })
    updateElements(s.selection, (el) => (el.type === 'text' ? { fill: hex } : el.type === 'shape' || el.type === 'icon' || el.type === 'frame' ? { fill: hex } : {}))
  }

  function applyFont(family: string, weight: number) {
    const s = useEditorStore.getState()
    updateElements(
      s.selection.filter((id) => s.elements[id]?.type === 'text'),
      { fontFamily: family, fontWeight: weight },
    )
  }

  if (!kit) {
    return (
      <PanelShell title="Brand">
        <p className="help">{kits.length ? 'Choose a brand kit.' : 'You have no brand kit yet.'}</p>
        <Link className="btn btn--primary" to="/brand" style={{ textDecoration: 'none' }}>
          Set up your brand
        </Link>
      </PanelShell>
    )
  }
  return (
    <PanelShell title="Brand">
      {kits.length > 1 && (
        <select className="select" aria-label="Brand kit" value={kit.id} onChange={(e) => setActive(Number(e.target.value))}>
          {kits.map((k) => (
            <option key={k.id} value={k.id}>
              {k.name}
            </option>
          ))}
        </select>
      )}
      <Button
        variant="primary"
        icon="brand"
        onClick={() => {
          const n = recolorToBrand(kit.colors)
          if (n) toast.success(`Recoloured ${n} item${n === 1 ? '' : 's'} with your brand colours. Undo with Ctrl Z.`)
          else toast.info('Add at least two colours to your brand kit first.')
        }}
      >
        Apply brand colours to this design
      </Button>
      <section className="drawer__section">
        <h3>Colors</h3>
        <div className="tile-grid">
          {kit.colors.map((c, i) => (
            <button key={i} className="tile" style={{ background: c.hex, color: '#fff', textShadow: '0 1px 2px rgb(0 0 0 / 40%)', fontSize: 11 }} onClick={() => applyColor(c.hex)} title={`${c.name} ${c.hex}. Applies to the selection, or to the page background.`}>
              {c.name}
            </button>
          ))}
        </div>
      </section>
      <section className="drawer__section" style={{ display: 'grid', gap: 8 }}>
        <h3>Fonts</h3>
        {kit.fonts.map((f, i) => (
          <button key={i} className="text-preset" style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight, fontSize: 18 }} onClick={() => applyFont(f.family, f.weight)}>
            {f.family}
            <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 400, fontSize: 12, color: 'var(--ink-3)' }}>{f.role}. Applies to selected text.</div>
          </button>
        ))}
      </section>
      <section className="drawer__section">
        <h3>Logos</h3>
        {kit.assets.length === 0 ? (
          <p className="help">No logos uploaded.</p>
        ) : (
          <div className="tile-grid tile-grid--2">
            {kit.assets.map((a) => (
              <button key={a.id} className="tile tile--img" style={{ padding: 8 }} onClick={() => void insertAsset({ kind: 'image', url: a.url, width: a.width, height: a.height })} title={a.fileName}>
                <img src={a.url} alt={a.fileName} style={{ objectFit: 'contain' }} />
              </button>
            ))}
          </div>
        )}
        <Link to="/brand" style={{ fontSize: 13 }}>
          <Button size="sm" variant="ghost">
            Edit brand kit
          </Button>
        </Link>
      </section>
    </PanelShell>
  )
}
