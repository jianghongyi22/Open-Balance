// ============================================================
// Open-Balance Importer: Unified Entrance
//
// detectAndImport(file) → { format, result, rawText }
//
// The core pipeline is exposed as `processImport()` so tests can
// feed it a parsed workbook + raw text without browser File APIs.
// ============================================================

import { detectFormat } from './detector'
import { openBalanceJsonParser } from './parsers/json'
import { wechatParser } from './parsers/wechat'
import { alipayParser } from './parsers/alipay'
import { suishoujiParser } from './parsers/suishouji'
import { bankFlowParser } from './parsers/bank-flow'
import { csvGenericParser } from './parsers/csv-generic'
import { parseSpreadsheetBytes, getSheetRows } from './spreadsheet'
import type { ParsedWorkbook } from './spreadsheet'
import type { ImportFormat, ImportResult, FormatParser } from './types'

const PARSERS: FormatParser[] = [
  openBalanceJsonParser,
  wechatParser,
  alipayParser,
  suishoujiParser,
  bankFlowParser,
  csvGenericParser,
]

export interface ProcessImportInput {
  fileName: string
  rawText: string
  workbook: ParsedWorkbook | null
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
    sheetHeaders = workbook.sheets.map((s) => ({
      sheetName: s.name,
      headers: s.rows.length > 0 ? s.rows[0].map((h) => String(h)) : [],
      rowCount: s.rows.length,
    }))
    const firstRows = getSheetRows(workbook)
    sheetPreview = {
      firstRowValues: (firstRows[1] ?? []).map((c) => String(c)),
    }
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
  const { rawText, workbook } = await parseSpreadsheetBytes(buffer, fileName)

  const { format, result } = processImport({ fileName, rawText, workbook })
  return { format, result, rawText }
}

/**
 * Re-parse a workbook with a specific column mapping (for csv-generic).
 */
export function importWithColumnMap(
  workbook: ParsedWorkbook,
  _columnMap: unknown,
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
export { transactionsToAssets, detectLiabilities, extractIssuer } from './converter'
export { autoMapColumns, COLUMN_FIELDS, headerOptions } from './column-mapper'
export { IMPORT_FORMAT_LABELS } from './types'
export { parseSpreadsheetBytes, parseCSV, getSheetRows, decodeText } from './spreadsheet'
export type { ParsedWorkbook, ParsedSheet } from './spreadsheet'
export type { ImportFormat, ImportResult, RawTransaction, ColumnMap, ImportStats } from './types'
