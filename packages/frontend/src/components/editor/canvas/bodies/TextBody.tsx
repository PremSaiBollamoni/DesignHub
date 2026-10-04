import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Group, Rect, Text, TextPath } from 'react-konva'
import Konva from 'konva'
import type { TextData } from '@/models/design'
import { useEditorStore } from '@/stores/editorStore'
import { loadFont } from '@/services/assets/fonts'

interface Props {
  id: string
  data: TextData
  /** Edit mode measures laid-out height and stores it so selection boxes hug the text. */
  measure: boolean
  hidden?: boolean
}

/** The words as displayed: capitals and list markers are presentation only, the stored text stays as typed. */
export function displayText(d: Pick<TextData, 'text' | 'uppercase' | 'list'>): string {
  const base = d.uppercase ? d.text.toUpperCase() : d.text
  if (!d.list) return base
  let n = 0
  return base
    .split('\n')
    .map((line) => (line.trim() ? (d.list === 'bullet' ? `•  ${line}` : `${++n}.  ${line}`) : line))
    .join('\n')
}

/** Arc geometry for text that follows a curve. The arc is exactly as long as the text, so nothing is clipped or stretched. */
export function arcFor(length: number, curve: number, fontSize: number) {
  const theta = Math.max(0.05, (Math.abs(curve) / 100) * Math.PI * 1.6)
  const r = length / theta
  const chord = 2 * r * Math.sin(theta / 2)
  const sagitta = r * (1 - Math.cos(theta / 2))
  const up = curve > 0
  const base = fontSize * 1.05 + (up ? sagitta : 0)
  const x0 = 0
  const path = `M ${x0} ${base} A ${r} ${r} 0 ${theta > Math.PI ? 1 : 0} ${up ? 1 : 0} ${chord} ${base}`
  return { path, chord, height: fontSize * 1.4 + sagitta }
}

export function TextBody({ id, data, measure, hidden }: Props) {
  const ref = useRef<Konva.Text>(null)
  const [fontReady, setFontReady] = useState(0)

  useEffect(() => {
    let live = true
    void loadFont(data.fontFamily, [data.fontWeight], !!data.italic).then(() => {
      if (live) setFontReady((n) => n + 1)
    })
    return () => {
      live = false
    }
  }, [data.fontFamily, data.fontWeight, data.italic])

  const content = displayText(data)
  const style = `${data.italic ? 'italic ' : ''}${data.fontWeight}`
  const curved = !!data.curve

  const arc = useMemo(() => {
    if (!curved) return null
    const probe = new Konva.Text({ text: content.replace(/\n/g, ' '), fontFamily: data.fontFamily, fontSize: data.fontSize, fontStyle: style, letterSpacing: data.letterSpacing })
    const length = probe.width() || data.fontSize * 4
    probe.destroy()
    return { ...arcFor(length, data.curve!, data.fontSize), length }
  }, [curved, content, data.fontFamily, data.fontSize, style, data.letterSpacing, data.curve, fontReady])

  useLayoutEffect(() => {
    if (!measure) return
    const h = Math.ceil(curved ? (arc?.height ?? data.height) : (ref.current?.height() ?? data.height))
    if (Math.abs(h - data.height) > 1) useEditorStore.getState().patchSilently(id, { height: h })
    ref.current?.getLayer()?.batchDraw()
  }, [id, measure, content, curved, arc?.height, data.fontSize, data.fontFamily, data.fontWeight, data.width, data.lineHeight, data.letterSpacing, data.height, fontReady])

  const decoration = [data.underline && 'underline', data.strike && 'line-through'].filter(Boolean).join(' ')

  if (curved && arc) {
    return (
      <Group visible={!hidden} x={(data.width - arc.chord) / 2}>
        <TextPath
          text={content.replace(/\n/g, ' ')}
          data={arc.path}
          fontFamily={data.fontFamily}
          fontSize={data.fontSize}
          fontStyle={style}
          fill={data.fill}
          letterSpacing={data.letterSpacing}
          stroke={data.stroke}
          strokeWidth={data.strokeWidth ?? 0}
        />
      </Group>
    )
  }

  return (
    <Group visible={!hidden}>
      {data.background && <Rect width={data.width} height={data.height} fill={data.background} />}
      <Text
        ref={ref}
        text={content}
        width={data.width}
        fontFamily={data.fontFamily}
        fontSize={data.fontSize}
        fontStyle={style}
        fill={data.fill}
        align={data.align}
        lineHeight={data.lineHeight}
        letterSpacing={data.letterSpacing}
        textDecoration={decoration}
        stroke={data.stroke}
        strokeWidth={data.strokeWidth ?? 0}
        fillAfterStrokeEnabled
        wrap="word"
      />
    </Group>
  )
}
