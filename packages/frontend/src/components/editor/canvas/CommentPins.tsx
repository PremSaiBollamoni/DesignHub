import { useCollabStore } from '@/stores/collabStore'
import { useEditorStore } from '@/stores/editorStore'
import { useEditorUiStore } from '@/stores/editorUiStore'
import { initials } from '@/utils/common'

/** Numbered pins for open comments anchored to a spot on the current page. */
export function CommentPins() {
  const comments = useCollabStore((s) => s.comments)
  const pageId = useEditorStore((s) => s.currentPageId)
  const elements = useEditorStore((s) => s.elements)
  const zoom = useEditorUiStore((s) => s.zoom)
  const panX = useEditorUiStore((s) => s.panX)
  const panY = useEditorUiStore((s) => s.panY)
  const setRightTab = useEditorUiStore((s) => s.setRightTab)

  const pins = comments.filter((c) => !c.parentId && !c.resolved && c.pageId === pageId && (c.x != null || c.elementId))
  return (
    <div className="cursor-layer">
      {pins.map((c) => {
        const anchor = c.elementId ? elements[c.elementId] : undefined
        const x = c.elementId && anchor ? anchor.data.x + anchor.data.width : (c.x ?? 0)
        const y = c.elementId && anchor ? anchor.data.y : (c.y ?? 0)
        return (
          <button key={c.id} className="comment-pin" style={{ transform: `translate(${panX + x * zoom}px, ${panY + y * zoom}px)` }} onClick={() => setRightTab('comments')} aria-label={`Comment by ${c.authorName}`}>
            {initials(c.authorName)}
          </button>
        )
      })}
    </div>
  )
}
