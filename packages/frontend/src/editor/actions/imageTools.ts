import type { ImageElement } from '@/models/design'
import { createImage, createText } from '@/editor/model/defaults'
import { aiApi } from '@/services/api/aiApi'
import { useEditorStore } from '@/stores/editorStore'
import { errorMessage, toast } from '@/stores/toastStore'
import { uid } from '@/utils/common'
import { insertElements, updateElements } from './elementActions'

const store = () => useEditorStore.getState()

function imageElement(id: string): ImageElement | null {
  const el = store().elements[id]
  return el && el.type === 'image' ? el : null
}

async function blobOf(url: string): Promise<Blob> {
  const res = await fetch(url, { mode: 'cors' })
  if (!res.ok) throw new Error('The image could not be read')
  return res.blob()
}

/** Cuts the subject out of the picture using the ML worker and swaps the element's source for the cut-out. */
export async function removeBackground(id: string): Promise<void> {
  const el = imageElement(id)
  if (!el) return
  const asset = await aiApi.removeBackground(await blobOf(el.data.src))
  updateElements([id], { src: asset.url, filters: undefined })
  toast.success('Background removed')
}

/** Reads text from the picture in the browser (Tesseract) and places it as an editable text box. */
export async function extractText(id: string): Promise<void> {
  const el = imageElement(id)
  if (!el) return
  toast.info('Reading text from the image…')
  const { recognize } = await import('tesseract.js')
  const { data } = await recognize(el.data.src, 'eng')
  const text = data.text.trim()
  if (!text) {
    toast.info('No text was found in this image')
    return
  }
  const t = createText({ cx: el.data.x + el.data.width / 2, cy: el.data.y + el.data.height + 80 }, 'body')
  insertElements([{ ...t, data: { ...t.data, text, width: Math.min(el.data.width, 720), height: 40 } }])
}

/** Splits a flat picture into editable layers: each detected object becomes its own image above a cleaned background. */
export async function splitIntoLayers(id: string): Promise<void> {
  const el = imageElement(id)
  if (!el) return
  toast.info('Finding objects in the picture. This can take a moment.')
  try {
    const result = await aiApi.decompose(await blobOf(el.data.src), 8)
    if (!result.layers.length) {
      toast.info('No separate objects were found')
      return
    }
    const sx = el.data.width / result.width
    const sy = el.data.height / result.height
    const layers = result.layers.map((layer) => {
      const [x, y, w, h] = layer.bbox
      const img = createImage({ cx: 0, cy: 0 }, layer.url, Math.round(w), Math.round(h), 100000)
      return { ...img, id: uid(), data: { ...img.data, x: el.data.x + x * sx, y: el.data.y + y * sy, width: w * sx, height: h * sy, name: 'Layer' } }
    })
    if (result.backgroundUrl) updateElements([id], { src: result.backgroundUrl })
    insertElements(layers)
    toast.success(`Split into ${layers.length} layer${layers.length === 1 ? '' : 's'}`)
  } catch (e) {
    toast.error(errorMessage(e))
  }
}
