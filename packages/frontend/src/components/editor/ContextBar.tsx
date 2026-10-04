import { canEditAccess } from '@/models/access'
import { useShallow } from 'zustand/react/shallow'
import type { DesignElement, ImageElement, ShapeElement, TextElement } from '@/models/design'
import { alignSelection, changeZOrder, distributeSelection, flipSelection } from '@/editor/actions/arrangeActions'
import { copySelection, copyStyle, hasStyle, pasteStyle, cutSelection, deleteSelection, duplicateSelection, groupSelection, hasClipboard, pasteClipboard, toggleHidden, toggleLock, ungroupSelection, updateElements } from '@/editor/actions/elementActions'
import { removeBackground } from '@/editor/actions/imageTools'
import { addPage } from '@/editor/actions/pageActions'
import { parseBackground, serializeBackground } from '@/models/design'
import { updatePage } from '@/editor/actions/pageActions'
import { FONT_FAMILIES, loadFont, weightsFor } from '@/services/assets/fonts'
import { useEditorStore } from '@/stores/editorStore'
import { useEditorUiStore } from '@/stores/editorUiStore'
import { errorMessage, toast } from '@/stores/toastStore'
import { Button, IconButton } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Menu } from '@/components/ui/Menu'
import { ColorChip, NumField } from './inspector/controls'

const Sep = () => <span className="etop__sep" aria-hidden="true" />

function TextTools({ els }: { els: TextElement[] }) {
  const ids = els.map((e) => e.id)
  const d = els[0]!.data
  const set = (patch: Partial<TextElement['data']>, key?: string) => updateElements(ids, patch, { coalesceKey: key ? `ctx-${key}` : undefined })
  const weights = weightsFor(d.fontFamily)
  const bold = d.fontWeight >= 600
  return (
    <>
      <select
        className="select select--sm"
        style={{ width: 150, fontFamily: `"${d.fontFamily}"` }}
        aria-label="Font"
        value={d.fontFamily}
        onChange={(e) => {
          const family = e.target.value
          const allowed = weightsFor(family)
          const weight = allowed.includes(d.fontWeight) ? d.fontWeight : allowed[0]!
          void loadFont(family, [weight]).then(() => set({ fontFamily: family, fontWeight: weight }))
        }}
      >
        {FONT_FAMILIES.map((f) => (
          <option key={f.family} value={f.family}>
            {f.family}
          </option>
        ))}
      </select>
      <div style={{ width: 74 }}>
        <NumField ariaLabel="Font size" value={d.fontSize} min={4} max={1000} onChange={(v) => set({ fontSize: v }, 'size')} />
      </div>
      <ColorChip ariaLabel="Text colour" value={d.fill} onChange={(c) => set({ fill: c }, 'fill')} />
      <div className="seg" role="group" aria-label="Text style">
        <button aria-pressed={bold} aria-label="Bold" title="Bold" disabled={weights.length < 2} onClick={() => set({ fontWeight: bold ? (weights.find((w) => w <= 400) ?? weights[0]!) : (weights.find((w) => w >= 700) ?? weights[weights.length - 1]!) })}>
          <Icon name="bold" size={15} />
        </button>
        <button aria-pressed={!!d.italic} aria-label="Italic" title="Italic" onClick={() => set({ italic: !d.italic })}>
          <Icon name="italic" size={15} />
        </button>
        <button aria-pressed={!!d.underline} aria-label="Underline" title="Underline" onClick={() => set({ underline: !d.underline })}>
          <Icon name="underline" size={15} />
        </button>
        <button aria-pressed={!!d.strike} aria-label="Strikethrough" title="Strikethrough" onClick={() => set({ strike: !d.strike })}>
          <Icon name="strike" size={15} />
        </button>
      </div>
      <div className="seg" role="group" aria-label="Alignment">
        {([['left', 'textLeft'], ['center', 'textCenter'], ['right', 'textRight']] as const).map(([a, icon]) => (
          <button key={a} aria-pressed={d.align === a} aria-label={`Align ${a}`} title={`Align ${a}`} onClick={() => set({ align: a })}>
            <Icon name={icon} size={15} />
          </button>
        ))}
      </div>
    </>
  )
}

