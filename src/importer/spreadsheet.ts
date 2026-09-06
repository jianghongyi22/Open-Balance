// ============================================================
// Open-Balance Importer: Spreadsheet Abstraction
//
// 解析 CSV / XLS / XLSX 为统一的二维行结构，供各格式解析器使用。
// - CSV：自实现 RFC4180 解析（支持引号、转义引号、BOM、CRLF），
//   编码由 decodeText 前置处理（UTF-8 优先，GBK 兜底）
// - XLS/XLSX：exceljs（替换停止维护的 SheetJS xlsx）
// ============================================================

import ExcelJS from 'exceljs'
import { Buffer } from 'buffer'

// --- 统一结构 ---

export interface ParsedSheet {
  name: string
  rows: unknown[][]
}

export interface ParsedWorkbook {
  sheets: ParsedSheet[]
}

/** 取第一个工作表的所有行（含表头行） */
export function getSheetRows(
  workbook: ParsedWorkbook,
  sheetIndex = 0
): unknown[][] {
  return workbook.sheets[sheetIndex]?.rows ?? []
}

// --- CSV 解析（RFC4180 简化实现） ---

/**
 * 解析 CSV 文本为二维数组。
 * 支持：双引号字段、""转义引号、字段内逗号/换行、UTF-8 BOM、CRLF。
 */
export function parseCSV(text: string): string[][] {
  // 去除 BOM
  const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      // CRLF 视为一个换行
      if (ch === '\r' && clean[i + 1] === '\n') i++
      row.push(field)
      // 跳过纯空行（连续逗号产生的空字段行除外）
      if (row.length > 0 && !(row.length === 1 && row[0] === '')) {
        rows.push(row)
      }
      row = []
      field = ''
    } else {
      field += ch
    }
  }
  // 收尾
  if (field !== '' || row.length > 0) {
    row.push(field)
    if (!(row.length === 1 && row[0] === '')) {
      rows.push(row)
    }
  }

  return rows
}

// --- exceljs 单元格归一化 ---

/**
 * exceljs 单元格值归一化为基础类型：
 * Date 保留 Date（由 toDateStr/parseDateToMs 处理）、
 * 富文本/公式对象取可读值、null → ''。
 */
export function normalizeCell(value: unknown): unknown {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (typeof obj.result === 'number' || typeof obj.result === 'string') {
      return obj.result // 公式单元格
    }
    if (Array.isArray(obj.richText)) {
      return obj.richText.map((t: { text?: string }) => t.text ?? '').join('')
    }
    if (typeof obj.text === 'string') return obj.text // 超链接
    if (obj.hyperlink) return String(obj.text ?? '')
    return String(obj)
  }
  return value
}

// --- 入口：字节 → 统一工作簿 ---

export async function parseSpreadsheetBytes(
  buffer: ArrayBuffer,
  fileName: string
): Promise<{ rawText: string; workbook: ParsedWorkbook | null }> {
  const ext = fileName.toLowerCase().split('.').pop() ?? ''
  const rawText = decodeText(buffer)

  if (!['csv', 'xls', 'xlsx'].includes(ext)) {
    return { rawText, workbook: null }
  }

  try {
    if (ext === 'csv') {
      return {
        rawText,
        workbook: { sheets: [{ name: 'Sheet1', rows: parseCSV(rawText) }] },
      }
    }

    // XLS / XLSX：exceljs 需要 Buffer
    const nodeBuffer = toNodeBuffer(buffer)
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(nodeBuffer as never)

    const sheets: ParsedSheet[] = wb.worksheets.map((ws) => {
      const rows: unknown[][] = []
      ws.eachRow({ includeEmpty: false }, (row) => {
        const values: unknown[] = []
        row.eachCell({ includeEmpty: false }, (cell) => {
          values[Number(cell.col) - 1] = normalizeCell(cell.value)
        })
        rows.push(values)
      })
      return { name: ws.name, rows }
    })

    return { rawText, workbook: { sheets } }
  } catch {
    return { rawText, workbook: null }
  }
}

// --- 辅助 ---

/** 解码字节：UTF-8 优先，GBK 兜底（中文账单常见 GBK 编码） */
export function decodeText(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    try {
      return new TextDecoder('gbk').decode(buffer)
    } catch {
      return new TextDecoder('utf-8').decode(buffer)
    }
  }
}

/** ArrayBuffer → Node Buffer（exceljs 需要） */
function toNodeBuffer(buffer: ArrayBuffer): Buffer {
  return Buffer.from(buffer)
}
