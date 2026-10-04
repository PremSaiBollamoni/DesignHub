import type { DesignElement } from '@/models/design'

export interface WireElement {
  id: string
  type: DesignElement['type']
  zIndex: number
  data: DesignElement['data']
}

export interface WirePage {
  id: string
  name: string
  background: string
  durationSeconds: number | null
  notes?: string | null
  position: number
  elements?: WireElement[]
}

export type OpType =
  | 'ELEMENTS_UPSERT'
  | 'ELEMENTS_DELETE'
  | 'PAGE_UPSERT'
  | 'PAGE_DELETE'
  | 'PAGES_ORDER'
  | 'PROJECT_SIZE'
  | 'CURSOR'
  | 'SELECTION'
  | 'CHAT'
  | 'RELOAD'

export interface DesignOp {
  type: OpType
  clientId?: string
  pageId?: string
  elements?: WireElement[]
  ids?: string[]
  page?: WirePage
  order?: string[]
  cursor?: { x: number; y: number; pageId: string }
  text?: string
  width?: number
  height?: number
}

export interface OpEnvelope {
  op: DesignOp
  userId: number
  userName: string
  revision: number
}
