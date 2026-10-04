import { useEffect, useState } from 'react'
import type { Category } from '@/models/api'
import { contentApi } from '@/services/api/contentApi'
import { collectPages } from '@/services/export/exportTypes'
import { renderPageCanvas, renderThumbnail } from '@/services/render/pageRenderer'
import { useEditorStore } from '@/stores/editorStore'
import { errorMessage, toast } from '@/stores/toastStore'
import { useApprovalStore } from '@/stores/approvalStore'
import { collabSession } from '@/services/realtime/collabSession'
import { PostComposer } from '@/components/social/PostComposer'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { SelectField, TextField } from '@/components/ui/Fields'
import { Spinner } from '@/components/ui/Feedback'
import { canvasToBlob } from '@/services/export/exportTypes'

const SHORTCUTS: [string, string][] = [
  ['Ctrl Z / Ctrl Shift Z', 'Undo / redo'],
  ['Ctrl C / X / V', 'Copy, cut, paste'],
  ['Ctrl D', 'Duplicate'],
  ['Delete', 'Delete selection'],
  ['Arrows (Shift for 10 px)', 'Nudge'],
  ['Ctrl G / Ctrl Shift G', 'Group / ungroup'],
  ['Ctrl ] / Ctrl [', 'Bring forward / send backward'],
  ['Ctrl A', 'Select all on page'],
  ['Ctrl F', 'Find and replace text'],
  ['Ctrl Alt C / Ctrl Alt V', 'Copy and paste style'],
  ['Drag from a ruler', 'Create a guide'],
  ['T, R, O, L', 'Add text, rectangle, circle, line'],
  ['Space + drag', 'Pan the canvas'],
  ['Ctrl scroll or Ctrl + / -', 'Zoom'],
  ['Ctrl 0', 'Fit page to screen'],
  ['P', 'Present'],
  ['?', 'This list'],
]

export function ShortcutsModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Keyboard shortcuts" onClose={onClose}>
      <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 20px', margin: 0 }}>
        {SHORTCUTS.map(([k, v]) => (
          <div key={k} style={{ display: 'contents' }}>
            <dt><span className="kbd" style={{ padding: '0 8px' }}>{k}</span></dt>
            <dd style={{ margin: 0 }}>{v}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  )
}

/** Renders the current page, uploads it, then hands over to the post composer with the image attached. */
export function PublishModal({ onClose }: { onClose: () => void }) {
  const projectId = useEditorStore((s) => s.projectId)
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    void (async () => {
      try {
        const { pages, width, height } = collectPages('current')
        const canvas = await renderPageCanvas(pages[0]!, { width, height, pixelRatio: Math.min(2, 2048 / Math.max(width, height)) })
        const asset = await contentApi.upload(await canvasToBlob(canvas, 'image/png'), 'post.png')
        if (live) setMediaUrl(asset.url)
      } catch (e) {
        toast.error(errorMessage(e))
        if (live) onClose()
      }
    })()
    return () => {
      live = false
    }
  }, [onClose])

  if (!mediaUrl) {
    return (
      <Modal title="Preparing your image" onClose={onClose}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Spinner /> Rendering this page for publishing…
        </div>
      </Modal>
    )
  }
  return <PostComposer projectId={projectId} mediaUrl={mediaUrl} caption={useApprovalStore.getState().approval?.caption} onClose={onClose} />
}

export function SaveTemplateModal({ onClose }: { onClose: () => void }) {
  const projectId = useEditorStore((s) => s.projectId)
  const [title, setTitle] = useState(useEditorStore.getState().title)
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryId, setCategoryId] = useState('')
  const [tags, setTags] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    void contentApi.categories().then(setCategories).catch(() => undefined)
  }, [])

  async function save() {
    setBusy(true)
    try {
      collabSession.flushNow()
      await new Promise((r) => setTimeout(r, 600))
      const { pages, width, height } = collectPages('current')
      const thumbnail = await renderThumbnail(pages[0]!, width, height, 400)
      await contentApi.publishTemplate(projectId, { title: title.trim(), categoryId: Number(categoryId) || undefined, tags, thumbnail })
      toast.success('Saved to the template library')
      onClose()
    } catch (e) {
      toast.error(errorMessage(e))
      setBusy(false)
    }
  }
  return (
    <Modal
      title="Save as template"
      onClose={onClose}
      locked={busy}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={busy} disabled={!title.trim()} onClick={() => void save()}>Save template</Button>
        </>
      }
    >
      <TextField label="Template name" value={title} onChange={(e) => setTitle(e.target.value)} />
      <SelectField label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
        <option value="">No category</option>
        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </SelectField>
      <TextField label="Tags" hint="Comma separated, used by search" value={tags} onChange={(e) => setTags(e.target.value)} />
      <p className="field__hint">Everyone on DesignHub can use this template.</p>
    </Modal>
  )
}
