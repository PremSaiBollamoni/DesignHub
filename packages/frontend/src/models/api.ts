export type Access = 'VIEWER' | 'COMMENTER' | 'MAKER' | 'EDITOR' | 'OWNER'

export interface User {
  id: number
  email: string
  name: string
  avatarUrl?: string
  role: string
}

export interface AuthResponse {
  token: string
  user: User
}

export interface ProjectSummary {
  id: number
  title: string
  width: number
  height: number
  thumbnail?: string
  updatedAt: string
  createdAt: string
  deletedAt?: string
  favorite: boolean
  access: Access
  ownerId: number
  ownerName: string
  folderId?: number
  teamId?: number
}

export interface ProjectPage {
  items: ProjectSummary[]
  total: number
  page: number
  size: number
}

export interface Folder {
  id: number
  name: string
}

export interface Category {
  id: number
  name: string
  slug: string
  width: number
  height: number
}

export interface TemplateSummary {
  id: number
  title: string
  categoryId?: number
  categoryName?: string
  width: number
  height: number
  thumbnail?: string
  tags?: string
}

export interface AssetFile {
  id: number
  kind: string
  fileName: string
  url: string
  mimeType: string
  sizeBytes: number
  width?: number
  height?: number
  createdAt: string
}

export interface VersionMeta {
  id: number
  label: string
  auto: boolean
  createdAt: string
  authorName?: string
  thumbnail?: string
}

export interface CommentItem {
  id: number
  parentId?: number
  pageId?: string
  elementId?: string
  x?: number
  y?: number
  body: string
  mentions: number[]
  resolved: boolean
  authorId: number
  authorName: string
  authorAvatar?: string
  createdAt: string
}

export interface Collaborator {
  userId: number
  name: string
  email: string
  avatarUrl?: string
  role: Access
  owner: boolean
}

export interface ShareLink {
  id: number
  token: string
  role: Access
  expiresAt?: string
}

export interface Team {
  id: number
  name: string
  ownerId: number
  memberCount: number
  myRole: Access
}

export interface TeamMember {
  userId: number
  name: string
  email: string
  avatarUrl?: string
  role: Access
}

export interface BrandColor {
  name: string
  hex: string
}

export interface BrandFont {
  role: string
  family: string
  weight: number
}

export interface BrandKit {
  id: number
  name: string
  colors: BrandColor[]
  fonts: BrandFont[]
  guidelines?: string
  assets: AssetFile[]
}

export interface AiSetting {
  provider: string
  keyHint?: string
  textModel?: string
  imageModel?: string
  baseUrl?: string
  active: boolean
  supportsImages: boolean
  defaultTextModel: string
  defaultImageModel: string
}

export interface SocialPlatform {
  platform: string
  configured: boolean
}

export interface SocialAccount {
  id: number
  platform: string
  displayName: string
  connectedAt: string
  expired: boolean
}

export type PostStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'SCHEDULED'
  | 'PUBLISHING'
  | 'PUBLISHED'
  | 'FAILED'

export interface SocialPost {
  id: number
  accountId: number
  platform: string
  accountName: string
  projectId?: number
  caption?: string
  mediaUrl?: string
  status: PostStatus
  scheduledAt?: string
  publishedAt?: string
  feedback?: string
  error?: string
  authorId: number
  authorName: string
  reviewerId?: number
  reviewerName?: string
  createdAt: string
}

export interface NotificationItem {
  id: number
  type: string
  message: string
  link?: string
  createdAt: string
  read: boolean
}

export interface Plan {
  code: string
  name: string
  priceCents: number
  maxProjects: number
  storageBytes: number
  aiRequestsPerMonth: number
  exportsPerMonth: number
  teamSeats: number
}

export interface Usage {
  plan: Plan
  status: string
  currentPeriodEnd?: string
  projects: number
  storageBytes: number
  aiRequests: number
  exports: number
}

export interface BillingRecord {
  id: number
  description: string
  amountCents: number
  status: string
  createdAt: string
}

export interface ActivityItem {
  id: number
  type: string
  meta?: string
  createdAt: string
  actorName: string
  projectId?: number
  projectTitle?: string
}

export interface PresenceUser {
  sessionId: string
  userId: number
  name: string
  avatarUrl?: string
  color: string
}

export interface EmailSettings {
  comments: boolean
  mentions: boolean
  invitations: boolean
  approvals: boolean
  productUpdates: boolean
}
