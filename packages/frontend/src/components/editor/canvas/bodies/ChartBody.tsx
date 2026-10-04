import { Arc, Group, Line, Rect, Text, Wedge } from 'react-konva'
import type { ChartData } from '@/models/design'

function color(d: ChartData, i: number) {
  return d.colors[i % d.colors.length] ?? '#FF5A36'
}

function fmt(v: number) {
  return Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v * 10) / 10)
}

/** Charts are drawn with plain Konva shapes, so they stay vector sharp at any export size. */
export function ChartBody({ data: d }: { data: ChartData }) {
  const series = d.series.length ? d.series : [{ label: '', value: 0 }]
  const max = Math.max(1, ...series.map((s) => Math.max(0, s.value)))
  const font = d.fontFamily
  const size = Math.max(12, Math.min(d.width, d.height) * 0.045)

  if (d.chart === 'pie' || d.chart === 'donut') {
    const total = series.reduce((s, x) => s + Math.max(0, x.value), 0) || 1
    const r = Math.min(d.width, d.height) / 2 - size * 1.6
    const cx = d.width / 2
    const cy = d.height / 2
    let angle = -90
    return (
      <Group>
        <Rect width={d.width} height={d.height} fill="rgba(0,0,0,0)" />
        {series.map((s, i) => {
          const sweep = (Math.max(0, s.value) / total) * 360
          const start = angle
          angle += sweep
          const mid = ((start + sweep / 2) * Math.PI) / 180
          const lx = cx + Math.cos(mid) * (r + size * 1.1)
          const ly = cy + Math.sin(mid) * (r + size * 1.1)
          return (
            <Group key={i}>
              {d.chart === 'donut' ? (
                <Arc x={cx} y={cy} innerRadius={r * 0.58} outerRadius={r} angle={sweep} rotation={start} fill={color(d, i)} />
              ) : (
                <Wedge x={cx} y={cy} radius={r} angle={sweep} rotation={start} fill={color(d, i)} />
              )}
              {d.showLabels && sweep > 8 && (
                <Text x={lx - 40} y={ly - size / 2} width={80} align="center" text={s.label} fontSize={size} fontFamily={font} fill={d.textColor} listening={false} />
              )}
            </Group>
          )
        })}
      </Group>
    )
  }

  const padL = size * 2.4
  const padB = size * 2
  const padT = size * 1.6
  const plotW = d.width - padL - size
  const plotH = d.height - padB - padT
  const step = plotW / series.length
  const y = (v: number) => padT + plotH - (Math.max(0, v) / max) * plotH

  return (
    <Group>
      <Rect width={d.width} height={d.height} fill="rgba(0,0,0,0)" />
      {[0, 0.5, 1].map((t) => (
        <Group key={t}>
          <Line points={[padL, padT + plotH * (1 - t), padL + plotW, padT + plotH * (1 - t)]} stroke={d.textColor} opacity={0.14} strokeWidth={1.5} />
          <Text x={0} y={padT + plotH * (1 - t) - size / 2} width={padL - 8} align="right" text={fmt(max * t)} fontSize={size * 0.8} fontFamily={font} fill={d.textColor} opacity={0.65} listening={false} />
        </Group>
      ))}
      {d.chart === 'bar' &&
        series.map((s, i) => {
          const bw = step * 0.62
          const bx = padL + step * i + (step - bw) / 2
          return (
            <Group key={i}>
              <Rect x={bx} y={y(s.value)} width={bw} height={padT + plotH - y(s.value)} fill={color(d, i)} cornerRadius={[6, 6, 0, 0]} />
              {d.showLabels && <Text x={bx - 20} y={y(s.value) - size * 1.25} width={bw + 40} align="center" text={fmt(s.value)} fontSize={size * 0.85} fontFamily={font} fill={d.textColor} listening={false} />}
            </Group>
          )
        })}
      {(d.chart === 'line' || d.chart === 'area') && (
        <Group>
          {d.chart === 'area' && (
            <Line
              points={[padL + step / 2, padT + plotH, ...series.flatMap((s, i) => [padL + step * i + step / 2, y(s.value)]), padL + step * (series.length - 1) + step / 2, padT + plotH]}
              closed
              fill={color(d, 0)}
              opacity={0.22}
            />
          )}
          <Line points={series.flatMap((s, i) => [padL + step * i + step / 2, y(s.value)])} stroke={color(d, 0)} strokeWidth={size * 0.22} lineJoin="round" lineCap="round" tension={0.25} />
          {series.map((s, i) => (
            <Group key={i}>
              <Rect x={padL + step * i + step / 2 - size * 0.3} y={y(s.value) - size * 0.3} width={size * 0.6} height={size * 0.6} cornerRadius={size} fill="#fff" stroke={color(d, 0)} strokeWidth={size * 0.16} />
              {d.showLabels && <Text x={padL + step * i} y={y(s.value) - size * 1.5} width={step} align="center" text={fmt(s.value)} fontSize={size * 0.85} fontFamily={font} fill={d.textColor} listening={false} />}
            </Group>
          ))}
        </Group>
      )}
      {series.map((s, i) => (
        <Text key={i} x={padL + step * i} y={padT + plotH + size * 0.5} width={step} align="center" text={s.label} fontSize={size * 0.85} fontFamily={font} fill={d.textColor} listening={false} ellipsis wrap="none" />
      ))}
    </Group>
  )
}
