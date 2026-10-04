// ============================================================
// Open-Balance Importer: Format Detector
//
// Auto-detects the format of an imported file by examining
// headers, filename patterns, and structural signatures.
// ============================================================

import type { ImportFormat } from './types'

export interface SheetHeaders {
  sheetName: string
  headers: string[]
  rowCount: number
}

/** Column names of the first 5 data rows (used to detect tables whose
 *  header row isn't row 0, e.g. WeChat bills with a title line). */
export interface SheetPreview {
  firstRowValues: string[]
}

/**
 * Detect the format of a file given:
 * - sheetHeaders: parsed header rows from xlsx
 * - fileName: original filename
 * - rawText: first ~2KB of file as text (for JSON/text detection)
 */
export function detectFormat(
  sheetHeaders: SheetHeaders[],
  fileName: string,
  rawText: string,
  sheetPreview?: SheetPreview
): ImportFormat {
  const ext = fileName.toLowerCase().split('.').pop() ?? ''
  const baseName = fileName.toLowerCase()
  const allHeadersStr = sheetHeaders.map((s) => s.headers.join(',')).join(';')
  // Some exports (WeChat) have a title row before the header row —
  // include the first data row's values in the signature text.
  const previewStr = sheetPreview ? sheetPreview.firstRowValues.join(',') : ''

  // 1. Open-Balance JSON
  if (ext === 'json') {
    if (rawText.includes('"assets"') || rawText.includes('"profile"')) {
      return 'open-balance-json'
    }
  }

  // 2. WeChat bill
  if (allHeadersStr.includes('微信支付') || rawText.includes('微信支付账单')) {
    return 'wechat'
  }
  const wechatCols = ['交易时间', '交易类型', '交易对方', '金额(元)', '收/支']
  if (wechatCols.filter((c) => allHeadersStr.includes(c) || previewStr.includes(c)).length >= 4) {
    return 'wechat'
  }

  // 3. Alipay bill
  if (rawText.includes('支付宝') && allHeadersStr.includes('交易时间')) {
    return 'alipay'
  }
  const alipayCols = ['交易时间', '交易分类', '交易对方', '收/支']
  if (alipayCols.filter((c) => allHeadersStr.includes(c) || previewStr.includes(c)).length >= 3) {
    return 'alipay'
  }

  // 4. Suishouji (随手记)
  if (baseName.includes('随手记') || baseName.includes('suishouji')) {
    return 'suishouji'
  }
  const sszCols = ['分类', '类型', '金额', '账户']
  if (sszCols.filter((c) => allHeadersStr.includes(c)).length >= 3) {
    return 'suishouji'
  }
  // Another common suishouji pattern: 日期, 类别, 金额, 账户1
  // 收紧条件：必须同时出现 类别+账户1（"金额"太通用，单独出现易误判）
  const sszCols2 = ['类别', '账户1']
  if (sszCols2.filter((c) => allHeadersStr.includes(c)).length >= 2) {
    return 'suishouji'
  }

  // 5. Bank statement
  const bankHeaders = ['交易日期', '摘要', '收入', '支出', '余额']
  const bankHeaders2 = ['记账日期', '交易摘要', '借方金额', '贷方金额']
  const bankHeaders3 = ['交易时间', '交易摘要', '交易金额', '余额']
  if (
    bankHeaders.filter((c) => allHeadersStr.includes(c)).length >= 4 ||
    bankHeaders2.filter((c) => allHeadersStr.includes(c)).length >= 3 ||
    bankHeaders3.filter((c) => allHeadersStr.includes(c)).length >= 3
  ) {
    return 'bank-generic'
  }
  // Bank-name hints alone are NOT enough — they'd misfire on generic
  // asset lists that happen to mention 招商银行 in an institution
  // column (e.g. test-data/generic-assets.csv).

  // 6. Generic CSV/Excel fallback
  if (ext === 'csv' || ext === 'xls' || ext === 'xlsx') {
    return 'csv-generic'
  }

  // Ultimate fallback
  return 'csv-generic'
}

/**
 * Generate a human-readable summary of detected format info.
 */
export function formatSummary(
  format: ImportFormat,
  headers: string[],
  _fileName: string
): string {
  switch (format) {
    case 'open-balance-json':
      return '检测到 Open-Balance JSON 备份文件'
    case 'wechat':
      return '检测到微信支付账单导出文件'
    case 'alipay':
      return '检测到支付宝账单导出文件'
    case 'suishouji':
      return '检测到随手记账单导出文件'
    case 'bank-generic':
      return '检测到银行流水文件'
    case 'csv-generic':
      return `检测到通用表格文件 (列: ${headers.slice(0, 5).join(', ')}${headers.length > 5 ? '...' : ''})`
  }
}
