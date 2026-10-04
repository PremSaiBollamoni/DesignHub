import { canEditAccess } from '@/models/access'
import { useEffect } from 'react'
import { changeZOrder } from '@/editor/actions/arrangeActions'
import { copySelection, copyStyle, pasteStyle, cutSelection, deleteSelection, duplicateSelection, groupSelection, nudge, pasteClipboard, ungroupSelection, insertElements } from '@/editor/actions/elementActions'
import { uploadAndInsert } from '@/editor/actions/assetActions'
import { createShape, createText } from '@/editor/model/defaults'
import { useEditorStore } from '@/stores/editorStore'
import { useEditorUiStore } from '@/stores/editorUiStore'

function typing(t: EventTarget | null) {
  const el = t as HTMLElement | null
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
}

export function useEditorShortcuts(onHelp: () => void, onFind: () => void) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (typing(e.target)) return
      const s = useEditorStore.getState()
      const ui = useEditorUiStore.getState()
      if (ui.presenting) return
      const mod = e.ctrlKey || e.metaKey
      const canEdit = canEditAccess(s.access)
      const k = e.key.toLowerCase()
      const center = { cx: s.width / 2, cy: s.height / 2 }

      if (mod && k === 'z') { e.preventDefault(); if (canEdit) e.shiftKey ? s.redo() : s.undo(); return }
      if (mod && k === 'y') { e.preventDefault(); if (canEdit) s.redo(); return }
      if (mod && k === 'f') { e.preventDefault(); onFind(); return }
      if (mod && k === 'a') { e.preventDefault(); s.select(s.pageElementIds[s.currentPageId] ?? []); return }
      if (mod && k === '0') { e.preventDefault(); ui.setView({ autoFit: true }); return }
      if (mod && (k === '=' || k === '+' || k === '-')) {
        e.preventDefault()
        const z = Math.min(8, Math.max(0.05, ui.zoom * (k === '-' ? 0.8 : 1.25)))
        ui.setView({ zoom: z, autoFit: false })
        return
      }
      if (k === '?' ) { onHelp(); return }
      if (k === 'p' && !mod) { ui.setPresenting(true); return }
      if (k === 'escape') { if (ui.drawing) ui.setDrawing(false); s.select([]); ui.setCropping(null); return }
      if (!canEdit) return

      if (mod && e.altKey && k === 'c') { e.preventDefault(); copyStyle(); return }
      if (mod && e.altKey && k === 'v') { e.preventDefault(); pasteStyle(); return }
      if (mod && k === 'c') { if (copySelection()) e.preventDefault(); return }
      if (mod && k === 'x') { e.preventDefault(); cutSelection(); return }
      if (mod && k === 'v') return // handled by the paste event so images work too
      if (mod && k === 'd') { e.preventDefault(); duplicateSelection(); return }
      if (mod && k === 'g') { e.preventDefault(); e.shiftKey ? ungroupSelection() : groupSelection(); return }
      if (mod && k === ']') { e.preventDefault(); changeZOrder(e.shiftKey ? 'front' : 'forward'); return }
      if (mod && k === '[') { e.preventDefault(); changeZOrder(e.shiftKey ? 'back' : 'backward'); return }
      if (k === 'delete' || k === 'backspace') { e.preventDefault(); deleteSelection(); return }
      if (k.startsWith('arrow') && s.selection.length) {
        e.preventDefault()
        const step = e.shiftKey ? 10 : 1
        nudge(k === 'arrowleft' ? -step : k === 'arrowright' ? step : 0, k === 'arrowup' ? -step : k === 'arrowdown' ? step : 0)
        return
      }
      if (!mod) {
        if (k === 't') { e.preventDefault(); const t = createText(center, 'body'); insertElements([t]); ui.setEditingText(t.id) }
        else if (k === 'r') insertElements([createShape(center, 'rect')])
        else if (k === 'o') insertElements([createShape(center, 'ellipse')])
        else if (k === 'l') insertElements([createShape(center, 'line')])
      }
    }

    const paste = (e: ClipboardEvent) => {
      if (typing(e.target)) return
      const s = useEditorStore.getState()
      if (!canEditAccess(s.access)) return
      const files = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith('image/'))
      e.preventDefault()
      if (files.length) void uploadAndInsert(files)
      else pasteClipboard()
    }

    window.addEventListener('keydown', key)
    window.addEventListener('paste', paste)
    return () => {
      window.removeEventListener('keydown', key)
      window.removeEventListener('paste', paste)
    }
  }, [onHelp, onFind])
}
