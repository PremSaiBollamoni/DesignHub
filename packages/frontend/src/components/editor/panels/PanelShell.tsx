import type { ReactNode } from 'react'
import { IconButton } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { useEditorUiStore } from '@/stores/editorUiStore'

interface Props {
  title: string
  children: ReactNode
  search?: { value: string; onChange: (v: string) => void; placeholder: string }
  /** Optional strip between the title and the search box, e.g. a source switcher. */
  header?: ReactNode
}

export function PanelShell({ title, children, search, header }: Props) {
  const close = useEditorUiStore((s) => s.setLeftPanel)
  return (
    <aside className="drawer" aria-label={title}>
      <div className="drawer__head">
        <h2>{title}</h2>
        <IconButton icon="chevronLeft" label={`Close ${title}`} size="sm" onClick={() => close(null)} />
      </div>
      {header && <div style={{ margin: '0 14px 10px' }}>{header}</div>}
      {search && (
        <div className="drawer__search">
          <Icon name="search" size={16} />
          <input className="input" type="search" placeholder={search.placeholder} aria-label={search.placeholder} value={search.value} onChange={(e) => search.onChange(e.target.value)} />
        </div>
      )}
      <div className="drawer__body">{children}</div>
    </aside>
  )
}
