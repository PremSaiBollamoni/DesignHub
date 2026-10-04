import { useEffect, useState } from 'react'
import type { Category, TemplateSummary } from '@/models/api'
import type { DesignDocument } from '@/models/design'
import { contentApi } from '@/services/api/contentApi'
import { errorMessage, toast } from '@/stores/toastStore'
import { useEditorStore } from '@/stores/editorStore'
import { uid } from '@/utils/common'
import type { Change } from '@/editor/model/changes'
import { Skeleton } from '@/components/ui/Feedback'
import { PanelShell } from './PanelShell'

/** Adds a template's first page after the current one, with fresh ids, as a single undoable step. */
async function addTemplatePage(t: TemplateSummary) {
  const doc: DesignDocument = await contentApi.templateDesign(t.id)
  const src = doc.pages[0]
  if (!src) return
  const s = useEditorStore.getState()
  const pageId = uid()
  const els = src.elements.map((e) => ({ ...e, id: uid() }))
  const order = [...s.pageIds]
  order.splice(order.indexOf(s.currentPageId) + 1, 0, pageId)
  const changes: Change[] = [{ kind: 'page', id: pageId, before: null, after: { id: pageId, name: t.title, background: src.background, durationSeconds: null, notes: '' } }]
  // Scale the layout to the canvas when the template was designed at another size.
  const sx = s.width / doc.width
  const sy = s.height / doc.height
  const k = Math.min(sx, sy)
  for (const e of els) {
    const d = e.data
    const scaled = { ...d, x: d.x * sx, y: d.y * sy, width: d.width * sx, height: d.height * sy }
    if (e.type === 'text') (scaled as { fontSize: number }).fontSize = (d as { fontSize: number }).fontSize * k
    changes.push({ kind: 'el', id: e.id, pageId, before: null, after: { ...e, data: scaled } as never })
  }
  changes.push({ kind: 'order', pageId, before: [], after: els.map((e) => e.id) })
  changes.push({ kind: 'pageOrder', before: s.pageIds, after: order })
  s.commit(changes)
  useEditorStore.getState().setCurrentPage(pageId)
}

export function TemplatesPanel() {
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryId, setCategoryId] = useState<number | undefined>()
  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')
  const [items, setItems] = useState<TemplateSummary[] | null>(null)
  const [busy, setBusy] = useState<number | null>(null)

  useEffect(() => {
    void contentApi.categories().then(setCategories).catch(() => undefined)
  }, [])
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 300)
    return () => clearTimeout(t)
  }, [q])
  useEffect(() => {
    setItems(null)
    contentApi
      .templates({ categoryId, q: debounced, size: 40 })
      .then((r) => setItems(r.items))
      .catch((e) => {
        toast.error(errorMessage(e))
        setItems([])
      })
  }, [categoryId, debounced])

  return (
    <PanelShell title="Templates" search={{ value: q, onChange: setQ, placeholder: 'Search templates' }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button className="chip" aria-pressed={!categoryId} onClick={() => setCategoryId(undefined)}>
          All
        </button>
        {categories.map((c) => (
          <button key={c.id} className="chip" aria-pressed={categoryId === c.id} onClick={() => setCategoryId(c.id)}>
            {c.name}
          </button>
        ))}
      </div>
      <p className="field__hint">Selecting a template adds it as a new page. Nothing you made is replaced.</p>
      {items === null ? (
        <div className="masonry">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} height={120 + ((i * 41) % 60)} radius={10} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="help">No templates match.</p>
      ) : (
        <div className="masonry">
          {items.map((t) => (
            <button
              key={t.id}
              aria-label={`Add the ${t.title} template as a new page`}
              title={t.title}
              disabled={busy !== null}
              style={{ opacity: busy === t.id ? 0.5 : 1 }}
              onClick={async () => {
                setBusy(t.id)
                try {
                  await addTemplatePage(t)
                } catch (e) {
                  toast.error(errorMessage(e))
                } finally {
                  setBusy(null)
                }
              }}
            >
              <img src={t.thumbnail} alt={t.title} loading="lazy" style={{ aspectRatio: `${t.width} / ${t.height}` }} />
            </button>
          ))}
        </div>
      )}
    </PanelShell>
  )
}
