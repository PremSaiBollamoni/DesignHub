import { loadImage } from '@/services/render/imageCache'

/** The dominant colours of a picture, found by bucketing pixels and keeping the most common distinct ones. */
export async function paletteFromImage(src: string, count = 6): Promise<string[]> {
  const img = await loadImage(src)
  const c = document.createElement('canvas')
  c.width = 64
  c.height = Math.max(1, Math.round((64 * img.naturalHeight) / img.naturalWidth))
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0, c.width, c.height)
  const data = ctx.getImageData(0, 0, c.width, c.height).data
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>()
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3]! < 200) continue
    const key = ((data[i]! >> 4) << 8) | ((data[i + 1]! >> 4) << 4) | (data[i + 2]! >> 4)
    const e = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 }
    e.n++
    e.r += data[i]!
    e.g += data[i + 1]!
    e.b += data[i + 2]!
    buckets.set(key, e)
  }
  const sorted = [...buckets.values()].sort((a, b) => b.n - a.n).map((e) => [e.r / e.n, e.g / e.n, e.b / e.n])
  const picked: number[][] = []
  for (const col of sorted) {
    if (picked.every((p) => Math.abs(p[0]! - col[0]!) + Math.abs(p[1]! - col[1]!) + Math.abs(p[2]! - col[2]!) > 90)) picked.push(col)
    if (picked.length >= count) break
  }
  return picked.map((p) => '#' + p.map((n) => Math.round(n).toString(16).padStart(2, '0')).join('').toUpperCase())
}
