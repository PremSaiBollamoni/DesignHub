import { cloneElement, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactElement, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'
import type { IconName } from './iconPaths'

export interface MenuEntry {
  label: string
  icon?: IconName
  hint?: string
  danger?: boolean
  disabled?: boolean
  onSelect: () => void
}

export type MenuItems = (MenuEntry | 'separator')[]

interface PopoverProps {
  anchor: HTMLElement | null
  onClose: () => void
  children: ReactNode
  align?: 'start' | 'end'
  width?: number
  placement?: 'bottom' | 'top' | 'right'
}

/** Floating panel anchored to an element; closes on outside click, Escape and scroll. */
export function Popover({ anchor, onClose, children, align = 'start', width, placement = 'bottom' }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (!anchor || !ref.current) return
    const a = anchor.getBoundingClientRect()
    const p = ref.current.getBoundingClientRect()
    let top = placement === 'top' ? a.top - p.height - 6 : placement === 'right' ? a.top : a.bottom + 6
    let left = placement === 'right' ? a.right + 6 : align === 'end' ? a.right - p.width : a.left
    left = Math.max(8, Math.min(left, window.innerWidth - p.width - 8))
    top = Math.max(8, Math.min(top, window.innerHeight - p.height - 8))
    setPos({ top, left })
  }, [anchor, align, placement, children])

  useEffect(() => {
    const down = (e: MouseEvent) => {
      if (ref.current?.contains(e.target as Node) || anchor?.contains(e.target as Node)) return
      onClose()
    }
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('mousedown', down)
    document.addEventListener('keydown', key)
    window.addEventListener('resize', onClose)
    return () => {
      document.removeEventListener('mousedown', down)
      document.removeEventListener('keydown', key)
      window.removeEventListener('resize', onClose)
    }
  }, [anchor, onClose])

  return createPortal(
    <div ref={ref} className="popover" style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, width, visibility: pos ? 'visible' : 'hidden' }}>
      {children}
    </div>,
    document.body,
  )
}

interface MenuProps {
  trigger: ReactElement<{ onClick?: (e: React.MouseEvent<HTMLElement>) => void; 'aria-expanded'?: boolean }>
  items: MenuItems
  align?: 'start' | 'end'
}

export function Menu({ trigger, items, align = 'start' }: MenuProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const close = useCallback(() => setAnchor(null), [])
  return (
    <>
      {cloneElement(trigger, {
        onClick: (e: React.MouseEvent<HTMLElement>) => {
          e.stopPropagation()
          const target = e.currentTarget
          setAnchor((cur) => (cur ? null : target))
        },
        'aria-expanded': !!anchor,
      })}
      {anchor && (
        <Popover anchor={anchor} onClose={close} align={align}>
          <MenuList items={items} onDone={close} />
        </Popover>
      )}
    </>
  )
}

export function MenuList({ items, onDone }: { items: MenuItems; onDone: () => void }) {
  return (
    <div role="menu">
      {items.map((item, i) =>
        item === 'separator' ? (
          <div key={i} className="menu-sep" />
        ) : (
          <button
            key={i}
            role="menuitem"
            className={`menu-item ${item.danger ? 'menu-item--danger' : ''}`}
            disabled={item.disabled}
            onClick={() => {
              onDone()
              item.onSelect()
            }}
          >
            {item.icon && <Icon name={item.icon} size={16} />}
            {item.label}
            {item.hint && <span className="menu-item__hint">{item.hint}</span>}
          </button>
        ),
      )}
    </div>
  )
}
