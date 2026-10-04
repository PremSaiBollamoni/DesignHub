import { useMemo, useState } from 'react'
import type { Change } from '@/editor/model/changes'
import type { DesignElement, TextElement } from '@/models/design'
import { useEditorStore } from '@/stores/editorStore'
import { toast } from '@/stores/toastStore'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { TextField } from '@/components/ui/Fields'

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function matches(find: string, matchCase: boolean, whole: boolean) {
  if (!find) return null
  const body = escapeRe(find)
  return new RegExp(whole ? `\\b${body}\\b` : body, matchCase ? 'g' : 'gi')
}

/** Searches the text on every page. Replace all is one undo step. */
export function FindReplaceModal({ onClose }: { onClose: () => void }) {
  const [find, setFind] = useState('')
  const [replace, setReplace] = useState('')
  const [matchCase, setMatchCase] = useState(false)
  const [whole, setWhole] = useState(false)
  const elements = useEditorStore((s) => s.elements)
  const pageElementIds = useEditorStore((s) => s.pageElementIds)
  const pageIds = useEditorStore((s) => s.pageIds)
  const pages = useEditorStore((s) => s.pages)

  const hits = useMemo(() => {
    const re = matches(find, matchCase, whole)
    if (!re) return []
    const out: { id: string; pageId: string; page: string; text: string; count: number }[] = []
    for (const pid of pageIds)
      for (const id of pageElementIds[pid] ?? []) {
        const el = elements[id]
        if (el?.type !== 'text') continue
        const count = (el.data.text.match(re) ?? []).length
        if (count) out.push({ id, pageId: pid, page: pages[pid]?.name ?? '', text: el.data.text, count })
      }
    return out
  }, [find, matchCase, whole, elements, pageElementIds, pageIds, pages])

  const total = hits.reduce((n, h) => n + h.count, 0)

  function replaceAll() {
    const re = matches(find, matchCase, whole)
    if (!re) return
    const s = useEditorStore.getState()
    const changes: Change[] = hits.map((h) => {
      const before = s.elements[h.id] as TextElement
      const after = { ...before, data: { ...before.data, text: before.data.text.replace(re, () => replace), ts: Date.now() } } as DesignElement
      return { kind: 'el', id: h.id, pageId: h.pageId, before, after }
    })
    s.commit(changes)
    toast.success(`Replaced ${total} match${total === 1 ? '' : 'es'}`)
    onClose()
  }

  return (
    <Modal
      title="Find and replace"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button variant="primary" disabled={!total} onClick={replaceAll}>Replace all ({total})</Button>
        </>
      }
    >
      <TextField label="Find" value={find} onChange={(e) => setFind(e.target.value)} autoFocus />
      <TextField label="Replace with" value={replace} onChange={(e) => setReplace(e.target.value)} />
      <div style={{ display: 'flex', gap: 18, fontSize: 13 }}>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={matchCase} onChange={(e) => setMatchCase(e.target.checked)} /> Match case</label>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={whole} onChange={(e) => setWhole(e.target.checked)} /> Whole word</label>
      </div>
      <div aria-live="polite" style={{ display: 'grid', gap: 6, maxHeight: 200, overflow: 'auto' }}>
        {find && !hits.length && <p className="field__hint">No text on any page matches “{find}”.</p>}
        {hits.map((h) => (
          <button
            key={h.id}
            className="menu-item"
            style={{ height: 'auto', padding: '8px 10px', display: 'grid', gap: 2, justifyItems: 'start' }}
            onClick={() => {
              useEditorStore.getState().setCurrentPage(h.pageId)
              useEditorStore.getState().select([h.id])
              onClose()
            }}
          >
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{h.page} · {h.count} match{h.count === 1 ? '' : 'es'}</span>
            <span style={{ textAlign: 'left' }}>{h.text.length > 70 ? `${h.text.slice(0, 70)}…` : h.text}</span>
          </button>
        ))}
      </div>
    </Modal>
  )
}
