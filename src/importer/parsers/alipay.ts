// ============================================================
// Open-Balance Importer: 支付宝账单 Parser
//
// Typical CSV (exported from 支付宝 → 账单 → 下载账单):
//   交易时间,交易分类,交易对方,商品说明,收/支,金额,收/付款方式,交易状态,交易订单号
// XLS may have: 账务时间|交易来源地|类型|交易对方|商品名称|金额|收支|交易状态|...
// ============================================================

import * as XLSX from 'xlsx'
import type { ImportResult, RawTransaction, FormatParser } from '../types'
import { transactionsToAssets } from '../converter'
import { toDateStr, toAmount } from '../dates'

const SHEETJS = XLSX

export const alipayParser: FormatParser = {
  format: 'alipay',

  parseWorkbook(workbook: any, _fileName: string): ImportResult | null {
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rows: any[][] = SHEETJS.utils.sheet_to_json(sheet, { header: 1, defval: '' })

    if (rows.length < 2) return null

    // Find header row
    let headerRowIdx = 0
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const rowStr = (rows[i] as any[]).map((c) => String(c)).join(',')
      if ((rowStr.includes('交易时间') || rowStr.includes('账务时间')) && rowStr.includes('金额')) {
        headerRowIdx = i
        break
      }
    }

    const headers = (rows[headerRowIdx] as string[]).map((h: string) => String(h).trim())

    const findCol = (candidates: string[]) => {
      for (const c of candidates) {
        const idx = headers.findIndex((h: string) => h.toLowerCase().includes(c.toLowerCase()))
        if (idx >= 0) return idx
      }
      return -1
    }

    const dateCol = findCol(['交易时间', '账务时间', '记账时间'])
    const categoryCol = findCol(['交易分类', '类型', '交易来源地'])
    const counterpartyCol = findCol(['交易对方'])
    const productCol = findCol(['商品说明', '商品名称', '商品'])
    const directionCol = findCol(['收/支', '收支'])
    const amountCol = findCol(['金额'])
    const methodCol = findCol(['收/付款方式', '支付方式'])
    const statusCol = findCol(['交易状态'])

    if (amountCol < 0) return null

    const transactions: RawTransaction[] = []
    const warnings: string[] = []

    for (let i = headerRowIdx + 1; i < rows.length; i++) {
      const row = rows[i]
      if (!row || row.length === 0) continue

      const status = statusCol >= 0 ? String(row[statusCol] ?? '') : ''
      if (status.includes('退款') || status.includes('交易关闭')) continue

      const amount = toAmount(row[amountCol])
      if (amount === 0) continue

      const direction = directionCol >= 0 ? String(row[directionCol] ?? '') : ''
      let txType: RawTransaction['type'] = 'expense'
      if (direction === '收入' || direction === '收') txType = 'income'
      else if (direction === '' || direction === '不计收支') txType = 'transfer'

      transactions.push({
        date: toDateStr(row[dateCol]),
        type: txType,
        amount: Math.abs(amount),
        originalCategory: categoryCol >= 0 ? String(row[categoryCol] ?? '') : '',
        description: productCol >= 0 ? String(row[productCol] ?? '') : '',
        counterparty: counterpartyCol >= 0 ? String(row[counterpartyCol] ?? '') : '',
        paymentMethod: methodCol >= 0 ? String(row[methodCol] ?? '') : '支付宝',
        source: '支付宝',
      })
    }

    if (transactions.length === 0) return null

    const assets = transactionsToAssets(transactions, '支付宝', warnings)
    const dates = transactions.map((t) => t.date).filter(Boolean).sort()

    return {
      format: 'alipay',
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
