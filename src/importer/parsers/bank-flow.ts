// ============================================================
// Open-Balance Importer: 银行流水 Parser
//
// Supports common Chinese bank statement formats:
//   - CMB (招商银行): 交易日期,摘要,收入,支出,余额,对方户名
//   - ICBC (工商银行): 记账日期,交易摘要,借方金额,贷方金额,余额
//   - Generic: 交易日期,交易摘要,收入,支出,余额
// ============================================================

import { v4 as uuidv4 } from 'uuid'
import type { ImportResult, RawTransaction, FormatParser } from '../types'
import { getSheetRows } from '../spreadsheet'
import type { ParsedWorkbook } from '../spreadsheet'
import { transactionsToAssets } from '../converter'
import { toDateStr, toAmount } from '../dates'

export const bankFlowParser: FormatParser = {
  format: 'bank-generic',

  parseWorkbook(workbook: ParsedWorkbook, fileName: string): ImportResult | null {
    const rows: unknown[][] = getSheetRows(workbook)

    if (rows.length < 2) return null

    // Find header row
    let headerRowIdx = 0
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const rowStr = (rows[i] as any[]).map((c) => String(c)).join(',')
      if (
        (rowStr.includes('交易日期') || rowStr.includes('记账日期') || rowStr.includes('日期')) &&
        (rowStr.includes('摘要') || rowStr.includes('交易说明'))
      ) {
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

    const dateCol = findCol(['交易日期', '记账日期', '日期', '交易时间'])
    const descCol = findCol(['摘要', '交易摘要', '交易说明', '用途'])
    const incomeCol = findCol(['收入', '贷方金额', '存入', '贷方'])
    const expenseCol = findCol(['支出', '借方金额', '支取', '借方'])
    const balanceCol = findCol(['余额'])
    const counterpartyCol = findCol(['对方户名', '对方', '交易对方', '对方名称'])

    // Need at least one of income/expense amount columns
    if (incomeCol < 0 && expenseCol < 0) return null

    const transactions: RawTransaction[] = []
    const warnings: string[] = []
    let lastBalance = 0

    // Detect bank name
    let bankName = '银行'
    if (fileName.includes('招商') || fileName.includes('cmb')) bankName = '招商银行'
    else if (fileName.includes('工商') || fileName.includes('icbc')) bankName = '工商银行'
    else if (fileName.includes('建设') || fileName.includes('ccb')) bankName = '建设银行'
    else if (fileName.includes('中国银行') || fileName.includes('boc')) bankName = '中国银行'

    for (let i = headerRowIdx + 1; i < rows.length; i++) {
      const row = rows[i]
      if (!row || row.length === 0) continue

      // Parse income/expense amounts
      let income = 0
      let expense = 0

      if (incomeCol >= 0 && expenseCol >= 0) {
        income = toAmount(row[incomeCol])
        expense = toAmount(row[expenseCol])
      } else if (incomeCol >= 0) {
        // Single amount column — could be positive (income) or negative (expense)
        const amt = toAmount(row[incomeCol])
        if (amt > 0) income = amt
        else expense = Math.abs(amt)
      }

      if (income === 0 && expense === 0) continue

      // Determine transaction type and amount
      let txType: RawTransaction['type']
      let amount: number
      if (income > 0 && expense === 0) {
        txType = 'income'
        amount = income
      } else if (expense > 0 && income === 0) {
        txType = 'expense'
        amount = expense
      } else {
        txType = income >= expense ? 'income' : 'expense'
        amount = Math.abs(income - expense)
      }

      // Track last balance
      if (balanceCol >= 0) {
        lastBalance = toAmount(row[balanceCol])
      }

      transactions.push({
        date: toDateStr(row[dateCol]),
        type: txType,
        amount,
        originalCategory: '',
        description: descCol >= 0 ? String(row[descCol] ?? '') : '',
        counterparty: counterpartyCol >= 0 ? String(row[counterpartyCol] ?? '') : '',
        paymentMethod: bankName,
        source: bankName,
      })
    }

    if (transactions.length === 0) return null

    let assets = transactionsToAssets(transactions, bankName, warnings)

    // Bank statements carry an authoritative final balance. Override the
    // deposit asset with it (a live checking account's worth IS its balance,
    // regardless of the net flow of the exported window).
    if (lastBalance > 0) {
      const depositIdx = assets.findIndex((a) => a.category === 'cash_deposit')
      if (depositIdx >= 0) {
        assets[depositIdx] = {
          ...assets[depositIdx],
          marketValue: Math.round(lastBalance),
          name: `${bankName}储蓄（余额 ${Math.round(lastBalance).toLocaleString()}）`,
          notes: `${assets[depositIdx].notes ?? ''}\n余额以流水最后一行为准`,
        }
      } else {
        assets.push({
          id: uuidv4(),
          name: `${bankName}储蓄`,
          category: 'cash_deposit',
          subCategory: '活期存款',
          marketValue: Math.round(lastBalance),
          currency: 'CNY',
          liquidity: 'high',
          riskLevel: 'low',
          heldAt: bankName,
          notes: '余额以流水最后一行为准',
        })
      }
    }

    const dates = transactions.map((t) => t.date).filter(Boolean).sort()

    return {
      format: 'bank-generic',
      assets,
      transactions,
      warnings,
      stats: {
        totalTransactions: transactions.length,
        totalIncome: transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        totalExpense: transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
        periodStart: dates[0] ?? null,
        periodEnd: dates[dates.length - 1] ?? null,
        detectedInstitutions: [bankName],
      },
    }
  },
}
