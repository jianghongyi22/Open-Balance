// ============================================================
// Open-Balance Importer: 随手记 Parser
//
// Typical columns (varies by version):
//   CSV: "分类","类型(支出/收入)","金额","账户","日期","备注"
//   XLS: 分类 | 子分类 | 账户 | 日期 | 金额 | 类型 | 备注
// ============================================================

import type { ImportResult, RawTransaction, FormatParser } from '../types'
import { getSheetRows } from '../spreadsheet'
import type { ParsedWorkbook } from '../spreadsheet'
import { transactionsToAssets } from '../converter'
import { toDateStr, toAmount } from '../dates'

export const suishoujiParser: FormatParser = {
  format: 'suishouji',

  parseWorkbook(workbook: ParsedWorkbook, _fileName: string): ImportResult | null {
    const rows: unknown[][] = getSheetRows(workbook)

    if (rows.length < 2) return null

    const headers = (rows[0] as string[]).map((h: string) => String(h).trim())

    // Detect column positions
    const findCol = (candidates: string[]) => {
      for (const c of candidates) {
        const idx = headers.findIndex((h: string) => h.includes(c))
        if (idx >= 0) return idx
      }
      return -1
    }

    const dateCol = findCol(['日期', '时间'])
    const categoryCol = findCol(['分类', '类别'])
    const typeCol = findCol(['类型', '收支'])
    const amountCol = findCol(['金额'])
    const accountCol = findCol(['账户', '帐户', '账户1'])
    const notesCol = findCol(['备注', '说明', '项目'])

    // Basic validation: need at least amount + type/direction
    if (amountCol < 0) return null

    const transactions: RawTransaction[] = []
    const warnings: string[] = []

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      if (!row || row.length === 0) continue

      const amount = toAmount(row[amountCol])
      if (amount === 0) continue

      // Determine type: 随手记 uses "支出"/"收入" or "expense"/"income"
      const typeStr = typeCol >= 0 ? String(row[typeCol] ?? '') : ''
      let txType: RawTransaction['type'] = 'expense'
      if (typeStr.includes('收') || typeStr.toLowerCase().includes('income')) {
        txType = 'income'
      } else if (typeStr.includes('转')) {
        txType = 'transfer'
      }

      transactions.push({
        date: toDateStr(row[dateCol] ?? ''),
        type: txType,
        amount: Math.abs(amount),
        originalCategory: categoryCol >= 0 ? String(row[categoryCol] ?? '') : '',
        description: notesCol >= 0 ? String(row[notesCol] ?? '') : '',
        counterparty: '',
        paymentMethod: accountCol >= 0 ? String(row[accountCol] ?? '') : '',
        source: accountCol >= 0 ? String(row[accountCol] ?? '') : '随手记',
      })
    }

    if (transactions.length === 0) return null

    const assets = transactionsToAssets(transactions, '随手记', warnings)
    const dates = transactions.map((t) => t.date).filter(Boolean).sort()

    return {
      format: 'suishouji',
      assets,
      transactions,
      warnings,
      stats: {
        totalTransactions: transactions.length,
        totalIncome: transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        totalExpense: transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
        periodStart: dates[0] ?? null,
        periodEnd: dates[dates.length - 1] ?? null,
        detectedInstitutions: [...new Set(transactions.map((t) => t.paymentMethod).filter(Boolean))],
      },
    }
  },
}
