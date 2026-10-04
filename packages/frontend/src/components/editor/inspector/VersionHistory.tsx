import { canEditAccess } from '@/models/access'
import { useCallback, useEffect, useState } from 'react'
import type { VersionMeta } from '@/models/api'
import { projectApi } from '@/services/api/projectApi'
import { collabSession } from '@/services/realtime/collabSession'
import { collectPages } from '@/services/export/exportTypes'
import { renderThumbnail } from '@/services/render/pageRenderer'
import { useEditorStore } from '@/stores/editorStore'
import { errorMessage, toast } from '@/stores/toastStore'
import { Button, IconButton } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Feedback'
import { confirmDialog } from '@/components/ui/confirm'
import { timeAgo } from '@/utils/common'

export function VersionHistory() {
  const projectId = useEditorStore((s) => s.projectId)
  const canEdit = useEditorStore((s) => canEditAccess(s.access))
  const [versions, setVersions] = useState<VersionMeta[] | null>(null)
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setVersions(await projectApi.versions(projectId))
    } catch (e) {
      toast.error(errorMessage(e))
      setVersions([])
    }
  }, [projectId])
  useEffect(() => {
    void load()
  }, [load])

  async function save() {
    setBusy('save')
    try {
      collabSession.flushNow()
      const { pages, width, height } = collectPages('current')
      const thumb = await renderThumbnail(pages[0]!, width, height, 200).catch(() => undefined)
      // Give queued operations a moment to reach the server so the snapshot includes them.
      await new Promise((r) => setTimeout(r, 600))
      await projectApi.saveVersion(projectId, label.trim() || `Version ${new Date().toLocaleString()}`, false, thumb)
      setLabel('')
      await load()
      toast.success('Version saved')
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(null)
    }
  }

  async function restore(v: VersionMeta) {
    const ok = await confirmDialog({
      title: `Restore "${v.label}"?`,
      message: 'Your current design is saved as a version first, so you can come back to it.',
      confirmLabel: 'Restore this version',
    })
    if (!ok) return
    setBusy(`r${v.id}`)
    try {
      collabSession.flushNow()
      await new Promise((r) => setTimeout(r, 600))
      await projectApi.restoreVersion(projectId, v.id)
      useEditorStore.getState().replaceDocument(await projectApi.loadDesign(projectId))
      await load()
      toast.success('Version restored')
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div style={{ display: 'grid', gap: 12, paddingTop: 12 }}>
      {canEdit && (
        <div style={{ display: 'grid', gap: 8 }}>
          <input className="input" placeholder="Name this version (optional)" aria-label="Version name" value={label} maxLength={160} onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') void save() }} />
          <Button variant="primary" icon="history" loading={busy === 'save'} onClick={() => void save()}>
            Save version
          </Button>
        </div>
      )}
      {versions === null ? (
        <Skeleton height={120} />
      ) : versions.length === 0 ? (
        <p className="help">No versions yet. Save one before a big change so you can always return to this point.</p>
      ) : (
        versions.map((v) => (
          <div key={v.id} className="version">
            {v.thumbnail ? <img src={v.thumbnail} alt="" /> : <div className="version__ph" />}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.label}</div>
              <div className="field__hint">
                {v.authorName ?? 'Someone'} · {timeAgo(v.createdAt)} {v.auto && <span className="badge">Auto</span>}
              </div>
            </div>
            {canEdit && (
              <div style={{ display: 'flex' }}>
                <Button size="sm" loading={busy === `r${v.id}`} onClick={() => void restore(v)}>
                  Restore
                </Button>
                <IconButton
                  icon="trash"
                  size="sm"
                  label={`Delete ${v.label}`}
                  onClick={async () => {
                    await projectApi.deleteVersion(projectId, v.id).catch((e) => toast.error(errorMessage(e)))
                    await load()
                  }}
                />
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}
