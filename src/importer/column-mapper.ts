// ============================================================
// Open-Balance Importer: Column Mapper
//
// Smart column name matching for generic CSV/Excel imports.
// Given a set of header column names, auto-suggests which
// column maps to which Asset field.
// ============================================================

import type { ColumnMap } from './types'

// --- Candidate column names per field (case-insensitive) ---

const NAME_CANDIDATES = [
  'name', '名称', '资产名称', '产品名称', '标的', '名称/标的',
  'item', 'product', 'asset',
]

const CATEGORY_CANDIDATES = [
  'category', '分类', '大类', '资产分类', '资产大类', '类别', '类型',
  'type', 'class',
]

const SUB_CATEGORY_CANDIDATES = [
  '子类', '子分类', 'subcategory', 'sub_category', 'sub category',
  '二级分类', '品种',
]

const AMOUNT_CANDIDATES = [
  'amount', '金额', '市值', 'market value', '市场价值', '余额', '当前市值',
  'value', '价值', '¥', '元', 'balance', '余额(元)', '金额(元)',
  '可用余额', '总资产', '持有市值',
]

const CURRENCY_CANDIDATES = [
  'currency', '币种', '货币', '币别', 'ccy',
]

const INSTITUTION_CANDIDATES = [
  'institution', '机构', '持有机构', '银行', '券商', '平台', '渠道',
  'heldat', 'held_at', 'held at', '账户', '来源',
  'bank', 'broker', 'platform',
]

const NOTES_CANDIDATES = [
  'notes', '备注', '说明', 'remark', 'note', 'comment', '描述', 'description',
]

// --- Smart auto-map ---

export function autoMapColumns(headers: string[]): ColumnMap {
  const lower = headers.map((h) => h.trim().toLowerCase())
  const original = headers.map((h) => h.trim())

  function findBest(candidates: string[]): string | null {
    // Try exact match first
    for (const c of candidates) {
      const idx = lower.indexOf(c.toLowerCase())
      if (idx >= 0) return original[idx]
    }
    // Try includes match
    for (let i = 0; i < lower.length; i++) {
      for (const c of candidates) {
        if (lower[i].includes(c.toLowerCase())) {
          return original[i]
        }
      }
    }
    return null
  }

  return {
    nameCol: findBest(NAME_CANDIDATES),
    categoryCol: findBest(CATEGORY_CANDIDATES),
    subCategoryCol: findBest(SUB_CATEGORY_CANDIDATES),
    amountCol: findBest(AMOUNT_CANDIDATES),
    currencyCol: findBest(CURRENCY_CANDIDATES),
    institutionCol: findBest(INSTITUTION_CANDIDATES),
    notesCol: findBest(NOTES_CANDIDATES),
  }
}

/**
 * Return all header options for a dropdown selector.
 */
export function headerOptions(headers: string[]): { value: string; label: string }[] {
  return [
    { value: '', label: '— 不映射 —' },
    ...headers.map((h) => ({ value: h, label: h })),
  ]
}

/**
 * Field definitions for rendering the column mapping UI.
 */
export const COLUMN_FIELDS: { key: keyof ColumnMap; label: string; required: boolean }[] = [
  { key: 'nameCol', label: '资产名称列', required: true },
  { key: 'amountCol', label: '金额/市值列', required: true },
  { key: 'categoryCol', label: '大类列', required: false },
  { key: 'subCategoryCol', label: '子类列', required: false },
  { key: 'currencyCol', label: '币种列', required: false },
  { key: 'institutionCol', label: '持有机构列', required: false },
  { key: 'notesCol', label: '备注列', required: false },
]
