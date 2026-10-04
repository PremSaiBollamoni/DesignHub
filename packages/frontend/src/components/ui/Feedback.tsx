import type { ReactNode } from 'react'
import { Icon } from './Icon'
import type { IconName } from './iconPaths'
import { Button } from './Button'

export function Spinner({ size = 18 }: { size?: number }) {
  return <span className="spinner" style={{ width: size, height: size }} role="status" aria-label="Loading" />
}

export function Skeleton({ height = 16, width = '100%', radius }: { height?: number | string; width?: number | string; radius?: number }) {
  return <div className="skeleton" style={{ height, width, borderRadius: radius }} aria-hidden="true" />
}

interface EmptyStateProps {
  icon: IconName
  title: string
  message: string
  action?: ReactNode
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="empty">
      <div className="empty__art">
        <Icon name={icon} size={26} />
      </div>
      <h3>{title}</h3>
      <p>{message}</p>
      {action}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="empty" role="alert">
      <div className="empty__art" style={{ background: 'var(--danger-tint)', color: 'var(--danger)' }}>
        <Icon name="alert" size={26} />
      </div>
      <h3>That did not load</h3>
      <p>{message}</p>
      {onRetry && (
        <Button icon="refresh" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
