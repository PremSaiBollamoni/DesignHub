import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/components/ui/iconPaths'
import { useEditorUiStore, type LeftPanel } from '@/stores/editorUiStore'
import { AnimationsPanel } from './panels/AnimationsPanel'
import { BrandPanel } from './panels/BrandPanel'
import { ElementsPanel } from './panels/ElementsPanel'
import { IllustrationsPanel } from './panels/IllustrationsPanel'
import { MagicMediaPanel } from './panels/MagicMediaPanel'
import { StockPanel } from './panels/StockPanel'
import { TemplatesPanel } from './panels/TemplatesPanel'
import { TextPanel } from './panels/TextPanel'
import { UploadsPanel } from './panels/UploadsPanel'
import { GIF_PROVIDERS, PHOTO_PROVIDERS } from '@/services/assets/providers'

const ITEMS: { id: Exclude<LeftPanel, null>; label: string; icon: IconName }[] = [
  { id: 'templates', label: 'Templates', icon: 'template' },
  { id: 'elements', label: 'Elements', icon: 'shapes' },
  { id: 'text', label: 'Text', icon: 'text' },
  { id: 'uploads', label: 'Uploads', icon: 'upload' },
  { id: 'photos', label: 'Photos', icon: 'image' },
  { id: 'gifs', label: 'GIFs', icon: 'gif' },
  { id: 'illustrations', label: 'Art', icon: 'pen' },
  { id: 'animations', label: 'Motion', icon: 'animation' },
  { id: 'magic', label: 'Magic', icon: 'magic' },
  { id: 'brand', label: 'Brand', icon: 'brand' },
]

export function LeftRail() {
  const panel = useEditorUiStore((s) => s.leftPanel)
  const toggle = useEditorUiStore((s) => s.toggleLeftPanel)
  return (
    <nav className="rail" aria-label="Design tools">
      {ITEMS.map((it) => (
        <button key={it.id} className={`rail__item ${it.id === 'magic' ? 'rail__item--ai' : ''}`} aria-pressed={panel === it.id} title={it.label} onClick={() => toggle(it.id)}>
          <Icon name={it.icon} size={21} />
          <span>{it.label}</span>
        </button>
      ))}
    </nav>
  )
}

export function LeftPanelHost() {
  const panel = useEditorUiStore((s) => s.leftPanel)
  switch (panel) {
    case 'templates':
      return <TemplatesPanel />
    case 'elements':
      return <ElementsPanel />
    case 'text':
      return <TextPanel />
    case 'uploads':
      return <UploadsPanel />
    case 'photos':
      return <StockPanel title="Photos" provider={PHOTO_PROVIDERS[0]!} placeholder="Search photos" defaultQuery="nature" emptyHint="Try a simpler word, such as “coffee” or “mountain”." />
    case 'gifs':
      return <StockPanel title="GIFs" provider={GIF_PROVIDERS[0]!} placeholder="Search GIFs" defaultQuery="animation" emptyHint="Try a different word, such as “celebrate” or “loading”." />
    case 'illustrations':
      return <IllustrationsPanel />
    case 'animations':
      return <AnimationsPanel />
    case 'magic':
      return <MagicMediaPanel />
    case 'brand':
      return <BrandPanel />
    default:
      return null
  }
}
