// ============================================================
// Open-Balance Importer: Core Types
// ============================================================

import type { Asset, AssetCategory, Liquidity, RiskLevel } from '../types'

// --- Format ---

export type ImportFormat =
  | 'open-balance-json'
  | 'suishouji'
  | 'wechat'
  | 'alipay'
  | 'bank-generic'
  | 'csv-generic'

export const IMPORT_FORMAT_LABELS: Record<ImportFormat, string> = {
  'open-balance-json': 'Open-Balance 备份',
  suishouji: '随手记',
  wechat: '微信支付账单',
  alipay: '支付宝账单',
  'bank-generic': '银行流水',
  'csv-generic': '通用 CSV/Excel',
}

// --- Raw Transaction (intermediate representation) ---

export interface RawTransaction {
  date: string           // ISO date string
  type: 'income' | 'expense' | 'transfer'
  amount: number         // absolute value
  originalCategory: string
  description: string
  counterparty: string
  paymentMethod: string
  source: string         // e.g., "招商银行", "微信", "支付宝"
}

// --- Column Mapping (for csv-generic) ---

export interface ColumnMap {
  nameCol: string | null        // 资产名称
  categoryCol: string | null    // 大类
  subCategoryCol: string | null // 子类
  amountCol: string | null      // 金额
  currencyCol: string | null    // 币种
  institutionCol: string | null // 持有机构
  notesCol: string | null       // 备注
}

// --- Import Result ---

export interface ImportResult {
  format: ImportFormat
  assets: Asset[]
  transactions: RawTransaction[]
  warnings: string[]
  stats: ImportStats
  /** Optional payload from specific parsers (e.g. liabilities/profile
   *  from an Open-Balance backup). */
  extras?: unknown
}

export interface ImportStats {
  totalTransactions: number
  totalIncome: number
  totalExpense: number
  periodStart: string | null
  periodEnd: string | null
  detectedInstitutions: string[]
}

// --- Parser interface ---

export interface FormatParser {
  format: ImportFormat
  /** Try to parse a parsed workbook. Return null if this parser can't handle it. */
  parseWorkbook(workbook: import('./spreadsheet').ParsedWorkbook, fileName: string): ImportResult | null
  /** Try to parse raw text. Return null if this parser can't handle it. */
  parseText?(text: string, fileName: string): ImportResult | null
}

// --- Category mapping (from source categories to Open-Balance categories) ---

export interface CategoryMapping {
  sourceCategory: string
  targetCategory: AssetCategory
  targetSubCategory?: string
  confidence: number  // 0-1
}

// --- Institution recognition ---

export interface InstitutionInfo {
  name: string
  category: AssetCategory
  subCategory?: string
  liquidity: Liquidity
  riskLevel: RiskLevel
}
