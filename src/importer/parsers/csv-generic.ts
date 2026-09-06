// ============================================================
// Open-Balance Importer: Generic CSV/Excel Parser
//
// Handles any tabular data with user-specified column mapping.
// Asset gets created from each row using the mapped columns.
// ============================================================

import { v4 as uuidv4 } from 'uuid'
import type { Asset, AssetCategory } from '../../types'
import { ASSET_CATEGORY_LABELS } from '../../types'
import type { ImportResult, ColumnMap, FormatParser } from '../types'
import { getSheetRows } from '../spreadsheet'
import type { ParsedWorkbook } from '../spreadsheet'
import { autoMapColumns } from '../column-mapper'
import { matchCategory } from '../converter'
import { CATEGORY_LIQUIDITY, CATEGORY_RISK_CLASS } from '../../data/marketParams'

export const csvGenericParser: FormatParser = {
  format: 'csv-generic',

  parseWorkbook(workbook: ParsedWorkbook, _fileName: string): ImportResult | null {
    const rows: unknown[][] = getSheetRows(workbook)

    if (rows.length < 2) return null

    const headers = (rows[0] as string[]).map((h: string) => String(h).trim())
    const columnMap = autoMapColumns(headers)

    // Need at minimum a name column or an amount column to proceed
    if (!columnMap.nameCol && !columnMap.amountCol) return null

    const assets: Asset[] = []
    const warnings: string[] = []

    // Build column index lookup
    const colIdx: Record<string, number> = {}
    headers.forEach((h, i) => { colIdx[h] = i })

    function getValue(colName: string | null, row: any[]): string {
      if (!colName || !(colName in colIdx)) return ''
      const idx = colIdx[colName]
      return String(row[idx] ?? '').trim()
    }

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      if (!row || row.length === 0) continue

      const nameStr = getValue(columnMap.nameCol, row)
      const amountStr = getValue(columnMap.amountCol, row).replace(/[,，\s¥$]/g, '')
      const categoryStr = getValue(columnMap.categoryCol, row)
      const subCategoryStr = getValue(columnMap.subCategoryCol, row)
      const currencyStr = getValue(columnMap.currencyCol, row)
      const institutionStr = getValue(columnMap.institutionCol, row)
      const notesStr = getValue(columnMap.notesCol, row)

      const amount = parseFloat(amountStr)
      if (!nameStr && isNaN(amount)) continue

      // Determine category
      let category: AssetCategory = 'other'
      let subCategory: string | undefined

      // 1) Direct category label match (e.g. "房地产")
      if (categoryStr) {
        const labelEntry = Object.entries(ASSET_CATEGORY_LABELS).find(
          ([, label]) => categoryStr.includes(label) || label.includes(categoryStr)
        )
        if (labelEntry) {
          category = labelEntry[0] as AssetCategory
        }
      }

      // 2) Keyword match on name + category strings. Either it sets the
      //    category from scratch, or — when the label match already set
      //    the category — it still supplies the finer sub-category.
      const matched = matchCategory(`${nameStr} ${categoryStr}`, subCategoryStr)
      if (matched) {
        if (category === 'other') {
          category = matched.category
        }
        subCategory = matched.subCategory
      }

      const marketValue = isNaN(amount) ? 0 : amount

      if (marketValue === 0 && !nameStr) continue

      assets.push({
        id: uuidv4(),
        name: nameStr || `导入资产 #${i}`,
        category,
        subCategory,
        marketValue,
        currency: detectCurrency(currencyStr),
        liquidity: CATEGORY_LIQUIDITY[category],
        riskLevel: CATEGORY_RISK_CLASS[category],
        heldAt: institutionStr || undefined,
        notes: notesStr || undefined,
      })
    }

    if (assets.length === 0) {
      warnings.push('未能从文件中解析出任何资产，请检查列映射设置')
      return null
    }

    return {
      format: 'csv-generic',
      assets,
      transactions: [],
      warnings,
      stats: {
        totalTransactions: assets.length,
        totalIncome: 0,
        totalExpense: 0,
        periodStart: null,
        periodEnd: null,
        detectedInstitutions: [...new Set(assets.map((a) => a.heldAt).filter(Boolean))] as string[],
      },
    }
  },
}

function detectCurrency(str: string): Asset['currency'] {
  const s = str.toUpperCase()
  if (s.includes('USD') || s.includes('美元')) return 'USD'
  if (s.includes('HKD') || s.includes('港')) return 'HKD'
  if (s.includes('EUR') || s.includes('欧元')) return 'EUR'
  if (s.includes('JPY') || s.includes('日元')) return 'JPY'
  return 'CNY'
}
