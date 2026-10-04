import type { DesignElement } from '@/models/design'

export interface PageMeta {
  id: string
  name: string
  background: string
  durationSeconds: number | null
  notes: string
}

/**
 * Every edit is expressed as a list of reversible changes. History, collaboration sync and
 * remote application all consume the same records, which keeps the three in agreement.
 */
export type Change =
  | { kind: 'el'; id: string; pageId: string; before: DesignElement | null; after: DesignElement | null }
  | { kind: 'order'; pageId: string; before: string[]; after: string[] }
  | { kind: 'page'; id: string; before: PageMeta | null; after: PageMeta | null }
  | { kind: 'pageOrder'; before: string[]; after: string[] }
  | { kind: 'size'; before: { width: number; height: number }; after: { width: number; height: number } }

export interface DocState {
  width: number
  height: number
  pageIds: string[]
  pages: Record<string, PageMeta>
  pageElementIds: Record<string, string[]>
  elements: Record<string, DesignElement>
}

export type DocPatch = Partial<DocState>

/** Applies changes forward (`redo`) or backward (`undo`) and returns the patch to merge into state. */
export function applyChanges(state: DocState, changes: Change[], direction: 'redo' | 'undo'): DocPatch {
  let elements = state.elements
  let pageElementIds = state.pageElementIds
  let pages = state.pages
  let pageIds = state.pageIds
  let width = state.width
  let height = state.height
  let elementsCloned = false
  let idsCloned = false
  let pagesCloned = false

  const list = direction === 'undo' ? [...changes].reverse() : changes
  for (const c of list) {
    switch (c.kind) {
      case 'el': {
        const next = direction === 'redo' ? c.after : c.before
        if (!elementsCloned) {
          elements = { ...elements }
          elementsCloned = true
        }
        if (next) elements[c.id] = next
        else delete elements[c.id]
        break
      }
      case 'order': {
        if (!idsCloned) {
          pageElementIds = { ...pageElementIds }
          idsCloned = true
        }
        const next = direction === 'redo' ? c.after : c.before
        if (next.length || pages[c.pageId]) pageElementIds[c.pageId] = next
        else delete pageElementIds[c.pageId]
        break
      }
      case 'page': {
        const next = direction === 'redo' ? c.after : c.before
        if (!pagesCloned) {
          pages = { ...pages }
          pagesCloned = true
        }
        if (next) pages[c.id] = next
        else delete pages[c.id]
        break
      }
      case 'pageOrder':
        pageIds = direction === 'redo' ? c.after : c.before
        break
      case 'size': {
        const s = direction === 'redo' ? c.after : c.before
        width = s.width
        height = s.height
        break
      }
    }
  }
  return { elements, pageElementIds, pages, pageIds, width, height }
}

/** Invert a change list so it can be re-announced to collaborators as an undo. */
export function invertChanges(changes: Change[]): Change[] {
  return [...changes].reverse().map((c): Change => {
    switch (c.kind) {
      case 'el':
        return { ...c, before: c.after, after: c.before }
      case 'order':
        return { ...c, before: c.after, after: c.before }
      case 'page':
        return { ...c, before: c.after, after: c.before }
      case 'pageOrder':
        return { ...c, before: c.after, after: c.before }
      case 'size':
        return { ...c, before: c.after, after: c.before }
    }
  })
}
