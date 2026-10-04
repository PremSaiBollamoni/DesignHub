import { memo } from 'react'
import type { ProjectSummary } from '@/models/api'
import { Icon } from '@/components/ui/Icon'
import { IconButton } from '@/components/ui/Button'
import { Menu, type MenuItems } from '@/components/ui/Menu'
import { timeAgo } from '@/utils/common'

export interface ProjectCardActions {
  open: (p: ProjectSummary) => void
  rename: (p: ProjectSummary) => void
  duplicate: (p: ProjectSummary) => void
  move: (p: ProjectSummary) => void
  favorite: (p: ProjectSummary) => void
  trash: (p: ProjectSummary) => void
  restore: (p: ProjectSummary) => void
  deleteForever: (p: ProjectSummary) => void
}

interface Props {
  project: ProjectSummary
  actions: ProjectCardActions
  userId: number
}

export const ProjectCard = memo(function ProjectCard({ project: p, actions, userId }: Props) {
  const trashed = !!p.deletedAt
  const mine = p.ownerId === userId
  const items: MenuItems = trashed
    ? [
        { label: 'Restore', icon: 'refresh', onSelect: () => actions.restore(p) },
        'separator',
        { label: 'Delete forever', icon: 'trash', danger: true, onSelect: () => actions.deleteForever(p) },
      ]
    : [
        { label: 'Open', icon: 'external', onSelect: () => actions.open(p) },
        { label: 'Rename', icon: 'pen', disabled: !mine, onSelect: () => actions.rename(p) },
        { label: 'Duplicate', icon: 'copy', onSelect: () => actions.duplicate(p) },
        { label: 'Folder and team', icon: 'folder', disabled: !mine, onSelect: () => actions.move(p) },
        'separator',
        { label: 'Move to trash', icon: 'trash', danger: true, disabled: !mine, onSelect: () => actions.trash(p) },
      ]

  return (
    <article className="pcard">
      <div
        className="pcard__thumb"
        role="link"
        tabIndex={0}
        aria-label={`Open ${p.title}`}
        onClick={() => !trashed && actions.open(p)}
        onKeyDown={(e) => e.key === 'Enter' && !trashed && actions.open(p)}
        style={trashed ? { opacity: 0.6, cursor: 'default' } : undefined}
      >
        {p.thumbnail ? (
          <img src={p.thumbnail} alt="" loading="lazy" decoding="async" />
        ) : (
          <div className="pcard__blank" style={{ aspectRatio: `${p.width} / ${p.height}` }}>
            <Icon name="image" size={24} />
          </div>
        )}
        <div className="pcard__actions" onClick={(e) => e.stopPropagation()}>
          {!trashed && (
            <IconButton
              icon="star"
              label={p.favorite ? 'Remove from favorites' : 'Add to favorites'}
              size="sm"
              active={p.favorite}
              onClick={() => actions.favorite(p)}
            />
          )}
          <Menu align="end" trigger={<IconButton icon="more" label="More actions" size="sm" />} items={items} />
        </div>
      </div>
      <div className="pcard__title">
        {p.favorite && <Icon name="star" size={14} filled />}
        <span title={p.title}>{p.title}</span>
      </div>
      <div className="pcard__meta">
        {trashed ? 'In trash' : `Edited ${timeAgo(p.updatedAt)}`}
        {!mine && ` · by ${p.ownerName}`} · {p.width} × {p.height}
      </div>
    </article>
  )
})
