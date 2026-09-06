// ============================================================
// Open-Balance Importer: 微信支付账单 Parser
//
// Typical CSV columns:
//   微信支付账单
//   交易时间,交易类型,交易对方,商品,收/支,金额(元),支付方式,当前状态,交易单号
//   (note: first row may be a title line, header at row 2+)
// ============================================================

import type { ImportResult, RawTransaction, FormatParser } from '../types'
import { getSheetRows } from '../spreadsheet'
import type { ParsedWorkbook } from '../spreadsheet'
import { transactionsToAssets } from '../converter'
import { toDateStr, toAmount } from '../dates'

export const wechatParser: FormatParser = {
  format: 'wechat',

  parseWorkbook(workbook: ParsedWorkbook, _fileName: string): ImportResult | null {
    const rows: unknown[][] = getSheetRows(workbook)

    if (rows.length < 2) return null

    // Find header row (WeChat bills have ~11 title/meta rows first)
    let headerRowIdx = 0
    for (let i = 0; i < Math.min(rows.length, 30); i++) {
      const rowStr = (rows[i] as any[]).map((c) => String(c)).join(',')
      if (rowStr.includes('交易时间') && rowStr.includes('交易类型')) {
        headerRowIdx = i
        break
      }
    }

    const headers = (rows[headerRowIdx] as string[]).map((h: string) => String(h).trim())

    const findCol = (candidates: string[]) => {
      for (const c of candidates) {
        const idx = headers.findIndex((h: string) => h.includes(c))
        if (idx >= 0) return idx
      }
      return -1
    }

    const dateCol = findCol(['交易时间'])
    const typeCol = findCol(['交易类型'])
    const counterpartyCol = findCol(['交易对方'])
    const productCol = findCol(['商品'])
    const directionCol = findCol(['收/支'])
    const amountCol = findCol(['金额'])
    const methodCol = findCol(['支付方式'])
    const statusCol = findCol(['当前状态'])

    if (amountCol < 0 || directionCol < 0) return null

    const transactions: RawTransaction[] = []
    const warnings: string[] = []

    for (let i = headerRowIdx + 1; i < rows.length; i++) {
      const row = rows[i]
      if (!row || row.length === 0) continue

      const status = statusCol >= 0 ? String(row[statusCol] ?? '') : ''
      // Skip failed/refunded transactions
      if (status.includes('已退款') || status.includes('失败')) continue

      const amount = toAmount(row[amountCol])
      if (amount === 0) continue

      const direction = directionCol >= 0 ? String(row[directionCol] ?? '') : ''
      let txType: RawTransaction['type'] = 'expense'
      if (direction === '收入') txType = 'income'
      else if (direction === '不计收支' || direction === '/') txType = 'transfer'

      const paymentMethod = methodCol >= 0 ? String(row[methodCol] ?? '') : '微信'

      transactions.push({
        date: toDateStr(row[dateCol]),
        type: txType,
        amount: Math.abs(amount),
        originalCategory: typeCol >= 0 ? String(row[typeCol] ?? '') : '',
        description: productCol >= 0 ? String(row[productCol] ?? '') : '',
        counterparty: counterpartyCol >= 0 ? String(row[counterpartyCol] ?? '') : '',
        paymentMethod,
        source: '微信支付',
      })
    }

    if (transactions.length === 0) return null

    const assets = transactionsToAssets(transactions, '微信支付', warnings)
    const dates = transactions.map((t) => t.date).filter(Boolean).sort()

    return {
      format: 'wechat',
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