function ShapeTools({ els }: { els: ShapeElement[] }) {
  const ids = els.map((e) => e.id)
  const d = els[0]!.data
  const line = d.shape === 'line' || d.shape === 'arrow'
  return (
    <>
      {!line && <ColorChip ariaLabel="Fill colour" value={d.fill} allowNone onChange={(c) => updateElements(ids, { fill: c }, { coalesceKey: 'ctx-fill' })} />}
      <ColorChip ariaLabel={line ? 'Line colour' : 'Outline colour'} value={d.stroke ?? (line ? d.fill : 'transparent')} allowNone={!line} onChange={(c) => updateElements(ids, { stroke: c === 'transparent' ? undefined : c, strokeWidth: c === 'transparent' ? 0 : Math.max(2, d.strokeWidth) }, { coalesceKey: 'ctx-stroke' })} />
      <div style={{ width: 70 }}>
        <NumField ariaLabel={line ? 'Line weight' : 'Outline weight'} value={d.strokeWidth} min={0} max={80} onChange={(v) => updateElements(ids, { strokeWidth: v }, { coalesceKey: 'ctx-sw' })} />
      </div>
      {d.shape === 'rect' && (
        <div style={{ width: 82 }}>
          <NumField label="R" ariaLabel="Corner radius" value={d.cornerRadius ?? 0} min={0} max={2000} onChange={(v) => updateElements(ids, { cornerRadius: v }, { coalesceKey: 'ctx-cr' })} />
        </div>
      )}
    </>
  )
}

function ImageTools({ els }: { els: ImageElement[] }) {
  const one = els.length === 1
  const setCropping = useEditorUiStore((s) => s.setCropping)
  return (
    <>
      <Button size="sm" icon="crop" disabled={!one || !els[0]!.data.naturalWidth} onClick={() => setCropping(els[0]!.id)}>
        Crop
      </Button>
      <IconButton icon="flipH" label="Flip horizontally" size="sm" onClick={() => flipSelection('h')} />
      <IconButton icon="flipV" label="Flip vertically" size="sm" onClick={() => flipSelection('v')} />
      <Button size="sm" className="btn--ai" icon="scissors" disabled={!one} onClick={() => void removeBackground(els[0]!.id).catch((e) => toast.error(errorMessage(e)))}>
        Remove background
      </Button>
    </>
  )
}

function PageTools() {
  const pageId = useEditorStore((s) => s.currentPageId)
  const background = useEditorStore((s) => s.pages[s.currentPageId]?.background ?? '#ffffff')
  const snapping = useEditorUiStore((s) => s.snapping)
  const grid = useEditorUiStore((s) => s.showGrid)
  const rulers = useEditorUiStore((s) => s.showRulers)
  const guideCount = useEditorUiStore((s) => s.guides.x.length + s.guides.y.length)
  const bg = parseBackground(background)
  return (
    <>
      <span className="ctx-label">Page</span>
      <ColorChip ariaLabel="Page background" value={bg.type === 'solid' ? bg.color : '#ffffff'} onChange={(c) => updatePage(pageId, { background: serializeBackground({ type: 'solid', color: c }) }, 'bg')} />
      <Sep />
      <Button size="sm" icon="plus" onClick={() => addPage()}>
        Add page
      </Button>
      <Button size="sm" icon="copy" disabled={!hasClipboard()} onClick={pasteClipboard}>
        Paste
      </Button>
      <Sep />
      <button className="btn btn--sm" aria-pressed={snapping} onClick={() => useEditorUiStore.getState().setSnapping(!snapping)}>
        <Icon name="alignCenterH" size={15} /> Snap {snapping ? 'on' : 'off'}
      </button>
      <button className="btn btn--sm" aria-pressed={rulers} onClick={() => useEditorUiStore.getState().setShowRulers(!rulers)}>
        <Icon name="alignTop" size={15} /> Rulers {rulers ? 'on' : 'off'}
      </button>
      <button className="btn btn--sm" aria-pressed={grid} onClick={() => useEditorUiStore.getState().setShowGrid(!grid)}>
        <Icon name="grid" size={15} /> Grid {grid ? 'on' : 'off'}
      </button>
      {guideCount > 0 && (
        <Button size="sm" variant="ghost" onClick={() => useEditorUiStore.getState().setGuides({ x: [], y: [] })}>
          Clear {guideCount} guide{guideCount === 1 ? '' : 's'}
        </Button>
      )}
    </>
  )
}

