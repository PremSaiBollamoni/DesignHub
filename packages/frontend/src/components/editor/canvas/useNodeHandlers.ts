import { useMemo, useRef, useState } from 'react'
import type Konva from 'konva'
import type { DesignElement } from '@/models/design'
import { updateElements } from '@/editor/actions/elementActions'
import { useEditorStore } from '@/stores/editorStore'
import { useEditorUiStore } from '@/stores/editorUiStore'
import { rotatedBounds, unionBounds } from '@/utils/geometry'
import type { NodeHandlers } from './ElementNode'
import { buildTargets, NO_GUIDES, snapBounds, type Guides, type SnapTargets } from './snapping'

interface DragSession {
  ids: string[]
  starts: Map<string, { x: number; y: number }>
  leaderId: string
  leaderStart: { x: number; y: number }
  bounds: { left: number; top: number; right: number; bottom: number }
  targets: SnapTargets
}

const store = () => useEditorStore.getState()

function withGuides(t: SnapTargets): SnapTargets {
  const g = useEditorUiStore.getState().guides
  return { xs: [...t.xs, ...g.x], ys: [...t.ys, ...g.y] }
}

/** Pointer, drag and snapping behaviour for elements on the editable page. */
export function useNodeHandlers(stage: () => Konva.Stage | null) {
  const [guides, setGuides] = useState<Guides>(NO_GUIDES)
  const session = useRef<DragSession | null>(null)

  const handlers = useMemo<NodeHandlers>(() => {
    const nodeOf = (id: string) => stage()?.findOne<Konva.Group>(`#${CSS.escape(id)}`) ?? null

    return {
      onPointerDown: (id, additive) => {
        const s = store()
        const el = s.elements[id]
        if (!el) return
        if (additive) s.select([id], { additive: true })
        else if (!s.selection.includes(id)) s.select([id])
        useEditorUiStore.getState().setCropping(null)
      },

      onDragStart: (id) => {
        const s = store()
        if (!s.selection.includes(id)) s.select([id])
        const selection = store().selection
        const starts = new Map<string, { x: number; y: number }>()
        const bounds = unionBounds(
          selection.map((sid) => {
            const e = s.elements[sid]!
            starts.set(sid, { x: e.data.x, y: e.data.y })
            return rotatedBounds(e.data, e.data.rotation)
          }),
        )
        const others = (s.pageElementIds[s.currentPageId] ?? []).filter((x) => !selection.includes(x)).map((x) => s.elements[x]!) as DesignElement[]
        const leader = s.elements[id]!
        session.current = {
          ids: selection,
          starts,
          leaderId: id,
          leaderStart: { x: leader.data.x, y: leader.data.y },
          bounds,
          targets: withGuides(buildTargets(s.width, s.height, others)),
        }
      },

      onDragMove: (id, node) => {
        const ss = session.current
        if (!ss || ss.leaderId !== id) return
        const s = store()
        const leader = s.elements[id]!
        let dx = node.x() - leader.data.width / 2 - ss.leaderStart.x
        let dy = node.y() - leader.data.height / 2 - ss.leaderStart.y
        const zoom = useEditorUiStore.getState().zoom
        if (useEditorUiStore.getState().snapping) {
          const moved = { left: ss.bounds.left + dx, top: ss.bounds.top + dy, right: ss.bounds.right + dx, bottom: ss.bounds.bottom + dy }
          const snap = snapBounds(moved, ss.targets, 8 / zoom)
          dx += snap.dx
          dy += snap.dy
          setGuides(snap.guides)
        }
        node.position({ x: ss.leaderStart.x + dx + leader.data.width / 2, y: ss.leaderStart.y + dy + leader.data.height / 2 })
        for (const sid of ss.ids) {
          if (sid === id) continue
          const other = s.elements[sid]!
          const start = ss.starts.get(sid)!
          nodeOf(sid)?.position({ x: start.x + dx + other.data.width / 2, y: start.y + dy + other.data.height / 2 })
        }
      },

      onDragEnd: (id, node) => {
        const ss = session.current
        session.current = null
        setGuides(NO_GUIDES)
        if (!ss || ss.leaderId !== id) return
        const s = store()
        const leader = s.elements[id]!
        const dx = node.x() - leader.data.width / 2 - ss.leaderStart.x
        const dy = node.y() - leader.data.height / 2 - ss.leaderStart.y
        if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return
        updateElements(ss.ids, (el) => {
          const start = ss.starts.get(el.id)!
          return { x: Math.round((start.x + dx) * 100) / 100, y: Math.round((start.y + dy) * 100) / 100 }
        })
      },

      onContext: (id, x, y) => {
        const s = store()
        if (!s.selection.includes(id)) s.select([id])
        useEditorUiStore.getState().setContextMenu({ x, y })
      },

      onDblClick: (id) => {
        const s = store()
        const el = s.elements[id]
        if (!el || el.data.locked) return
        const ui = useEditorUiStore.getState()
        if (el.type === 'text') ui.setEditingText(id)
        else if (el.type === 'image') ui.setCropping(id)
        else if (el.type === 'table') ui.setRightTab('design')
      },
    }
  }, [stage])

  return { handlers, guides }
}
