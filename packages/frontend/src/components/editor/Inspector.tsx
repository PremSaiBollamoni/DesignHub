import { useCollabStore } from '@/stores/collabStore'
import { useEditorUiStore, type RightTab } from '@/stores/editorUiStore'
import { IconButton } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Fields'
import { CommentsPanel } from './inspector/CommentsPanel'
import { DesignTab } from './inspector/DesignTab'
import { LayersPanel } from './inspector/LayersPanel'
import { VersionHistory } from './inspector/VersionHistory'

export function Inspector() {
  const tab = useEditorUiStore((s) => s.rightTab)
  const setTab = useEditorUiStore((s) => s.setRightTab)
  const setOpen = useEditorUiStore((s) => s.setRightOpen)
  const open = useCollabStore((s) => s.comments.filter((c) => !c.parentId && !c.resolved).length)

  return (
    <aside className="inspector" aria-label="Inspector">
      <div className="inspector__tabs" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <Tabs<RightTab>
            value={tab}
            onChange={setTab}
            tabs={[
              { id: 'design', label: 'Design' },
              { id: 'layers', label: 'Layers' },
              { id: 'comments', label: open ? `Notes ${open}` : 'Notes' },
              { id: 'history', label: 'History' },
            ]}
          />
        </div>
        <IconButton icon="chevronRight" label="Hide inspector" size="sm" onClick={() => setOpen(false)} />
      </div>
      <div className="inspector__body">
        {tab === 'design' && <DesignTab />}
        {tab === 'layers' && <LayersPanel />}
        {tab === 'comments' && <CommentsPanel />}
        {tab === 'history' && <VersionHistory />}
      </div>
    </aside>
  )
}
