import type { AnimationKind, DesignElement } from '@/models/design'
import { alignSelection, changeZOrder, distributeSelection, type AlignMode } from '@/editor/actions/arrangeActions'
import { deleteSelection, duplicateSelection, groupSelection, toggleHidden, toggleLock, ungroupSelection } from '@/editor/actions/elementActions'
import { DEFAULT_ANIMATION } from '@/editor/model/defaults'
import { ANIMATION_LABEL } from '@/services/render/animation'
import { useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/components/ui/iconPaths'
import { IconButton } from '@/components/ui/Button'
import { ColorField, Group, NumField, Row, SliderField } from './controls'
import { useApply } from './useSelection'

const ALIGN: { mode: AlignMode; icon: IconName; label: string }[] = [
  { mode: 'left', icon: 'alignLeft', label: 'Align left' },
  { mode: 'centerH', icon: 'alignCenterH', label: 'Align center' },
  { mode: 'right', icon: 'alignRight', label: 'Align right' },
  { mode: 'top', icon: 'alignTop', label: 'Align top' },
  { mode: 'centerV', icon: 'alignCenterV', label: 'Align middle' },
  { mode: 'bottom', icon: 'alignBottom', label: 'Align bottom' },
]

export function CommonProps({ elements }: { elements: DesignElement[] }) {
  const ids = elements.map((e) => e.id)
  const apply = useApply(ids)
  const first = elements[0]!
  const d = first.data
  const multi = elements.length > 1
  const lockedAll = elements.every((e) => e.data.locked)
  const hiddenAll = elements.every((e) => e.data.hidden)
  const isLine = first.type === 'shape' && (first.data.shape === 'line' || first.data.shape === 'arrow')
  const anim = d.animation ?? { ...DEFAULT_ANIMATION, kind: 'none' as AnimationKind }
  const [ratioLock, setRatioLock] = useState(false)
  const ratio = d.height > 0 ? d.width / d.height : 1

  return (
    <>
      <Group title="Arrange">
        <div className="align-grid">
          {ALIGN.map((a) => (
            <IconButton key={a.mode} icon={a.icon} label={a.label} size="sm" onClick={() => alignSelection(a.mode)} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <IconButton icon="distributeH" label="Distribute horizontally" size="sm" disabled={elements.length < 3} onClick={() => distributeSelection('h')} />
          <IconButton icon="distributeV" label="Distribute vertically" size="sm" disabled={elements.length < 3} onClick={() => distributeSelection('v')} />
          <span className="etop__sep" />
          <IconButton icon="bringFront" label="Bring to front" size="sm" onClick={() => changeZOrder('front')} />
          <IconButton icon="chevronUp" label="Bring forward" size="sm" onClick={() => changeZOrder('forward')} />
          <IconButton icon="chevronDown" label="Send backward" size="sm" onClick={() => changeZOrder('backward')} />
          <IconButton icon="sendBack" label="Send to back" size="sm" onClick={() => changeZOrder('back')} />
        </div>
        <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <IconButton icon="group" label="Group" size="sm" disabled={!multi} onClick={groupSelection} />
          <IconButton icon="ungroup" label="Ungroup" size="sm" disabled={!elements.some((e) => e.data.groupId)} onClick={ungroupSelection} />
          <IconButton icon="copy" label="Duplicate" size="sm" onClick={duplicateSelection} />
          <IconButton icon={lockedAll ? 'lock' : 'unlock'} label={lockedAll ? 'Unlock' : 'Lock'} size="sm" active={lockedAll} onClick={() => toggleLock(ids)} />
          <IconButton icon={hiddenAll ? 'eyeOff' : 'eye'} label={hiddenAll ? 'Show' : 'Hide'} size="sm" active={hiddenAll} onClick={() => toggleHidden(ids)} />
          <IconButton icon="trash" label="Delete" size="sm" onClick={deleteSelection} />
        </div>
      </Group>

      <Group title="Position and size">
        <div className="prop-pair">
          <NumField label="X" ariaLabel="X position" value={d.x} onChange={(v) => apply({ x: v }, 'x')} />
          <NumField label="Y" ariaLabel="Y position" value={d.y} onChange={(v) => apply({ y: v }, 'y')} />
          <NumField label="W" ariaLabel="Width" value={d.width} min={1} onChange={(v) => apply(ratioLock ? { width: v, height: v / ratio } : { width: v }, 'w')} />
          <NumField label="H" ariaLabel="Height" value={d.height} min={isLine ? 0 : 1} onChange={(v) => apply(ratioLock ? { height: v, width: v * ratio } : { height: v }, 'h')} />
        </div>
        <button className="btn btn--sm" aria-pressed={ratioLock} onClick={() => setRatioLock(!ratioLock)} style={{ justifySelf: 'start' }}>
          <Icon name={ratioLock ? 'lock' : 'unlock'} size={14} /> {ratioLock ? 'Aspect ratio locked' : 'Lock aspect ratio'}
        </button>
        <Row label="Rotate">
          <NumField ariaLabel="Rotation in degrees" value={d.rotation} min={-360} max={360} onChange={(v) => apply({ rotation: v }, 'rot')} />
        </Row>
        <Row label="Opacity">
          <SliderField ariaLabel="Opacity" value={Math.round(d.opacity * 100)} min={0} max={100} format={(v) => `${v}%`} onChange={(v) => apply({ opacity: v / 100 }, 'opacity')} />
        </Row>
      </Group>

      <Group title="Shadow">
        <Row label="Drop shadow">
          <button className="btn btn--sm" aria-pressed={!!d.shadow} onClick={() => apply({ shadow: d.shadow ? undefined : { color: '#000000', blur: 24, x: 0, y: 10, opacity: 0.3 } })}>
            {d.shadow ? 'Remove shadow' : 'Add shadow'}
          </button>
        </Row>
        {d.shadow && (
          <>
            <ColorField ariaLabel="Shadow color" value={d.shadow.color} onChange={(c) => apply({ shadow: { ...d.shadow!, color: c } }, 'shc')} />
            <Row label="Blur">
              <SliderField ariaLabel="Shadow blur" value={d.shadow.blur} min={0} max={100} onChange={(v) => apply({ shadow: { ...d.shadow!, blur: v } }, 'shb')} />
            </Row>
            <div className="prop-pair">
              <NumField label="X" ariaLabel="Shadow offset X" value={d.shadow.x} onChange={(v) => apply({ shadow: { ...d.shadow!, x: v } }, 'shx')} />
              <NumField label="Y" ariaLabel="Shadow offset Y" value={d.shadow.y} onChange={(v) => apply({ shadow: { ...d.shadow!, y: v } }, 'shy')} />
            </div>
            <Row label="Strength">
              <SliderField ariaLabel="Shadow opacity" value={Math.round(d.shadow.opacity * 100)} min={0} max={100} format={(v) => `${v}%`} onChange={(v) => apply({ shadow: { ...d.shadow!, opacity: v / 100 } }, 'sho')} />
            </Row>
          </>
        )}
      </Group>

      <Group title="Entrance animation">
        <select
          className="select select--sm"
          aria-label="Entrance animation"
          value={anim.kind}
          onChange={(e) => {
            const kind = e.target.value as AnimationKind
            apply({ animation: kind === 'none' ? undefined : { ...(d.animation ?? DEFAULT_ANIMATION), kind } })
          }}
        >
          {(Object.keys(ANIMATION_LABEL) as AnimationKind[]).map((k) => (
            <option key={k} value={k}>
              {ANIMATION_LABEL[k]}
            </option>
          ))}
        </select>
        {d.animation && d.animation.kind !== 'none' && (
          <div className="prop-pair">
            <NumField label="Dur" ariaLabel="Animation duration in seconds" value={d.animation.duration} min={0.1} max={20} step={0.1} digits={2} onChange={(v) => apply({ animation: { ...d.animation!, duration: v } }, 'ad')} />
            <NumField label="Delay" ariaLabel="Animation delay in seconds" value={d.animation.delay} min={0} max={60} step={0.1} digits={2} onChange={(v) => apply({ animation: { ...d.animation!, delay: v } }, 'adl')} />
          </div>
        )}
        {first.type === 'video' && (
          <p className="field__hint">
            <Icon name="info" size={12} /> Video plays while you preview or present.
          </p>
        )}
      </Group>
    </>
  )
}
