import type { Change, PageMeta } from '@/editor/model/changes'
import { useEditorStore } from '@/stores/editorStore'
import { uid } from '@/utils/common'
import { cloneElements } from './elementActions'

const store = () => useEditorStore.getState()

export function addPage(afterId?: string): string {
  const s = store()
  const id = uid()
  const meta: PageMeta = { id, name: `Page ${s.pageIds.length + 1}`, background: '#ffffff', durationSeconds: null, notes: '' }
  const anchor = afterId ?? s.currentPageId
  const at = s.pageIds.indexOf(anchor)
  const order = [...s.pageIds]
  order.splice(at + 1, 0, id)
  s.commit([
    { kind: 'page', id, before: null, after: meta },
    { kind: 'order', pageId: id, before: [], after: [] },
    { kind: 'pageOrder', before: s.pageIds, after: order },
  ])
  store().setCurrentPage(id)
  return id
}

export function duplicatePage(pageId: string): string {
  const s = store()
  const src = s.pages[pageId]
  if (!src) return pageId
  const id = uid()
  const els = cloneElements((s.pageElementIds[pageId] ?? []).map((eid) => s.elements[eid]!), 0)
  const order = [...s.pageIds]
  order.splice(order.indexOf(pageId) + 1, 0, id)
  const changes: Change[] = [{ kind: 'page', id, before: null, after: { ...src, id, name: `${src.name} copy` } }]
  for (const e of els) changes.push({ kind: 'el', id: e.id, pageId: id, before: null, after: e })
  changes.push({ kind: 'order', pageId: id, before: [], after: els.map((e) => e.id) })
  changes.push({ kind: 'pageOrder', before: s.pageIds, after: order })
  s.commit(changes)
  store().setCurrentPage(id)
  return id
}

export function deletePage(pageId: string): void {
  const s = store()
  if (s.pageIds.length <= 1) return
  const ids = s.pageElementIds[pageId] ?? []
  const changes: Change[] = ids.map((eid) => ({ kind: 'el', id: eid, pageId, before: s.elements[eid]!, after: null }))
  changes.push({ kind: 'order', pageId, before: ids, after: [] })
  changes.push({ kind: 'page', id: pageId, before: s.pages[pageId]!, after: null })
  changes.push({ kind: 'pageOrder', before: s.pageIds, after: s.pageIds.filter((p) => p !== pageId) })
  const idx = s.pageIds.indexOf(pageId)
  s.commit(changes)
  const remaining = store().pageIds
  store().setCurrentPage(remaining[Math.min(idx, remaining.length - 1)]!)
}

export function movePage(pageId: string, toIndex: number): void {
  const s = store()
  const order = s.pageIds.filter((p) => p !== pageId)
  order.splice(Math.max(0, Math.min(toIndex, order.length)), 0, pageId)
  if (order.every((p, i) => p === s.pageIds[i])) return
  s.commit([{ kind: 'pageOrder', before: s.pageIds, after: order }])
}

export function updatePage(pageId: string, patch: Partial<Omit<PageMeta, 'id'>>, coalesceKey?: string): void {
  const s = store()
  const before = s.pages[pageId]
  if (!before) return
  s.commit([{ kind: 'page', id: pageId, before, after: { ...before, ...patch } }], { coalesceKey })
}

export function resizeCanvas(width: number, height: number): void {
  const s = store()
  if (width === s.width && height === s.height) return
  s.commit([{ kind: 'size', before: { width: s.width, height: s.height }, after: { width, height } }])
}
