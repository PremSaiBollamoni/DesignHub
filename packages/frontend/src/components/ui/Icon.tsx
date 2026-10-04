import { memo } from 'react'
import { ICONS, type IconName } from './iconPaths'

interface IconProps {
  name: IconName
  size?: number
  filled?: boolean
  className?: string
}

export const Icon = memo(function Icon({ name, size = 18, filled, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {ICONS[name].split('|').map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  )
})

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#151515" />
      <path d="M9 8h8a8 8 0 0 1 0 16H9z" fill="#FF5A36" />
      <rect x="9" y="13" width="9" height="6" fill="#FFB547" />
    </svg>
  )
}
