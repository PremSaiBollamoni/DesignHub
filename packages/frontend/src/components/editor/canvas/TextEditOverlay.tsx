import { useEffect, useLayoutEffect, useRef } from 'react'
import type { TextData } from '@/models/design'
import { updateElements } from '@/editor/actions/elementActions'
import { useEditorStore } from '@/stores/editorStore'
import { useEditorUiStore } from '@/stores/editorUiStore'

/** A real textarea laid exactly over the canvas text, so typing, IME and spellcheck behave natively. */
export function TextEditOverlay() {
  const id = useEditorUiStore((s) => s.editingTextId)
  const zoom = useEditorUiStore((s) => s.zoom)
  const panX = useEditorUiStore((s) => s.panX)
  const panY = useEditorUiStore((s) => s.panY)
  const setEditingText = useEditorUiStore((s) => s.setEditingText)
  const el = useEditorStore((s) => (id ? s.elements[id] : undefined))
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const ta = ref.current
    if (!ta) return
    ta.focus()
    ta.select()
  }, [id])

  useLayoutEffect(() => {
    const ta = ref.current
    if (!ta) return
    ta.style.height = '0px'
    ta.style.height = `${ta.scrollHeight}px`
  }, [el?.type === 'text' ? el.data.text : '', zoom, id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!id || !el || el.type !== 'text') return null
  const d = el.data as TextData
  const style: React.CSSProperties = {
    left: panX + d.x * zoom,
    top: panY + d.y * zoom,
    width: d.width * zoom,
    minHeight: d.fontSize * d.lineHeight * zoom,
    transform: `rotate(${d.rotation}deg)`,
    transformOrigin: `${(d.width * zoom) / 2}px ${(d.height * zoom) / 2}px`,
    fontFamily: `"${d.fontFamily}"`,
    fontSize: d.fontSize * zoom,
    fontWeight: d.fontWeight,
    fontStyle: d.italic ? 'italic' : 'normal',
    lineHeight: d.lineHeight,
    letterSpacing: d.letterSpacing * zoom,
    textAlign: d.align,
    color: d.fill,
    textTransform: d.uppercase ? 'uppercase' : 'none',
    textDecoration: [d.underline && 'underline', d.strike && 'line-through'].filter(Boolean).join(' ') || 'none',
  }
  return (
    <textarea
      ref={ref}
      className="text-edit"
      style={style}
      value={d.text}
      spellCheck
      aria-label="Edit text"
      onChange={(e) => updateElements([id], { text: e.target.value }, { coalesceKey: `text-${id}` })}
      onBlur={() => setEditingText(null)}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Escape') setEditingText(null)
      }}
    />
  )
}
