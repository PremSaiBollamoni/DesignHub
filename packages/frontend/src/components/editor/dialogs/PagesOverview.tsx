import { canEditAccess } from '@/models/access'
import { useState } from 'react'
import { addPage, deletePage, duplicatePage, movePage } from '@/editor/actions/pageActions'
import { useEditorStore } from '@/stores/editorStore'
import { Button, IconButton } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useThumbnails } from '../PagesDock'

/** Every page at a glance. Drag to reorder, click to open, and manage pages in bulk. */
export function PagesOverview({ onClose }: { onClose: () => void }) {
  const pageIds = useEditorStore((s) => s.pageIds)
  const pages = useEditorStore((s) => s.pages)
  const ratio = useEditorStore((s) => s.width / s.height)
  const canEdit = useEditorStore((s) => canEditAccess(s.access))
  const thumbs = useThumbnails()
  const [over, setOver] = useState<string | null>(null)

  return (
    <Modal
      title={`All pages (${pageIds.length})`}
      onClose={onClose}
      wide
      footer={
        canEdit ? (
          <Button icon="plus" variant="primary" onClick={() => addPage(pageIds[pageIds.length - 1])}>
            Add page
          </Button>
        ) : undefined
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14 }}>
        {pageIds.map((id, i) => (
          <div
            key={id}
            draggable={canEdit}
            onDragStart={(e) => e.dataTransfer.setData('text/page', id)}
            onDragOver={(e) => { e.preventDefault(); setOver(id) }}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => { e.preventDefault(); setOver(null); const from = e.dataTransfer.getData('text/page'); if (from && from !== id) movePage(from, i) }}
            style={{ display: 'grid', gap: 6, padding: 8, border: `1px solid ${over === id ? 'var(--brand)' : 'var(--border)'}`, borderRadius: 12, background: 'var(--surface)' }}
          >
            <button
              style={{ border: 0, padding: 0, background: 'var(--surface-2)', borderRadius: 6, display: 'grid', placeItems: 'center', aspectRatio: `${Math.max(0.6, Math.min(ratio, 2))}`, overflow: 'hidden' }}
              aria-label={`Open ${pages[id]?.name}`}
              onClick={() => { useEditorStore.getState().setCurrentPage(id); onClose() }}
            >
              {thumbs.get(id)?.url ? <img src={thumbs.get(id)!.url} alt="" style={{ maxWidth: '100%', maxHeight: '100%' }} /> : null}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{i + 1}. {pages[id]?.name}</span>
              {canEdit && (
                <span style={{ display: 'flex' }}>
                  <IconButton icon="copy" size="sm" label={`Duplicate ${pages[id]?.name}`} onClick={() => duplicatePage(id)} />
                  <IconButton icon="trash" size="sm" label={`Delete ${pages[id]?.name}`} disabled={pageIds.length <= 1} onClick={() => deletePage(id)} />
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}
