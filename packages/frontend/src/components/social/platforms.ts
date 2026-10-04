export const PLATFORM_LABEL: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  x: 'X',
  pinterest: 'Pinterest',
}

export const CAPTION_LIMIT: Record<string, number> = {
  x: 280,
  instagram: 2200,
  linkedin: 3000,
  facebook: 63206,
  pinterest: 500,
}

export const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Waiting for review',
  APPROVED: 'Approved',
  REJECTED: 'Changes requested',
  SCHEDULED: 'Scheduled',
  PUBLISHING: 'Publishing',
  PUBLISHED: 'Published',
  FAILED: 'Failed',
}

export const STATUS_TONE: Record<string, string> = {
  DRAFT: '',
  PENDING_APPROVAL: 'badge--warn',
  APPROVED: 'badge--ok',
  REJECTED: 'badge--danger',
  SCHEDULED: 'badge--ultra',
  PUBLISHING: 'badge--ultra',
  PUBLISHED: 'badge--ok',
  FAILED: 'badge--danger',
}
