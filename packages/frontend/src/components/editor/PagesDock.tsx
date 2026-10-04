import { canEditAccess } from '@/models/access'
import { memo, useEffect, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { addPage, deletePage, duplicatePage, movePage, updatePage } from '@/editor/actions/pageActions'
import { renderThumbnail } from '@/services/render/pageRenderer'
import { useEditorStore } from '@/stores/editorStore'
import { useEditorUiStore } from '@/stores/editorUiStore'
import { Button, IconButton } from '@/components/ui/Button'
import { Menu } from '@/components/ui/Menu'
import { Timeline } from './Timeline'
import { PagesOverview } from './dialogs/PagesOverview'

const cache = new Map<string, { sig: string; url: string }>()
const listeners = new Set<() => void>()
let queue: string[] = []
let running = false

async function pump() {
  if (running) return
  running = true
  while (queue.length) {
    const id = queue.shift()!
    const s = useEditorStore.getState()
    const meta = s.pages[id]
    if (!meta) continue
    const sig = signature(id)
    if (cache.get(id)?.sig === sig) continue
    try {
      const elements = (s.pageElementIds[id] ?? []).map((eid) => s.elements[eid]!).filter((e) => e && !e.data.hidden)
      const url = await renderThumbnail({ background: meta.background, elements }, s.width, s.height, 220)
      cache.set(id, { sig, url })
      listeners.forEach((l) => l())
    } catch {
      /* a failed thumbnail just keeps the previous one */
    }
  }
  running = false
}

function signature(pageId: string): string {
  const s = useEditorStore.getState()
  const ids = s.pageElementIds[pageId] ?? []
  return `${s.width}x${s.height}|${s.pages[pageId]?.background}|${ids.map((id) => `${id}:${s.elements[id]?.data.ts ?? 0}:${s.elements[id]?.data.x}:${s.elements[id]?.data.y}`).join(',')}`
}

/** Debounced, one-at-a-time rendering keeps the page strip current without competing with editing. */
export function useThumbnails() {
  const [, bump] = useState(0)
  const sigs = useEditorStore(
    useShallow((s) => Object.fromEntries(s.pageIds.map((id) => [id, `${s.width}x${s.height}|${s.pages[id]?.background}|${(s.pageElementIds[id] ?? []).map((eid) => `${eid}:${s.elements[eid]?.data.ts ?? 0}:${s.elements[eid]?.data.x}:${s.elements[eid]?.data.y}:${s.elements[eid]?.data.width}`).join(',')}`]))),
  )
  useEffect(() => {
    const l = () => bump((n) => n + 1)
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])
  useEffect(() => {
    const stale = Object.keys(sigs).filter((id) => cache.get(id)?.sig !== signature(id))
    if (!stale.length) return
    const t = setTimeout(() => {
      queue = [...new Set([...queue, ...stale])]
      void pump()
    }, 700)
    return () => clearTimeout(t)
  }, [sigs])
  return cache
}

const Thumb = memo(function Thumb({ id, index, url, current, canEdit, count, dragOver, onDragState }: { id: string; url?: string; index: number; current: boolean; canEdit: boolean; count: number; dragOver: boolean; onDragState: (id: string | null) => void }) {
  const name = useEditorStore((s) => s.pages[id]?.name ?? '')
  const ratio = useEditorStore((s) => s.width / s.height)
  return (
    <div
      className={`pthumb-wrap ${dragOver ? 'is-over' : ''}`}
      draggable={canEdit}
      onDragStart={(e) => e.dataTransfer.setData('text/page', id)}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('text/page')) {
          e.preventDefault()
          onDragState(id)
        }
      }}
      onDragLeave={() => onDragState(null)}
      onDrop={(e) => {
        e.preventDefault()
        onDragState(null)
        const from = e.dataTransfer.getData('text/page')
        if (from && from !== id) movePage(from, index)
      }}
    >
      <button className="pthumb" aria-current={current} onClick={() => useEditorStore.getState().setCurrentPage(id)} aria-label={`Go to ${name}`}>
        <span className="pthumb__img" style={{ aspectRatio: `${ratio}` }}>
          {url ? <img src={url} alt="" draggable={false} /> : <span style={{ width: 72 * Math.min(ratio, 1.8), height: 56, background: '#fff', display: 'block' }} />}
        </span>
        <span>
          {index + 1}. {name}
        </span>
      </button>
      {canEdit && (
        <span className="pthumb__menu">
          <Menu
            trigger={<IconButton icon="more" label={`Page options for ${name}`} size="sm" />}
            items={[
              { label: 'Rename', icon: 'pen', onSelect: () => { const n = window.prompt('Page name', name); if (n?.trim()) updatePage(id, { name: n.trim() }) } },
              { label: 'Duplicate page', icon: 'copy', onSelect: () => duplicatePage(id) },
              { label: 'Add page after', icon: 'plus', onSelect: () => addPage(id) },
              'separator',
              { label: 'Delete page', icon: 'trash', danger: true, disabled: count <= 1, onSelect: () => deletePage(id) },
            ]}
          />
        </span>
      )}
    </div>
  )
})

export function PagesDock() {
  const pageIds = useEditorStore((s) => s.pageIds)
  const current = useEditorStore((s) => s.currentPageId)
  const canEdit = useEditorStore((s) => canEditAccess(s.access))
  const timeline = useEditorUiStore((s) => s.timelineOpen)
  const [overId, setOverId] = useState<string | null>(null)
  const stripRef = useRef<HTMLDivElement>(null)
  const thumbs = useThumbnails()
  const [overview, setOverview] = useState(false)
  const notesOpen = useEditorUiStore((s) => s.notesOpen)
  const notes = useEditorStore((s) => s.pages[s.currentPageId]?.notes ?? '')

  useEffect(() => {
    stripRef.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [current])

  return (
    <div className="dock">
      {timeline && <Timeline />}
      <div className="dock__bar">
        <strong style={{ fontSize: 13 }}>Pages</strong>
        <span className="field__hint">{pageIds.length} in this design</span>
        <span style={{ flex: 1 }} />
        <Button size="sm" icon="grid" onClick={() => setOverview(true)}>
          Grid view
        </Button>
        <Button size="sm" icon="pen" aria-pressed={notesOpen} onClick={() => useEditorUiStore.getState().setNotesOpen(!notesOpen)}>
          Notes{notes ? ' •' : ''}
        </Button>
        {canEdit && (
          <Button size="sm" icon="plus" onClick={() => addPage()}>
            Add page
          </Button>
        )}
      </div>
      {notesOpen && (
        <div style={{ padding: '0 12px 10px' }}>
          <textarea
            className="textarea"
            rows={3}
            aria-label="Notes for this page"
            placeholder="Speaker notes for this page. They show when you present."
            value={notes}
            readOnly={!canEdit}
            onKeyDown={(e) => e.stopPropagation()}
            onChange={(e) => updatePage(useEditorStore.getState().currentPageId, { notes: e.target.value }, 'notes')}
          />
        </div>
      )}
      <div className="pagestrip" ref={stripRef} role="list">
        {pageIds.map((id, i) => (
          <Thumb key={id} id={id} index={i} url={thumbs.get(id)?.url} current={id === current} canEdit={canEdit} count={pageIds.length} dragOver={overId === id} onDragState={setOverId} />
        ))}
      </div>
      {overview && <PagesOverview onClose={() => setOverview(false)} />}
    </div>
  )
}
