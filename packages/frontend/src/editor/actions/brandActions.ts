import type { BrandColor } from '@/models/api'
import type { Change } from '@/editor/model/changes'
import type { DesignElement } from '@/models/design'
import { parseBackground, serializeBackground } from '@/models/design'
import { useEditorStore } from '@/stores/editorStore'

const HEX = /^#[0-9a-f]{6}$/i

function lum(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)
}

const norm = (c: string | undefined) => (c && HEX.test(c) ? c.toUpperCase() : null)

function elementColors(e: DesignElement): (string | undefined)[] {
  const d = e.data as unknown as Record<string, unknown>
  return [d.fill as string, d.stroke as string, d.background as string]
}

/**
 * Recolours the whole design from the brand palette. The design's own colours are ranked from dark to light and mapped to
 * the brand colours ranked the same way, so contrast and hierarchy survive while the hues become the brand's.
 */
export function recolorToBrand(brand: BrandColor[]): number {
  const palette = brand.map((b) => b.hex.toUpperCase()).filter((h) => HEX.test(h))
  if (palette.length < 2) return 0
  const s = useEditorStore.getState()

  const used = new Set<string>()
  for (const pid of s.pageIds) {
    const bg = parseBackground(s.pages[pid]!.background)
    if (bg.type === 'solid') used.add(bg.color.toUpperCase())
    for (const id of s.pageElementIds[pid] ?? []) for (const c of elementColors(s.elements[id]!)) if (norm(c)) used.add(norm(c)!)
  }
  const ours = [...used].sort((a, b) => lum(a) - lum(b))
  const theirs = [...palette].sort((a, b) => lum(a) - lum(b))
  if (!ours.length) return 0
  const map = new Map<string, string>()
  ours.forEach((c, i) => map.set(c, theirs[Math.min(theirs.length - 1, Math.round((i / Math.max(1, ours.length - 1)) * (theirs.length - 1)))]!))

  const changes: Change[] = []
  let touched = 0
  for (const pid of s.pageIds) {
    const meta = s.pages[pid]!
    const bg = parseBackground(meta.background)
    if (bg.type === 'solid' && map.has(bg.color.toUpperCase())) {
      changes.push({ kind: 'page', id: pid, before: meta, after: { ...meta, background: serializeBackground({ type: 'solid', color: map.get(bg.color.toUpperCase())! }) } })
      touched++
    }
    for (const id of s.pageElementIds[pid] ?? []) {
      const el = s.elements[id]!
      const d = el.data as unknown as Record<string, unknown>
      const patch: Record<string, unknown> = {}
      for (const key of ['fill', 'stroke', 'background'] as const) {
        const c = norm(d[key] as string)
        if (c && map.has(c) && map.get(c) !== c) patch[key] = map.get(c)
      }
      if (Object.keys(patch).length) {
        changes.push({ kind: 'el', id, pageId: pid, before: el, after: { ...el, data: { ...el.data, ...patch, ts: Date.now() } } as DesignElement })
        touched++
      }
    }
  }
  s.commit(changes)
  return touched
}
