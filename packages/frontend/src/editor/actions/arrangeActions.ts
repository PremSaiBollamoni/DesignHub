import type { Change } from '@/editor/model/changes'
import { useEditorStore } from '@/stores/editorStore'
import { rotatedBounds, unionBounds, type Bounds } from '@/utils/geometry'
import { updateElements } from './elementActions'

const store = () => useEditorStore.getState()

export type ZMove = 'front' | 'forward' | 'backward' | 'back'

function selectedInOrder(): string[] {
  const s = store()
  return (s.pageElementIds[s.currentPageId] ?? []).filter((id) => s.selection.includes(id))
}

export function changeZOrder(move: ZMove): void {
  const s = store()
  const pid = s.currentPageId
  const before = s.pageElementIds[pid] ?? []
  const sel = new Set(selectedInOrder())
  if (!sel.size) return
  let after = before
  if (move === 'front') after = [...before.filter((id) => !sel.has(id)), ...before.filter((id) => sel.has(id))]
  else if (move === 'back') after = [...before.filter((id) => sel.has(id)), ...before.filter((id) => !sel.has(id))]
  else {
    after = [...before]
    const idxs = after.map((id, i) => (sel.has(id) ? i : -1)).filter((i) => i >= 0)
    if (move === 'forward') {
      for (const i of idxs.reverse()) if (i < after.length - 1 && !sel.has(after[i + 1]!)) [after[i], after[i + 1]] = [after[i + 1]!, after[i]!]
    } else {
      for (const i of idxs) if (i > 0 && !sel.has(after[i - 1]!)) [after[i], after[i - 1]] = [after[i - 1]!, after[i]!]
    }
  }
  if (after.every((id, i) => id === before[i])) return
  s.commit([{ kind: 'order', pageId: pid, before, after }])
}

/** Moves one layer to an absolute stack index (used by the layers panel drag and drop). */
export function moveLayer(id: string, toIndex: number): void {
  const s = store()
  const pid = s.currentPageId
  const before = s.pageElementIds[pid] ?? []
  const from = before.indexOf(id)
  if (from < 0 || from === toIndex) return
  const after = before.filter((x) => x !== id)
  after.splice(Math.max(0, Math.min(toIndex, after.length)), 0, id)
  s.commit([{ kind: 'order', pageId: pid, before, after }])
}

export type AlignMode = 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom'

function boundsOf(id: string): Bounds {
  const e = store().elements[id]!
  return rotatedBounds(e.data, e.data.rotation)
}

/** Aligns to the page when one element is selected, otherwise to the selection's outer bounds. */
export function alignSelection(mode: AlignMode): void {
  const s = store()
  const ids = s.selection.filter((id) => !s.elements[id]?.data.locked)
  if (!ids.length) return
  const target: Bounds = ids.length === 1 ? { left: 0, top: 0, right: s.width, bottom: s.height } : unionBounds(ids.map(boundsOf))
  updateElements(ids, (el) => {
    const b = rotatedBounds(el.data, el.data.rotation)
    switch (mode) {
      case 'left':
        return { x: el.data.x + (target.left - b.left) }
      case 'right':
        return { x: el.data.x + (target.right - b.right) }
      case 'centerH':
        return { x: el.data.x + ((target.left + target.right) / 2 - (b.left + b.right) / 2) }
      case 'top':
        return { y: el.data.y + (target.top - b.top) }
      case 'bottom':
        return { y: el.data.y + (target.bottom - b.bottom) }
      case 'centerV':
        return { y: el.data.y + ((target.top + target.bottom) / 2 - (b.top + b.bottom) / 2) }
    }
  })
}

export function distributeSelection(axis: 'h' | 'v'): void {
  const s = store()
  const ids = s.selection.filter((id) => !s.elements[id]?.data.locked)
  if (ids.length < 3) return
  const items = ids.map((id) => ({ id, b: boundsOf(id) }))
  items.sort((a, b) => (axis === 'h' ? a.b.left - b.b.left : a.b.top - b.b.top))
  const first = items[0]!.b
  const last = items[items.length - 1]!.b
  const total = items.reduce((sum, it) => sum + (axis === 'h' ? it.b.right - it.b.left : it.b.bottom - it.b.top), 0)
  const span = axis === 'h' ? last.right - first.left : last.bottom - first.top
  const gap = (span - total) / (items.length - 1)
  let cursor = axis === 'h' ? first.left : first.top
  const deltas = new Map<string, number>()
  for (const it of items) {
    deltas.set(it.id, cursor - (axis === 'h' ? it.b.left : it.b.top))
    cursor += (axis === 'h' ? it.b.right - it.b.left : it.b.bottom - it.b.top) + gap
  }
  updateElements(ids, (el) => (axis === 'h' ? { x: el.data.x + deltas.get(el.id)! } : { y: el.data.y + deltas.get(el.id)! }))
}

export function flipSelection(axis: 'h' | 'v'): void {
  const s = store()
  updateElements(
    s.selection.filter((id) => s.elements[id]?.type === 'image'),
    (el) => {
      const d = el.data as { flipX?: boolean; flipY?: boolean }
      return axis === 'h' ? { flipX: !d.flipX } : { flipY: !d.flipY }
    },
  )
}

export type { Change }
