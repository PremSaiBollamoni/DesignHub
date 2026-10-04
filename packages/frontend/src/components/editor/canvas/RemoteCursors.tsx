import { useEffect, useState } from 'react'
import { useCollabStore } from '@/stores/collabStore'
import { useEditorStore } from '@/stores/editorStore'
import { useEditorUiStore } from '@/stores/editorUiStore'

const IDLE_MS = 8000

/** Collaborators' pointers, drawn in the DOM so they stay crisp and never take part in canvas hit testing. */
export function RemoteCursors() {
  const cursors = useCollabStore((s) => s.cursors)
  const pageId = useEditorStore((s) => s.currentPageId)
  const zoom = useEditorUiStore((s) => s.zoom)
  const panX = useEditorUiStore((s) => s.panX)
  const panY = useEditorUiStore((s) => s.panY)
  const [, tick] = useState(0)

  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 2000)
    return () => clearInterval(t)
  }, [])

  const now = Date.now()
  return (
    <div className="cursor-layer" aria-hidden="true">
      {Object.values(cursors)
        .filter((c) => c.pageId === pageId && now - c.at < IDLE_MS)
        .map((c) => (
          <div key={c.sessionId} className="remote-cursor" style={{ transform: `translate(${panX + c.x * zoom}px, ${panY + c.y * zoom}px)`, color: c.color }}>
            <svg width="18" height="20" viewBox="0 0 18 20" fill="currentColor">
              <path d="M1 1l14 7.2-6.2 1.9L6.6 17z" stroke="#fff" strokeWidth="1.2" />
            </svg>
            <span style={{ background: c.color }}>{c.name.split(' ')[0]}</span>
          </div>
        ))}
    </div>
  )
}
