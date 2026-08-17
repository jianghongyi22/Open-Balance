// ============================================================
// Open-Balance Importer: Unified Entrance
//
// detectAndImport(file) → { format, result, rawText }
//
// The core pipeline is exposed as `processImport()` so tests can
// feed it a workbook + raw text without browser File APIs.
// ============================================================

import * as XLSX from 'xlsx'
import { detectFormat } from './detector'
import { openBalanceJsonParser } from './parsers/json'
import { wechatParser } from './parsers/wechat'
import { alipayParser } from './parsers/alipay'
import { suishoujiParser } from './parsers/suishouji'
import { bankFlowParser } from './parsers/bank-flow'
import { csvGenericParser } from './parsers/csv-generic'
import type { ImportFormat, ImportResult, FormatParser } from './types'

const SHEETJS = XLSX

const PARSERS: FormatParser[] = [
  openBalanceJsonParser,
  wechatParser,
  alipayParser,
  suishoujiParser,
  bankFlowParser,
  csvGenericParser,
]

/**
 * Decode a byte buffer to text: UTF-8 first, GBK fallback.
 * Chinese bank/accounting exports are frequently GBK-encoded.
 */
export function decodeText(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    try {
      return new TextDecoder('gbk').decode(buffer)
    } catch {
      // Last resort: latin-1 never throws, so at least we get something
      return new TextDecoder('utf-8').decode(buffer)
    }
  }
}

/**
 * Parse spreadsheet bytes into { rawText, workbook }.
 *
 * CSV is decoded to text first (UTF-8/GBK) and parsed with raw: true
 * so date strings & IDs stay strings. XLS/XLSX are binary and go
 * straight to XLSX.read — dates there come back as Excel serial
 * numbers, which `toDateStr` handles.
 */
export function parseSpreadsheetBytes(
  buffer: ArrayBuffer,
  fileName: string
): { rawText: string; workbook: any } {
  const ext = fileName.toLowerCase().split('.').pop() ?? ''
  const rawText = decodeText(buffer)

  if (!['csv', 'xls', 'xlsx'].includes(ext)) {
    return { rawText, workbook: null }
  }

  let workbook: any = null
  try {
    if (ext === 'csv') {
      workbook = SHEETJS.read(rawText, { type: 'string', raw: true })
    } else {
      workbook = SHEETJS.read(buffer, { type: 'array' })
    }
  } catch {
    workbook = null
  }

  return { rawText, workbook }
}

export interface ProcessImportInput {
  fileName: string
  rawText: string
  workbook: any // XLSX.WorkBook, or null for non-spreadsheet files
}

/**
 * Core import pipeline: detect format → parse → fallbacks.
 * Pure function of (fileName, rawText, workbook).
 */
export function processImport(input: ProcessImportInput): {
  format: ImportFormat
  result: ImportResult
} {
  const { fileName, rawText, workbook } = input

  // Get header info for detection
  let sheetHeaders: { sheetName: string; headers: string[]; rowCount: number }[] = []
  let sheetPreview: { firstRowValues: string[] } | undefined

  if (workbook) {
    sheetHeaders = workbook.SheetNames.map((name: string) => {
      const sheet = workbook.Sheets[name]
      const rows: any[][] = SHEETJS.utils.sheet_to_json(sheet, { header: 1, defval: '' })
      return {
        sheetName: name,
        headers: rows.length > 0 ? (rows[0] as string[]).map((h) => String(h)) : [],
        rowCount: rows.length,
      }
    })
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
    const firstRows: any[][] = SHEETJS.utils.sheet_to_json(firstSheet, { header: 1, defval: '', range: 1 })
    sheetPreview = { firstRowValues: (firstRows[0] ?? []).map((c) => String(c)) }
  }

  // Detect format
  const format = detectFormat(sheetHeaders, fileName, rawText, sheetPreview)

  // Try parsers: first try the detected format's parser, then fallback to others
  let result: ImportResult | null = null

  // Try specific parser for detected format
  const specificParser = PARSERS.find((p) => p.format === format)
  if (specificParser) {
    if (workbook) {
      result = specificParser.parseWorkbook(workbook, fileName)
    }
    if (!result && specificParser.parseText) {
      result = specificParser.parseText(rawText, fileName)
    }
  }

  // Fallback: try all parsers
  if (!result) {
    for (const parser of PARSERS) {
      if (parser.format === format) continue // already tried

      if (workbook) {
        result = parser.parseWorkbook(workbook, fileName)
      }
      if (!result && parser.parseText) {
        result = parser.parseText(rawText, fileName)
      }
      if (result) break
    }
  }

  // Ultimate fallback: generic CSV parser with workbook
  if (!result && workbook) {
    result = csvGenericParser.parseWorkbook(workbook, fileName)
  }

  if (!result) {
    result = {
      format: 'csv-generic',
      assets: [],
      transactions: [],
      warnings: ['无法解析该文件，请确认文件格式正确。如为CSV/Excel文件，请检查列名和编码。'],
      stats: { totalTransactions: 0, totalIncome: 0, totalExpense: 0, periodStart: null, periodEnd: null, detectedInstitutions: [] },
    }
  }

  return { format, result }
}

/**
 * Parse a file and auto-detect its format.
 * Returns the detected format, parsed result, and the raw text for preview.
 */
export async function detectAndImport(file: File): Promise<{
  format: ImportFormat
  result: ImportResult
  rawText: string
}> {
  const fileName = file.name
  const buffer = await readFileAsArrayBuffer(file)
  const { rawText, workbook } = parseSpreadsheetBytes(buffer, fileName)

  const { format, result } = processImport({ fileName, rawText, workbook })
  return { format, result, rawText }
}

/**
 * Re-parse a workbook with a specific column mapping (for csv-generic).
 */
export function importWithColumnMap(
  workbook: any,
  _columnMap: any,
  fileName: string
): ImportResult {
  // csvGenericParser uses autoMapColumns internally;
  // for now we just call it directly
  return csvGenericParser.parseWorkbook(workbook, fileName) ?? {
    format: 'csv-generic',
    assets: [],
    transactions: [],
    warnings: ['列映射导入失败'],
    stats: { totalTransactions: 0, totalIncome: 0, totalExpense: 0, periodStart: null, periodEnd: null, detectedInstitutions: [] },
  }
}

// --- File Reading Helpers ---

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

// Re-export for convenience
export { detectFormat } from './detector'
export { transactionsToAssets, detectLiabilities } from './converter'
export { autoMapColumns, COLUMN_FIELDS, headerOptions } from './column-mapper'
export { IMPORT_FORMAT_LABELS } from './types'
export type { ImportFormat, ImportResult, RawTransaction, ColumnMap, ImportStats } from './types'
