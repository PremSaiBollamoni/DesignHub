import type { DesignElement } from '@/models/design'
import type { Change } from '@/editor/model/changes'
import { useEditorStore } from '@/stores/editorStore'
import { uid } from '@/utils/common'

type DataPatch = Partial<DesignElement['data']>
type Patcher = DataPatch | ((el: DesignElement) => DataPatch)

const store = () => useEditorStore.getState()

/** Places new elements on top of the current page and selects them. */
export function insertElements(els: DesignElement[], pageId = store().currentPageId): void {
  if (!els.length) return
  const s = store()
  const before = s.pageElementIds[pageId] ?? []
  const stamped = els.map((e) => ({ ...e, data: { ...e.data, ts: Date.now() } }) as DesignElement)
  const changes: Change[] = stamped.map((e) => ({ kind: 'el', id: e.id, pageId, before: null, after: e }))
  changes.push({ kind: 'order', pageId, before, after: [...before, ...stamped.map((e) => e.id)] })
  s.commit(changes)
  if (pageId === s.currentPageId) store().select(stamped.map((e) => e.id), { exact: true })
}

export function updateElements(ids: string[], patch: Patcher, opts?: { coalesceKey?: string; record?: boolean }): void {
  const s = store()
  const changes: Change[] = []
  for (const id of ids) {
    const el = s.elements[id]
    if (!el) continue
    const p = typeof patch === 'function' ? patch(el) : patch
    const next = { ...el, data: { ...el.data, ...p, ts: Date.now() } } as DesignElement
    changes.push({ kind: 'el', id, pageId: pageOf(id), before: el, after: next })
  }
  s.commit(changes, opts)
}

export function pageOf(elementId: string): string {
  const s = store()
  for (const [pid, ids] of Object.entries(s.pageElementIds)) if (ids.includes(elementId)) return pid
  return s.currentPageId
}

export function deleteElements(ids: string[]): void {
  const s = store()
  const changes: Change[] = []
  const byPage = new Map<string, string[]>()
  for (const id of ids) {
    const el = s.elements[id]
    if (!el) continue
    const pid = pageOf(id)
    changes.push({ kind: 'el', id, pageId: pid, before: el, after: null })
    byPage.set(pid, [...(byPage.get(pid) ?? []), id])
  }
  for (const [pid, removed] of byPage) {
    const before = s.pageElementIds[pid] ?? []
    changes.push({ kind: 'order', pageId: pid, before, after: before.filter((x) => !removed.includes(x)) })
  }
  s.commit(changes)
}

export function deleteSelection(): void {
  const s = store()
  const removable = s.selection.filter((id) => !s.elements[id]?.data.locked)
  deleteElements(removable)
}

export function cloneElements(els: DesignElement[], offset = 0): DesignElement[] {
  const groupMap = new Map<string, string>()
  return els.map((e) => {
    let groupId = e.data.groupId
    if (groupId) {
      if (!groupMap.has(groupId)) groupMap.set(groupId, uid())
      groupId = groupMap.get(groupId)
    }
    return { ...e, id: uid(), data: { ...e.data, x: e.data.x + offset, y: e.data.y + offset, groupId, locked: false } } as DesignElement
  })
}

export function duplicateSelection(): void {
  const s = store()
  const originals = (s.pageElementIds[s.currentPageId] ?? []).filter((id) => s.selection.includes(id)).map((id) => s.elements[id]!)
  insertElements(cloneElements(originals, 24))
}

let clipboard: DesignElement[] = []

export function copySelection(): boolean {
  const s = store()
  const els = (s.pageElementIds[s.currentPageId] ?? []).filter((id) => s.selection.includes(id)).map((id) => s.elements[id]!)
  if (!els.length) return false
  clipboard = els.map((e) => structuredClone(e))
  return true
}

export function cutSelection(): void {
  if (copySelection()) deleteSelection()
}

export function pasteClipboard(): void {
  if (!clipboard.length) return
  insertElements(cloneElements(clipboard, 24))
  clipboard = clipboard.map((e) => ({ ...e, data: { ...e.data, x: e.data.x + 24, y: e.data.y + 24 } }) as DesignElement)
}

export function hasClipboard(): boolean {
  return clipboard.length > 0
}

export function groupSelection(): void {
  const s = store()
  if (s.selection.length < 2) return
  const gid = uid()
  updateElements(s.selection, { groupId: gid })
}

export function ungroupSelection(): void {
  const s = store()
  updateElements(
    s.selection.filter((id) => s.elements[id]?.data.groupId),
    { groupId: undefined },
  )
}

export function nudge(dx: number, dy: number): void {
  const s = store()
  const ids = s.selection.filter((id) => !s.elements[id]?.data.locked)
  updateElements(ids, (el) => ({ x: el.data.x + dx, y: el.data.y + dy }), { coalesceKey: 'nudge' })
}

export function toggleLock(ids: string[]): void {
  const s = store()
  const lock = !ids.every((id) => s.elements[id]?.data.locked)
  updateElements(ids, { locked: lock })
  if (lock) s.select([])
}

export function toggleHidden(ids: string[]): void {
  const s = store()
  const hide = !ids.every((id) => s.elements[id]?.data.hidden)
  updateElements(ids, { hidden: hide })
}

let styleClipboard: Partial<DesignElement['data']> | null = null

const STYLE_KEYS = ['fill', 'stroke', 'strokeWidth', 'fontFamily', 'fontWeight', 'fontSize', 'italic', 'underline', 'strike', 'letterSpacing', 'lineHeight', 'align', 'background', 'cornerRadius', 'filters', 'shadow', 'opacity'] as const

/** Copies how the first selected element looks, not what it says or where it is. */
export function copyStyle(): boolean {
  const el = store().selection.map((id) => store().elements[id]).find(Boolean)
  if (!el) return false
  const picked: Record<string, unknown> = {}
  for (const k of STYLE_KEYS) if (k in el.data) picked[k] = (el.data as unknown as Record<string, unknown>)[k]
  styleClipboard = picked as Partial<DesignElement['data']>
  return true
}

export function hasStyle(): boolean {
  return styleClipboard !== null
}

export function pasteStyle(): void {
  if (!styleClipboard) return
  const style = styleClipboard
  updateElements(store().selection, (el) => {
    const applicable: Record<string, unknown> = {}
    for (const k of Object.keys(style)) if (k in el.data || ['shadow', 'opacity', 'fill', 'stroke'].includes(k)) applicable[k] = (style as Record<string, unknown>)[k]
    return applicable as Partial<DesignElement['data']>
  })
}
