import { useEffect, useRef, useState } from 'react'
import { Group, Image as KImage, Rect, Text } from 'react-konva'
import Konva from 'konva'
import type { VideoData } from '@/models/design'
import { loadVideoFrame } from '@/services/render/imageCache'
import { mediaRegistry } from './mediaRegistry'

interface Props {
  id: string
  data: VideoData
  autoplay: boolean
  /** Seconds into the page. When set, a still frame is drawn instead of live playback (exports). */
  seekTo?: number | null
}

function Placeholder({ d, label }: { d: VideoData; label: string }) {
  return (
    <Group>
      <Rect width={d.width} height={d.height} fill="#151515" />
      <Text width={d.width} height={d.height} align="center" verticalAlign="middle" text={label} fill="#B4B7BE" fontSize={Math.max(14, d.height * 0.06)} fontFamily="Inter Tight" listening={false} />
    </Group>
  )
}

function VideoStill({ data: d, seekTo }: { data: VideoData; seekTo: number }) {
  const [frame, setFrame] = useState<HTMLCanvasElement | null>(null)
  useEffect(() => {
    let live = true
    loadVideoFrame(d.src, seekTo + (d.trimStart ?? 0))
      .then((c) => live && setFrame(c))
      .catch(() => live && setFrame(null))
    return () => {
      live = false
    }
  }, [d.src, seekTo, d.trimStart])
  if (!frame) return <Placeholder d={d} label="Video" />
  return <KImage image={frame} width={d.width} height={d.height} />
}

function VideoLive({ id, data: d, autoplay }: { id: string; data: VideoData; autoplay: boolean }) {
  const [video, setVideo] = useState<HTMLVideoElement | null>(null)
  const ref = useRef<Konva.Image>(null)

  useEffect(() => {
    const v = document.createElement('video')
    v.crossOrigin = 'anonymous'
    v.src = d.src
    v.muted = d.muted
    v.loop = d.loop
    v.playsInline = true
    v.preload = 'auto'
    const ready = () => setVideo(v)
    v.addEventListener('loadeddata', ready)
    mediaRegistry.set(id, v)
    return () => {
      v.removeEventListener('loadeddata', ready)
      v.pause()
      v.removeAttribute('src')
      v.load()
      mediaRegistry.delete(id, v)
      setVideo(null)
    }
  }, [id, d.src]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!video) return
    video.muted = d.muted
    video.loop = d.loop
  }, [video, d.muted, d.loop])

  // Honour the trim window: start at the in point and loop or stop at the out point.
  useEffect(() => {
    if (!video) return
    const start = d.trimStart ?? 0
    const end = d.trimEnd
    if (video.currentTime < start) video.currentTime = start
    const onTime = () => {
      if (end && video.currentTime >= end) {
        if (d.loop) video.currentTime = start
        else video.pause()
      }
    }
    video.addEventListener('timeupdate', onTime)
    return () => video.removeEventListener('timeupdate', onTime)
  }, [video, d.trimStart, d.trimEnd, d.loop])

  useEffect(() => {
    if (video && autoplay) void video.play().catch(() => undefined)
    return () => video?.pause()
  }, [video, autoplay])

  // Keep repainting while the clip plays, otherwise Konva would only show the first frame.
  useEffect(() => {
    const node = ref.current
    const layer = node?.getLayer()
    if (!video || !layer) return
    const anim = new Konva.Animation(() => !video.paused, layer)
    anim.start()
    return () => {
      anim.stop()
    }
  }, [video])

  if (!video) return <Placeholder d={d} label="Loading video…" />
  return <KImage ref={ref} image={video} width={d.width} height={d.height} />
}

export function VideoBody({ id, data, autoplay, seekTo }: Props) {
  return seekTo != null ? <VideoStill data={data} seekTo={seekTo} /> : <VideoLive id={id} data={data} autoplay={autoplay} />
}
