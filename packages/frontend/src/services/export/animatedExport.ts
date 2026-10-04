import { PageRenderer } from '@/services/render/pageRenderer'
import { canvasToBlob, checkAborted, type ExportOptions, type ExportPage, type ExportResult } from './exportTypes'

const MAX_VIDEO_SIDE = 1920
const MAX_GIF_SIDE = 720

interface FramePlan {
  page: ExportPage
  time: number
}

/** Every frame of every page, in order. Page duration comes from the page setting or its animations. */
function planFrames(pages: ExportPage[], fps: number): FramePlan[] {
  const plan: FramePlan[] = []
  for (const page of pages) {
    const count = Math.max(1, Math.round(page.duration * fps))
    for (let i = 0; i < count; i++) plan.push({ page, time: i / fps })
  }
  return plan
}

function pixelRatioFor(width: number, height: number, maxSide: number, scale: number) {
  return Math.min(scale, maxSide / Math.max(width, height))
}

export async function exportGif(pages: ExportPage[], width: number, height: number, o: ExportOptions): Promise<ExportResult> {
  const { GIFEncoder, quantize, applyPalette } = await import('gifenc')
  const fps = Math.min(o.fps, 20)
  const plan = planFrames(pages, fps)
  const ratio = pixelRatioFor(width, height, MAX_GIF_SIDE, o.scale)
  const renderer = new PageRenderer()
  const gif = GIFEncoder()
  try {
    for (let i = 0; i < plan.length; i++) {
      checkAborted(o.signal)
      o.onProgress?.(i / plan.length, `Frame ${i + 1} of ${plan.length}`)
      const canvas = await renderer.render(plan[i]!.page, { width, height, pixelRatio: ratio, time: plan[i]!.time })
      const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data
      const palette = quantize(data, 256)
      gif.writeFrame(applyPalette(data, palette), canvas.width, canvas.height, { palette, delay: Math.round(1000 / fps) })
    }
    gif.finish()
    return { blob: new Blob([gif.bytes() as BlobPart], { type: 'image/gif' }), fileName: `${o.fileName}.gif`, pageCount: pages.length }
  } finally {
    renderer.dispose()
  }
}

const FFMPEG_BASE = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm'

export async function exportMp4(pages: ExportPage[], width: number, height: number, o: ExportOptions): Promise<ExportResult> {
  const fps = Math.min(o.fps, 30)
  const plan = planFrames(pages, fps)
  const ratio = pixelRatioFor(width, height, MAX_VIDEO_SIDE, o.scale)
  const renderer = new PageRenderer()
  try {
    o.onProgress?.(0, 'Loading video encoder')
    const [{ FFmpeg }, { toBlobURL }] = await Promise.all([import('@ffmpeg/ffmpeg'), import('@ffmpeg/util')])
    const ffmpeg = new FFmpeg()
    await ffmpeg.load({
      coreURL: await toBlobURL(`${FFMPEG_BASE}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${FFMPEG_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
    })
    for (let i = 0; i < plan.length; i++) {
      checkAborted(o.signal)
      o.onProgress?.((i / plan.length) * 0.8, `Frame ${i + 1} of ${plan.length}`)
      const canvas = await renderer.render(plan[i]!.page, { width, height, pixelRatio: ratio, time: plan[i]!.time })
      const blob = await canvasToBlob(canvas, 'image/jpeg', 0.92)
      await ffmpeg.writeFile(`f${String(i).padStart(5, '0')}.jpg`, new Uint8Array(await blob.arrayBuffer()))
    }
    o.onProgress?.(0.85, 'Encoding video')
    ffmpeg.on('progress', ({ progress }) => o.onProgress?.(0.85 + Math.min(1, Math.max(0, progress)) * 0.14, 'Encoding video'))
    await ffmpeg.exec(['-framerate', String(fps), '-i', 'f%05d.jpg', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast', '-movflags', '+faststart', 'out.mp4'])
    const data = (await ffmpeg.readFile('out.mp4')) as Uint8Array
    ffmpeg.terminate()
    return { blob: new Blob([data as BlobPart], { type: 'video/mp4' }), fileName: `${o.fileName}.mp4`, pageCount: pages.length }
  } finally {
    renderer.dispose()
  }
}
