import { memo, useRef, useState } from 'react'
import { moveLayer } from '@/editor/actions/arrangeActions'
import { toggleHidden, toggleLock, updateElements } from '@/editor/actions/elementActions'
import { useEditorStore } from '@/stores/editorStore'
import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/components/ui/iconPaths'
import { IconButton } from '@/components/ui/Button'
import type { DesignElement } from '@/models/design'

const TYPE_ICON: Record<DesignElement['type'], IconName> = {
  text: 'text',
  shape: 'shapes',
  image: 'image',
  video: 'video',
  audio: 'audio',
  icon: 'star',
  chart: 'chart',
  table: 'table',
  frame: 'frame',
}

const ROW = 40
const OVERSCAN = 8

const Layer = memo(function Layer({ id, index, dragOver, onDragState }: { id: string; index: number; dragOver: boolean; onDragState: (id: string | null) => void }) {
  const el = useEditorStore((s) => s.elements[id])
  const selected = useEditorStore((s) => s.selection.includes(id))
  const [editing, setEditing] = useState(false)
  if (!el) return null
  const d = el.data
  const label = d.name ?? (el.type === 'text' ? (el.data as { text: string }).text.slice(0, 40) : el.type)
  return (
    <div
      className={`layer ${dragOver ? 'is-over' : ''}`}
      role="option"
      aria-selected={selected}
      draggable={!d.locked}
      onDragStart={(e) => e.dataTransfer.setData('text/layer', id)}
      onDragOver={(e) => {
        e.preventDefault()
        onDragState(id)
      }}
      onDragLeave={() => onDragState(null)}
      onDrop={(e) => {
        e.preventDefault()
        onDragState(null)
        const from = e.dataTransfer.getData('text/layer')
        if (from && from !== id) moveLayer(from, index)
      }}
      onClick={(e) => useEditorStore.getState().select([id], { additive: e.shiftKey || e.metaKey || e.ctrlKey })}
    >
      <span title="Drag to reorder" style={{ color: 'var(--ink-3)', cursor: 'grab' }}>
        <Icon name="drag" size={14} />
      </span>
      <span className="layer__icon">
        <Icon name={TYPE_ICON[el.type]} size={15} />
      </span>
      <span className="layer__name" onDoubleClick={() => setEditing(true)}>
        {editing ? (
          <input
            className="input input--sm"
            autoFocus
            aria-label="Layer name"
            defaultValue={label}
            onBlur={(e) => {
              updateElements([id], { name: e.target.value.trim() || undefined })
              setEditing(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              if (e.key === 'Escape') setEditing(false)
              e.stopPropagation()
            }}
          />
        ) : (
          label
        )}
      </span>
      <span className="layer__actions">
        <IconButton icon={d.locked ? 'lock' : 'unlock'} size="sm" label={d.locked ? 'Unlock layer' : 'Lock layer'} onClick={(e) => { e.stopPropagation(); toggleLock([id]) }} />
        <IconButton icon={d.hidden ? 'eyeOff' : 'eye'} size="sm" label={d.hidden ? 'Show layer' : 'Hide layer'} onClick={(e) => { e.stopPropagation(); toggleHidden([id]) }} />
      </span>
    </div>
  )
})

/** Top layer first. Rows are windowed so a page with thousands of elements stays responsive. */
export function LayersPanel() {
  const ids = useEditorStore((s) => s.pageElementIds[s.currentPageId]) ?? []
  const [overId, setOverId] = useState<string | null>(null)
  const [scroll, setScroll] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)
  const reversed = [...ids].reverse()

  if (!ids.length) return <p className="help">Nothing on this page yet. Add text, shapes or photos from the left.</p>

  const viewH = boxRef.current?.clientHeight ?? 600
  const start = Math.max(0, Math.floor(scroll / ROW) - OVERSCAN)
  const end = Math.min(reversed.length, Math.ceil((scroll + viewH) / ROW) + OVERSCAN)
  return (
    <div ref={boxRef} role="listbox" aria-label="Layers" aria-multiselectable style={{ position: 'relative', height: 'calc(100vh - 190px)', overflowY: 'auto' }} onScroll={(e) => setScroll(e.currentTarget.scrollTop)}>
      <div style={{ height: reversed.length * ROW, position: 'relative' }}>
        <div style={{ position: 'absolute', top: start * ROW, left: 0, right: 0 }}>
          {reversed.slice(start, end).map((id, i) => (
            <Layer key={id} id={id} index={ids.length - 1 - (start + i)} dragOver={overId === id} onDragState={setOverId} />
          ))}
        </div>
      </div>
    </div>
  )
}
