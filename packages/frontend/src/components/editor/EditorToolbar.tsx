import { canEditAccess } from '@/models/access'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { projectApi } from '@/services/api/projectApi'
import { useAuthStore } from '@/stores/authStore'
import { useCollabStore } from '@/stores/collabStore'
import { useEditorStore } from '@/stores/editorStore'
import { useEditorUiStore } from '@/stores/editorUiStore'
import { errorMessage, toast } from '@/stores/toastStore'
import { ApprovalControls } from './approval/ApprovalControls'
import { Logo } from '@/components/ui/Icon'
import { Button, IconButton } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Fields'
import { Menu } from '@/components/ui/Menu'
import { clamp } from '@/utils/common'

export type EditorDialog = 'export' | 'share' | 'publish' | 'shortcuts' | 'template' | 'find' | 'approval' | 'review' | null

const SAVE_LABEL = { saved: 'All changes saved', saving: 'Saving…', offline: 'Offline, retrying', error: 'Could not save' } as const

export function EditorToolbar({ onDialog }: { onDialog: (d: EditorDialog) => void }) {
  const navigate = useNavigate()
  const me = useAuthStore((s) => s.user)!
  const title = useEditorStore((s) => s.title)
  const projectId = useEditorStore((s) => s.projectId)
  const access = useEditorStore((s) => s.access)
  const canUndo = useEditorStore((s) => s.undoStack.length > 0)
  const canRedo = useEditorStore((s) => s.redoStack.length > 0)
  const zoom = useEditorUiStore((s) => s.zoom)
  const timeline = useEditorUiStore((s) => s.timelineOpen)
  const saveState = useCollabStore((s) => s.saveState)
  const connection = useCollabStore((s) => s.connection)
  const presence = useCollabStore((s) => s.presence)
  const [name, setName] = useState(title)
  const canEdit = canEditAccess(access)

  useEffect(() => setName(title), [title])

  function setZoom(next: number) {
    const ui = useEditorUiStore.getState()
    const el = document.querySelector('.workspace') as HTMLElement | null
    const cx = (el?.clientWidth ?? 800) / 2
    const cy = (el?.clientHeight ?? 600) / 2
    const z = clamp(next, 0.05, 8)
    const ratio = z / ui.zoom
    ui.setView({ zoom: z, panX: cx - (cx - ui.panX) * ratio, panY: cy - (cy - ui.panY) * ratio, autoFit: false })
  }

  async function commitTitle() {
    const next = name.trim()
    if (!next || next === title) return setName(title)
    useEditorStore.getState().setTitle(next)
    try {
      await projectApi.update(projectId, { title: next })
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <header className="etop">
      <IconButton icon="chevronLeft" label="Back to your designs" onClick={() => navigate('/')} />
      <Logo size={24} />
      <input
        className="etop__title"
        aria-label="Design name"
        value={name}
        disabled={access !== 'OWNER'}
        maxLength={200}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => void commitTitle()}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
      <span className="save-chip" data-state={saveState} role="status">
        <i />
        {canEdit ? SAVE_LABEL[saveState] : 'View only'}
      </span>
      <span className="etop__sep" />
      <div className="etop__group">
        <IconButton icon="undo" label="Undo" disabled={!canUndo || !canEdit} onClick={() => useEditorStore.getState().undo()} />
        <IconButton icon="redo" label="Redo" disabled={!canRedo || !canEdit} onClick={() => useEditorStore.getState().redo()} />
      </div>
      <span className="etop__sep" />
      <div className="etop__group">
        <IconButton icon="zoomOut" label="Zoom out" onClick={() => setZoom(zoom / 1.25)} />
        <button className="zoom-label" aria-label="Fit page to screen" title="Fit page to screen" onClick={() => useEditorUiStore.getState().setView({ autoFit: true })}>
          {Math.round(zoom * 100)}%
        </button>
        <IconButton icon="zoomIn" label="Zoom in" onClick={() => setZoom(zoom * 1.25)} />
      </div>
      <span className="etop__spacer" />
      <div className="etop__group">
        <IconButton icon="timeline" label="Animation timeline" active={timeline} onClick={() => useEditorUiStore.getState().setTimelineOpen(!timeline)} />
        <IconButton icon="play" label="Present" onClick={() => useEditorUiStore.getState().setPresenting(true)} />
      </div>
      <div className="presence" aria-label={`${presence.length} people here`}>
        {presence
          .filter((p, i, a) => a.findIndex((x) => x.userId === p.userId) === i)
          .slice(0, 5)
          .map((p) => (
            <span key={p.userId} style={{ outline: `2px solid ${p.color}`, borderRadius: '50%', display: 'inline-flex' }} title={p.userId === me.id ? `${p.name} (you)` : p.name}>
              <Avatar name={p.name} src={p.avatarUrl} size={26} />
            </span>
          ))}
      </div>
      {connection !== 'online' && <span className="badge badge--warn">{connection === 'connecting' ? 'Connecting…' : 'Not live'}</span>}
      <Button icon="share" onClick={() => onDialog('share')}>
        Share
      </Button>
      <ApprovalControls onDialog={onDialog} />
      <Button variant="primary" icon="download" onClick={() => onDialog('export')}>
        Export
      </Button>
      <Menu
        align="end"
        trigger={<IconButton icon="more" label="More options" />}
        items={[
          { label: 'Save a version…', icon: 'history', disabled: !canEdit, onSelect: () => useEditorUiStore.getState().setRightTab('history') },
          { label: 'Save as template', icon: 'template', disabled: access !== 'OWNER', onSelect: () => onDialog('template') },
          { label: 'Find and replace text', icon: 'search', hint: 'Ctrl F', onSelect: () => onDialog('find') },
          { label: 'Duplicate design', icon: 'copy', onSelect: () => void projectApi.duplicate(projectId).then((p) => navigate(`/editor/${p.id}`)).catch((e) => toast.error(errorMessage(e))) },
          'separator',
          { label: 'Keyboard shortcuts', icon: 'info', hint: '?', onSelect: () => onDialog('shortcuts') },
        ]}
      />
    </header>
  )
}
