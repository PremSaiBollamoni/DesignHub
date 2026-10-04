import { canEditAccess } from '@/models/access'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { changeZOrder } from '@/editor/actions/arrangeActions'
import { copySelection, cutSelection, deleteSelection, duplicateSelection, groupSelection, hasClipboard, pasteClipboard, toggleHidden, toggleLock, ungroupSelection } from '@/editor/actions/elementActions'
import { MenuList, type MenuItems } from '@/components/ui/Menu'
import { useEditorStore } from '@/stores/editorStore'
import { useEditorUiStore } from '@/stores/editorUiStore'

/** Right-click menu for the canvas: the same actions as the toolbar and shortcuts, right where the pointer is. */
export function CanvasContextMenu() {
  const menu = useEditorUiStore((s) => s.contextMenu)
  const close = () => useEditorUiStore.getState().setContextMenu(null)
  const canEdit = useEditorStore((s) => canEditAccess(s.access))

  useEffect(() => {
    if (!menu) return
    const off = () => close()
    window.addEventListener('mousedown', off)
    window.addEventListener('keydown', off)
    window.addEventListener('resize', off)
    window.addEventListener('wheel', off, { passive: true })
    return () => {
      window.removeEventListener('mousedown', off)
      window.removeEventListener('keydown', off)
      window.removeEventListener('resize', off)
      window.removeEventListener('wheel', off)
    }
  }, [menu])

  if (!menu || !canEdit) return null
  const s = useEditorStore.getState()
  const sel = s.selection
  const els = sel.map((id) => s.elements[id]).filter(Boolean)
  const items: MenuItems = sel.length
    ? [
        { label: 'Copy', icon: 'copy', hint: 'Ctrl C', onSelect: () => void copySelection() },
        { label: 'Cut', icon: 'scissors', hint: 'Ctrl X', onSelect: cutSelection },
        { label: 'Paste', icon: 'download', hint: 'Ctrl V', disabled: !hasClipboard(), onSelect: pasteClipboard },
        { label: 'Duplicate', icon: 'copy', hint: 'Ctrl D', onSelect: duplicateSelection },
        'separator',
        { label: 'Group', icon: 'group', hint: 'Ctrl G', disabled: sel.length < 2, onSelect: groupSelection },
        { label: 'Ungroup', icon: 'ungroup', hint: 'Ctrl Shift G', disabled: !els.some((e) => e!.data.groupId), onSelect: ungroupSelection },
        'separator',
        { label: 'Bring to front', icon: 'bringFront', onSelect: () => changeZOrder('front') },
        { label: 'Bring forward', icon: 'chevronUp', hint: 'Ctrl ]', onSelect: () => changeZOrder('forward') },
        { label: 'Send backward', icon: 'chevronDown', hint: 'Ctrl [', onSelect: () => changeZOrder('backward') },
        { label: 'Send to back', icon: 'sendBack', onSelect: () => changeZOrder('back') },
        'separator',
        { label: els.every((e) => e!.data.locked) ? 'Unlock' : 'Lock', icon: 'lock', onSelect: () => toggleLock(sel) },
        { label: els.every((e) => e!.data.hidden) ? 'Show' : 'Hide', icon: 'eyeOff', onSelect: () => toggleHidden(sel) },
        { label: 'Delete', icon: 'trash', danger: true, hint: 'Del', onSelect: deleteSelection },
      ]
    : [
        { label: 'Paste', icon: 'download', hint: 'Ctrl V', disabled: !hasClipboard(), onSelect: pasteClipboard },
        { label: 'Select all', icon: 'layers', hint: 'Ctrl A', onSelect: () => s.select(s.pageElementIds[s.currentPageId] ?? []) },
      ]

  const left = Math.min(menu.x, window.innerWidth - 240)
  const top = Math.min(menu.y, window.innerHeight - items.length * 36 - 20)
  return createPortal(
    <div className="popover" style={{ left, top, width: 230 }} onMouseDown={(e) => e.stopPropagation()} onContextMenu={(e) => e.preventDefault()}>
      <MenuList items={items} onDone={close} />
    </div>,
    document.body,
  )
}
