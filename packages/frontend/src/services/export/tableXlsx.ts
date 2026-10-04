import { downloadBlob } from '@/utils/common'

/** Builds a real .xlsx from table cells. Header row is bolded; numbers stay numeric so formulas work in Excel. */
export async function exportTableXlsx(cells: string[][], name: string): Promise<void> {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const rows = cells.map((row, r) =>
    row.map((value) => {
      const n = Number(value)
      const isNum = value.trim() !== '' && Number.isFinite(n)
      return isNum ? { type: Number, value: n } : { type: String, value, fontWeight: r === 0 ? ('bold' as const) : undefined }
    }),
  )
  const blob = (await writeXlsxFile(rows as never, { sheet: 'Table' } as never)) as unknown as Blob
  downloadBlob(blob, `${name}.xlsx`)
}
