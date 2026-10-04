import { useEffect } from 'react'
import { Circle, Group, Line, Rect, Text } from 'react-konva'
import type { AudioData } from '@/models/design'
import { mediaRegistry } from './mediaRegistry'

export function AudioBody({ id, data: d, interactive }: { id: string; data: AudioData; interactive: boolean }) {
  useEffect(() => {
    const a = new Audio(d.src)
    a.preload = 'metadata'
    a.loop = d.loop
    a.volume = d.volume
    mediaRegistry.set(id, a)
    return () => {
      a.pause()
      mediaRegistry.delete(id, a)
    }
  }, [id, d.src]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const a = mediaRegistry.get(id)
    if (a) {
      a.loop = d.loop
      a.volume = d.volume
    }
  }, [id, d.loop, d.volume])

  const h = d.height
  return (
    <Group>
      <Rect width={d.width} height={h} fill="#151515" cornerRadius={h / 2} />
      <Group
        x={h / 2}
        y={h / 2}
        onClick={() => interactive && mediaRegistry.toggle(id)}
        onTap={() => interactive && mediaRegistry.toggle(id)}
      >
        <Circle radius={h * 0.32} fill="#FF5A36" />
        <Line points={[-h * 0.1, -h * 0.16, h * 0.18, 0, -h * 0.1, h * 0.16]} closed fill="#fff" />
      </Group>
      <Text x={h * 0.98} y={0} width={d.width - h * 1.2} height={h} verticalAlign="middle" text={d.title} fill="#F6F5F2" fontSize={h * 0.26} fontFamily="Inter Tight" fontStyle="600" ellipsis wrap="none" listening={false} />
    </Group>
  )
}
