export type CsvValue = string | number | null | undefined

function csvCell(value: CsvValue) {
  const text = value == null ? "" : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

/** 在浏览器里生成并下载 CSV。带 BOM，Excel 直接打开不乱码。 */
export function downloadCsv(rows: CsvValue[][], filename: string) {
  const csv = "﻿" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n")
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
