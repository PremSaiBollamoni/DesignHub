import type { DesignDocument, DesignElement, DesignPage } from '@/models/design'
import type { DocState, PageMeta } from './changes'

/** Converts the server's nested document into the normalized shape the editor works with. */
export function docToState(doc: DesignDocument): DocState {
  const pageIds: string[] = []
  const pages: Record<string, PageMeta> = {}
  const pageElementIds: Record<string, string[]> = {}
  const elements: Record<string, DesignElement> = {}
  const sorted = [...doc.pages].sort((a, b) => a.position - b.position)
  for (const p of sorted) {
    pageIds.push(p.id)
    pages[p.id] = { id: p.id, name: p.name, background: p.background, durationSeconds: p.durationSeconds ?? null, notes: p.notes ?? '' }
    const els = [...p.elements].sort((a, b) => a.zIndex - b.zIndex)
    pageElementIds[p.id] = els.map((e) => e.id)
    for (const e of els) elements[e.id] = e
  }
  return { width: doc.width, height: doc.height, pageIds, pages, pageElementIds, elements }
}

export function stateToPages(s: DocState): DesignPage[] {
  return s.pageIds.map((id, position) => {
    const meta = s.pages[id]!
    const ids = s.pageElementIds[id] ?? []
    return {
      id,
      name: meta.name,
      background: meta.background,
      durationSeconds: meta.durationSeconds,
      notes: meta.notes,
      position,
      elements: ids.map((eid, z) => ({ ...s.elements[eid]!, zIndex: z })),
    }
  })
}

export function stateToDoc(projectId: number, s: DocState): DesignDocument {
  return { projectId, revision: 0, width: s.width, height: s.height, pages: stateToPages(s) }
}
