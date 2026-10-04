import type { Change } from '@/editor/model/changes'
import type { DesignElement } from '@/models/design'
import { useEditorStore } from '@/stores/editorStore'

/** Changes the canvas size and scales every page's content with it, so a post becomes a story in one step. */
export function resizeAndScale(width: number, height: number): void {
  const s = useEditorStore.getState()
  if (width === s.width && height === s.height) return
  const sx = width / s.width
  const sy = height / s.height
  const k = Math.min(sx, sy)
  const changes: Change[] = [{ kind: 'size', before: { width: s.width, height: s.height }, after: { width, height } }]
  for (const pid of s.pageIds)
    for (const id of s.pageElementIds[pid] ?? []) {
      const el = s.elements[id]!
      const d = el.data
      const extra: Record<string, unknown> = {}
      // Full-bleed backgrounds stretch to the new page; everything else keeps its proportions and its relative position.
      const fullBleed = d.width >= s.width * 0.95 && d.height >= s.height * 0.95
      const nw = fullBleed ? width : d.width * k
      const nh = fullBleed ? height : el.type === 'text' ? d.height * k : d.height * k
      const cx = (d.x + d.width / 2) * sx
      const cy = (d.y + d.height / 2) * sy
      if (el.type === 'text') extra.fontSize = Math.round(el.data.fontSize * k * 10) / 10
      if (el.type === 'table') {
        extra.colWidths = el.data.colWidths.map((w) => w * k)
        extra.rowHeight = el.data.rowHeight * k
        extra.fontSize = el.data.fontSize * k
      }
      if (el.type === 'shape') extra.strokeWidth = el.data.strokeWidth * k
      const x = fullBleed ? 0 : cx - nw / 2
      const y = fullBleed ? 0 : cy - nh / 2
      const after = { ...el, data: { ...d, x, y, width: nw, height: nh, ...extra, ts: Date.now() } } as DesignElement
      changes.push({ kind: 'el', id, pageId: pid, before: el, after })
    }
  s.commit(changes)
}
