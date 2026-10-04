import type { Access } from './api'

/** Makers, Editors and owners can change a design. Viewers and commenters cannot. */
export function canEditAccess(a: Access): boolean {
  return a === 'MAKER' || a === 'EDITOR' || a === 'OWNER'
}

export const ROLE_LABEL: Record<string, string> = {
  VIEWER: 'Viewer',
  COMMENTER: 'Commenter',
  MAKER: 'Maker',
  EDITOR: 'Editor',
  OWNER: 'Owner',
}

export const ROLE_HELP: Record<string, string> = {
  VIEWER: 'Can view designs',
  COMMENTER: 'Can view and comment',
  MAKER: 'Designs and sends work for approval',
  EDITOR: 'Approves, edits and publishes',
}
