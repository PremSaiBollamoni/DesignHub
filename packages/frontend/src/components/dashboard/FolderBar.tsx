import { useEffect, useState } from 'react'
import { projectApi } from '@/services/api/projectApi'
import { useProjectStore } from '@/stores/projectStore'
import { errorMessage, toast } from '@/stores/toastStore'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { TextField } from '@/components/ui/Fields'
import { Icon } from '@/components/ui/Icon'
import { Menu } from '@/components/ui/Menu'
import { confirmDialog } from '@/components/ui/confirm'
import type { Folder } from '@/models/api'

export function FolderBar() {
  const { folders, loadFolders, query, setQuery } = useProjectStore()
  const [editing, setEditing] = useState<Folder | 'new' | null>(null)

  useEffect(() => {
    void loadFolders()
  }, [loadFolders])

  async function remove(f: Folder) {
    const ok = await confirmDialog({
      title: `Delete "${f.name}"?`,
      message: 'The designs inside stay in your account. Only the folder is removed.',
      confirmLabel: 'Delete folder',
      danger: true,
    })
    if (!ok) return
    try {
      await projectApi.deleteFolder(f.id)
      if (query.folderId === f.id) setQuery({ folderId: undefined })
      await loadFolders()
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <div className="folders">
      <button className="chip" aria-pressed={!query.folderId} onClick={() => setQuery({ folderId: undefined })}>
        Everything
      </button>
      {folders.map((f) => (
        <span key={f.id} style={{ display: 'inline-flex', alignItems: 'center' }}>
          <button className="chip" aria-pressed={query.folderId === f.id} onClick={() => setQuery({ folderId: f.id })}>
            <Icon name="folder" size={14} />
            &nbsp;{f.name}
          </button>
          <Menu
            trigger={<button className="icon-btn icon-btn--sm" aria-label={`Folder actions for ${f.name}`}><Icon name="more" size={14} /></button>}
            items={[
              { label: 'Rename', icon: 'pen', onSelect: () => setEditing(f) },
              { label: 'Delete', icon: 'trash', danger: true, onSelect: () => void remove(f) },
            ]}
          />
        </span>
      ))}
      <Button size="sm" variant="ghost" icon="plus" onClick={() => setEditing('new')}>
        New folder
      </Button>
      {editing && (
        <FolderModal
          folder={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null)
            await loadFolders()
          }}
        />
      )}
    </div>
  )
}

function FolderModal({ folder, onClose, onSaved }: { folder: Folder | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(folder?.name ?? '')
  const [busy, setBusy] = useState(false)
  async function save() {
    setBusy(true)
    try {
      if (folder) await projectApi.renameFolder(folder.id, name.trim())
      else await projectApi.createFolder(name.trim())
      onSaved()
    } catch (e) {
      toast.error(errorMessage(e))
      setBusy(false)
    }
  }
  return (
    <Modal
      title={folder ? 'Rename folder' : 'New folder'}
      onClose={onClose}
      locked={busy}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={busy} disabled={!name.trim()} onClick={() => void save()}>
            {folder ? 'Save name' : 'Create folder'}
          </Button>
        </>
      }
    >
      <TextField label="Folder name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} onKeyDown={(e) => e.key === 'Enter' && name.trim() && void save()} />
    </Modal>
  )
}
