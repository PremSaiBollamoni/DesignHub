/** Shared image loading so every node, exporter and thumbnail reuses one decoded bitmap per URL. */
const cache = new Map<string, Promise<HTMLImageElement>>()
let pending = 0
const idleWaiters = new Set<() => void>()

function settle() {
  pending = Math.max(0, pending - 1)
  if (pending === 0) {
    idleWaiters.forEach((w) => w())
    idleWaiters.clear()
  }
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  let p = cache.get(src)
  if (!p) {
    pending++
    p = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      if (!src.startsWith('data:') && !src.startsWith('blob:')) img.crossOrigin = 'anonymous'
      img.decoding = 'async'
      img.onload = () => {
        settle()
        resolve(img)
      }
      img.onerror = () => {
        settle()
        cache.delete(src)
        reject(new Error(`Could not load image ${src.slice(0, 80)}`))
      }
      img.src = src
    })
    p.catch(() => undefined)
    cache.set(src, p)
  }
  return p
}

const frameCache = new Map<string, Promise<HTMLCanvasElement>>()

/** Grabs one decoded frame of a video as a canvas (used by exports, where playback cannot be relied on). */
export function loadVideoFrame(src: string, seconds: number): Promise<HTMLCanvasElement> {
  const key = `${src}@${seconds.toFixed(2)}`
  let p = frameCache.get(key)
  if (!p) {
    pending++
    p = new Promise<HTMLCanvasElement>((resolve, reject) => {
      const v = document.createElement('video')
      v.crossOrigin = 'anonymous'
      v.muted = true
      v.preload = 'auto'
      v.src = src
      const fail = () => {
        settle()
        frameCache.delete(key)
        reject(new Error('The video frame could not be read'))
      }
      v.onerror = fail
      v.onloadedmetadata = () => {
        const t = v.duration && isFinite(v.duration) ? seconds % v.duration : 0
        v.onseeked = () => {
          const c = document.createElement('canvas')
          c.width = v.videoWidth
          c.height = v.videoHeight
          c.getContext('2d')!.drawImage(v, 0, 0)
          settle()
          resolve(c)
        }
        v.currentTime = t
      }
    })
    p.catch(() => undefined)
    frameCache.set(key, p)
  }
  return p
}

/** Resolves when no image is mid-load. Exporters await this before reading pixels. */
export function whenImagesIdle(timeoutMs = 15000): Promise<void> {
  if (pending === 0) return Promise.resolve()
  return new Promise((resolve) => {
    const t = setTimeout(resolve, timeoutMs)
    idleWaiters.add(() => {
      clearTimeout(t)
      resolve()
    })
  })
}

export function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/** Replaces the colour of simple single-colour SVG icons (stroke or fill) with the chosen one. */
export function tintSvg(svg: string, color: string): string {
  return svg.replace(/currentColor/g, color)
}
