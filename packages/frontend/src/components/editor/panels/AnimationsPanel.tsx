import type { AnimationKind } from '@/models/design'
import { updateElements } from '@/editor/actions/elementActions'
import { DEFAULT_ANIMATION } from '@/editor/model/defaults'
import { ANIMATION_LABEL } from '@/services/render/animation'
import { useEditorStore } from '@/stores/editorStore'
import { useEditorUiStore } from '@/stores/editorUiStore'
import { Button } from '@/components/ui/Button'
import { PanelShell } from './PanelShell'

const KINDS = (Object.keys(ANIMATION_LABEL) as AnimationKind[]).filter((k) => k !== 'none')

export function AnimationsPanel() {
  const selection = useEditorStore((s) => s.selection)
  const pageIds = useEditorStore((s) => s.pageElementIds[s.currentPageId])
  const current = useEditorStore((s) => (s.selection.length ? s.elements[s.selection[0]!]?.data.animation?.kind : undefined))
  const setTimeline = useEditorUiStore((s) => s.setTimelineOpen)
  const setPlayhead = useEditorUiStore((s) => s.setPlayhead)

  function apply(kind: AnimationKind) {
    updateElements(selection, (el) => ({ animation: { ...DEFAULT_ANIMATION, ...(el.data.animation ?? {}), kind } }))
  }

  /** Staggers a rise-up across the page in reading order so a whole layout animates in one click. */
  function animatePage() {
    const s = useEditorStore.getState()
    const ordered = [...(pageIds ?? [])].map((id) => s.elements[id]!).sort((a, b) => a.data.y - b.data.y || a.data.x - b.data.x)
    ordered.forEach((el, i) => updateElements([el.id], { animation: { kind: 'slide-up', duration: 0.7, delay: Math.min(i * 0.25, 4) } }))
  }

  return (
    <PanelShell title="Animations">
      <p className="field__hint">{selection.length ? `Applies to ${selection.length} selected element${selection.length === 1 ? '' : 's'}.` : 'Select an element to animate it, or animate the whole page at once.'}</p>
      <div style={{ display: 'grid', gap: 6 }}>
        {KINDS.map((k) => (
          <button key={k} className="anim-card" aria-pressed={current === k} disabled={!selection.length} onClick={() => apply(k)}>
            {ANIMATION_LABEL[k]}
          </button>
        ))}
        <button className="anim-card" disabled={!selection.length || !current} onClick={() => updateElements(selection, { animation: undefined })}>
          Remove animation
        </button>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        <Button onClick={animatePage} disabled={!pageIds?.length} icon="sparkle">
          Animate whole page
        </Button>
        <Button
          icon="play"
          onClick={() => {
            setTimeline(true)
            setPlayhead(0, true)
          }}
        >
          Preview page
        </Button>
      </div>
    </PanelShell>
  )
}
