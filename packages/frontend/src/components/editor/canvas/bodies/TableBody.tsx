import { Group, Rect, Text } from 'react-konva'
import type { TableData } from '@/models/design'

export function TableBody({ data: d }: { data: TableData }) {
  const cols = d.colWidths.length
  const nodes: React.ReactNode[] = []
  let y = 0
  d.cells.forEach((row, r) => {
    let x = 0
    const header = d.headerRow && r === 0
    for (let c = 0; c < cols; c++) {
      const w = d.colWidths[c] ?? 120
      nodes.push(
        <Group key={`${r}-${c}`} x={x} y={y}>
          <Rect width={w} height={d.rowHeight} fill={header ? d.headerFill : d.cellFill} stroke={d.borderColor} strokeWidth={1.5} />
          <Text
            x={12}
            width={w - 24}
            height={d.rowHeight}
            verticalAlign="middle"
            text={row[c] ?? ''}
            fontSize={d.fontSize}
            fontFamily={d.fontFamily}
            fontStyle={header ? '700' : '400'}
            fill={header ? d.headerText : d.cellText}
            wrap="none"
            ellipsis
            listening={false}
          />
        </Group>,
      )
      x += w
    }
    y += d.rowHeight
  })
  return <Group>{nodes}</Group>
}