export function ContextBar() {
  const canEdit = useEditorStore((s) => canEditAccess(s.access))
  const els = useEditorStore(useShallow((s) => s.selection.map((id) => s.elements[id]).filter((e): e is DesignElement => !!e)))
  const setLeft = useEditorUiStore((s) => s.setLeftPanel)
  const setTab = useEditorUiStore((s) => s.setRightTab)
  const snapping = useEditorUiStore((s) => s.snapping)

  if (!canEdit) return <div className="ctxbar"><span className="ctx-label">You can view and comment on this design.</span></div>
  if (!els.length) return <div className="ctxbar"><PageTools /></div>

  const ids = els.map((e) => e.id)
  const single = els.length === 1
  const type = els.every((e) => e.type === els[0]!.type) ? els[0]!.type : null
  const grouped = els.some((e) => e.data.groupId)
  const locked = els.every((e) => e.data.locked)

  return (
    <div className="ctxbar" role="toolbar" aria-label="Selection tools">
      <span className="ctx-label">{els.length > 1 ? `${els.length} selected` : (els[0]!.data.name ?? els[0]!.type)}</span>
      <Sep />
      {type === 'text' && <TextTools els={els as TextElement[]} />}
      {type === 'shape' && <ShapeTools els={els as ShapeElement[]} />}
      {type === 'image' && <ImageTools els={els as ImageElement[]} />}
      {(type === 'frame' || type === 'icon') && (
        <ColorChip ariaLabel="Colour" value={(els[0]!.data as { fill: string }).fill} onChange={(c) => updateElements(ids, { fill: c }, { coalesceKey: 'ctx-fill' })} />
      )}
      {(type === 'chart' || type === 'table') && (
        <Button size="sm" icon="settings" onClick={() => setTab('design')}>
          Edit data
        </Button>
      )}
      {type && <Sep />}

      <Button size="sm" icon="group" disabled={els.length < 2} onClick={groupSelection} title="Group (Ctrl G)">
        Group
      </Button>
      <Button size="sm" icon="ungroup" disabled={!grouped} onClick={ungroupSelection} title="Ungroup (Ctrl Shift G)">
        Ungroup
      </Button>
      <Menu
        trigger={
          <Button size="sm" icon="alignCenterH">
            Align
          </Button>
        }
        items={[
          { label: 'Align left', icon: 'alignLeft', onSelect: () => alignSelection('left') },
          { label: 'Align centre', icon: 'alignCenterH', onSelect: () => alignSelection('centerH') },
          { label: 'Align right', icon: 'alignRight', onSelect: () => alignSelection('right') },
          'separator',
          { label: 'Align top', icon: 'alignTop', onSelect: () => alignSelection('top') },
          { label: 'Align middle', icon: 'alignCenterV', onSelect: () => alignSelection('centerV') },
          { label: 'Align bottom', icon: 'alignBottom', onSelect: () => alignSelection('bottom') },
          'separator',
          { label: 'Distribute horizontally', icon: 'distributeH', disabled: els.length < 3, onSelect: () => distributeSelection('h') },
          { label: 'Distribute vertically', icon: 'distributeV', disabled: els.length < 3, onSelect: () => distributeSelection('v') },
        ]}
      />
      <Menu
        trigger={
          <Button size="sm" icon="layers">
            Order
          </Button>
        }
        items={[
          { label: 'Bring to front', icon: 'bringFront', hint: 'Ctrl Shift ]', onSelect: () => changeZOrder('front') },
          { label: 'Bring forward', icon: 'chevronUp', hint: 'Ctrl ]', onSelect: () => changeZOrder('forward') },
          { label: 'Send backward', icon: 'chevronDown', hint: 'Ctrl [', onSelect: () => changeZOrder('backward') },
          { label: 'Send to back', icon: 'sendBack', hint: 'Ctrl Shift [', onSelect: () => changeZOrder('back') },
        ]}
      />
      <Button size="sm" icon="animation" onClick={() => setLeft('animations')}>
        Animate
      </Button>
      <Sep />
      <IconButton icon="copy" label="Duplicate (Ctrl D)" size="sm" onClick={duplicateSelection} />
      <IconButton icon={locked ? 'lock' : 'unlock'} label={locked ? 'Unlock' : 'Lock'} size="sm" active={locked} onClick={() => toggleLock(ids)} />
      <IconButton icon="trash" label="Delete (Delete key)" size="sm" onClick={deleteSelection} />
      <Menu
        align="end"
        trigger={<IconButton icon="more" label="More actions" size="sm" />}
        items={[
          { label: 'Copy', icon: 'copy', hint: 'Ctrl C', onSelect: () => void copySelection() },
          { label: 'Cut', icon: 'scissors', hint: 'Ctrl X', onSelect: cutSelection },
          { label: 'Paste', icon: 'download', hint: 'Ctrl V', disabled: !hasClipboard(), onSelect: pasteClipboard },
          { label: 'Copy style', icon: 'brand', hint: 'Ctrl Alt C', disabled: !single, onSelect: () => void copyStyle() },
          { label: 'Paste style', icon: 'brand', hint: 'Ctrl Alt V', disabled: !hasStyle(), onSelect: pasteStyle },
          'separator',
          { label: els.every((e) => e.data.hidden) ? 'Show' : 'Hide', icon: 'eyeOff', onSelect: () => toggleHidden(ids) },
          { label: 'Add a comment', icon: 'comment', disabled: !single, onSelect: () => setTab('comments') },
          { label: `Snapping ${snapping ? 'on' : 'off'}`, icon: 'alignCenterH', onSelect: () => useEditorUiStore.getState().setSnapping(!snapping) },
        ]}
      />
    </div>
  )
}

