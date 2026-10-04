import { useState } from 'react'
import { dragProps } from '@/editor/actions/dropActions'
import { insertAsset } from '@/editor/actions/assetActions'
import { ILLUSTRATIONS } from '@/services/assets/graphics'
import { ILLUSTRATION_PROVIDERS } from '@/services/assets/providers'
import { Tabs } from '@/components/ui/Fields'
import { PanelShell } from './PanelShell'
import { StockPanel } from './StockPanel'

type Source = 'built-in' | 'stock'

export function IllustrationsPanel() {
  const [source, setSource] = useState<Source>('built-in')
  const tabs = <Tabs<Source> value={source} onChange={setSource} tabs={[{ id: 'built-in', label: 'Built in' }, { id: 'stock', label: 'Search library' }]} />

  if (source === 'stock') {
    return <StockPanel header={tabs} title="Illustrations" provider={ILLUSTRATION_PROVIDERS[0]!} placeholder="Search illustrations" defaultQuery="illustration" emptyHint="Try a broader word such as “plant” or “city”." />
  }
  return (
    <PanelShell title="Illustrations" header={tabs}>
      <div className="tile-grid tile-grid--2">
        {ILLUSTRATIONS.map((g) => (
          <button
            key={g.id}
            className="tile"
            aria-label={`Add ${g.name}`}
            title={g.name}
            onClick={() => void insertAsset({ kind: 'icon', svg: g.svg, name: g.name })}
            {...dragProps({ kind: 'icon', svg: g.svg, name: g.name })}
          >
            <span style={{ width: '100%', height: '100%', display: 'block' }} dangerouslySetInnerHTML={{ __html: g.svg.replace('<svg', '<svg width="100%" height="100%"') }} />
          </button>
        ))}
      </div>
    </PanelShell>
  )
}
