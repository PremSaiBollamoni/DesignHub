import type { DesignElement } from '@/models/design'
import type { Change, PageMeta } from '@/editor/model/changes'
import { useEditorStore } from '@/stores/editorStore'
import type { DesignOp } from './wireOps'

/** Turns a collaborator's operation into changes against our local state (without history or echo). */
export function changesFromRemote(op: DesignOp): Change[] {
  const s = useEditorStore.getState()
  const changes: Change[] = []
  switch (op.type) {
    case 'ELEMENTS_UPSERT': {
      const pageId = op.pageId
      if (!pageId || !s.pages[pageId] || !op.elements?.length) return []
      const current = s.pageElementIds[pageId] ?? []
      const incoming = op.elements.map((e) => ({ ...e, zIndex: e.zIndex })) as DesignElement[]
      for (const e of incoming) {
        const before = s.elements[e.id] ?? null
        const ownerPage: string = before ? pageContaining(e.id) : pageId
        if (before && ownerPage !== pageId) {
          const oldList = s.pageElementIds[ownerPage] ?? []
          changes.push({ kind: 'order', pageId: ownerPage, before: oldList, after: oldList.filter((x) => x !== e.id) })
        }
        changes.push({ kind: 'el', id: e.id, pageId, before, after: e })
      }
      const upserted = new Set(incoming.map((e) => e.id))
      const rest = current.filter((id) => !upserted.has(id))
      const merged = [...rest]
      for (const e of [...incoming].sort((a, b) => a.zIndex - b.zIndex)) merged.splice(Math.min(e.zIndex, merged.length), 0, e.id)
      if (merged.length !== current.length || merged.some((id, i) => id !== current[i])) {
        changes.push({ kind: 'order', pageId, before: current, after: merged })
      }
      return changes
    }
    case 'ELEMENTS_DELETE': {
      const byPage = new Map<string, string[]>()
      for (const id of op.ids ?? []) {
        const el = s.elements[id]
        if (!el) continue
        const pid = pageContaining(id)
        changes.push({ kind: 'el', id, pageId: pid, before: el, after: null })
        byPage.set(pid, [...(byPage.get(pid) ?? []), id])
      }
      for (const [pid, removed] of byPage) {
        const before = s.pageElementIds[pid] ?? []
        changes.push({ kind: 'order', pageId: pid, before, after: before.filter((x) => !removed.includes(x)) })
      }
      return changes
    }
    case 'PAGE_UPSERT': {
      const p = op.page
      if (!p) return []
      const meta: PageMeta = { id: p.id, name: p.name, background: p.background, durationSeconds: p.durationSeconds ?? null, notes: p.notes ?? '' }
      const existing = s.pages[p.id] ?? null
      changes.push({ kind: 'page', id: p.id, before: existing, after: meta })
      if (!existing) {
        changes.push({ kind: 'order', pageId: p.id, before: [], after: [] })
        const order = s.pageIds.filter((x) => x !== p.id)
        order.splice(Math.min(p.position, order.length), 0, p.id)
        changes.push({ kind: 'pageOrder', before: s.pageIds, after: order })
        for (const e of p.elements ?? []) changes.push({ kind: 'el', id: e.id, pageId: p.id, before: null, after: e as DesignElement })
        if (p.elements?.length) changes.push({ kind: 'order', pageId: p.id, before: [], after: p.elements.map((e) => e.id) })
      }
      return changes
    }
    case 'PAGE_DELETE': {
      const id = op.pageId
      if (!id || !s.pages[id] || s.pageIds.length <= 1) return []
      const ids = s.pageElementIds[id] ?? []
      for (const eid of ids) changes.push({ kind: 'el', id: eid, pageId: id, before: s.elements[eid]!, after: null })
      changes.push({ kind: 'order', pageId: id, before: ids, after: [] })
      changes.push({ kind: 'page', id, before: s.pages[id]!, after: null })
      changes.push({ kind: 'pageOrder', before: s.pageIds, after: s.pageIds.filter((p) => p !== id) })
      return changes
    }
    case 'PAGES_ORDER': {
      const order = (op.order ?? []).filter((id) => s.pages[id])
      const missing = s.pageIds.filter((id) => !order.includes(id))
      const after = [...order, ...missing]
      return after.every((id, i) => id === s.pageIds[i]) ? [] : [{ kind: 'pageOrder', before: s.pageIds, after }]
    }
    case 'PROJECT_SIZE':
      return op.width && op.height ? [{ kind: 'size', before: { width: s.width, height: s.height }, after: { width: op.width, height: op.height } }] : []
    default:
      return []
  }
}

function pageContaining(elementId: string): string {
  const s = useEditorStore.getState()
  for (const [pid, ids] of Object.entries(s.pageElementIds)) if (ids.includes(elementId)) return pid
  return s.currentPageId
}
