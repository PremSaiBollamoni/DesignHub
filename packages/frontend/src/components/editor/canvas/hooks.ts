import { useEffect, useState } from 'react'
import { loadImage, svgToDataUrl, tintSvg } from '@/services/render/imageCache'

export function useLoadedImage(src: string | undefined): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  useEffect(() => {
    if (!src) {
      setImg(null)
      return
    }
    let live = true
    loadImage(src)
      .then((i) => live && setImg(i))
      .catch(() => live && setImg(null))
    return () => {
      live = false
    }
  }, [src])
  return img
}

export function useSvgImage(svg: string, color: string): HTMLImageElement | null {
  return useLoadedImage(svg ? svgToDataUrl(tintSvg(svg, color)) : undefined)
}
