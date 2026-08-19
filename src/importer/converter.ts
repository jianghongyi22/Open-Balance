// ============================================================
// Open-Balance Importer: Transaction → Asset Converter
//
// Aggregates raw transactions from bank/wechat/alipay/etc
// into Open-Balance Asset entries.
// ============================================================

import { v4 as uuidv4 } from 'uuid'
import type { Asset, AssetCategory } from '../types'
import type { RawTransaction, InstitutionInfo } from './types'

// --- Issuer recognition (发行方) ---

/** 常见理财产品发行方/管理人名称表 */
const KNOWN_ISSUERS = [
  '招银理财', '兴银理财', '中银理财', '工银理财', '建信理财', '农银理财',
  '光大理财', '华夏理财', '平安理财', '中邮理财', '交银理财', '信银理财',
  '易方达', '华夏基金', '天弘基金', '汇添富', '南方基金', '嘉实基金',
  '博时基金', '广发基金', '招商基金', '富国基金', '中欧基金', '景顺长城',
  '交银施罗德', '银华基金', '鹏华基金', '国泰基金', '华安基金', '兴全基金',
  '国寿养老', '平安养老', '泰康资产', '太平洋保险',
]

// 通用发行方命名模式：XX理财 / XX基金 / XX证券 / XX信托 / XX资产
const ISSUER_PATTERN = /([一-龥]{2,8}(?:理财|基金|证券|信托|资产|银行))/g

/**
 * 从产品名称/描述中识别发行方（区别于持有机构 heldAt）。
 * 命中已知发行方名表或通用命名模式。
 */
export function extractIssuer(...texts: (string | undefined)[]): string | undefined {
  const combined = texts.filter(Boolean).join(' ')
  if (!combined) return undefined

  // 1) 已知发行方名表优先
  for (const issuer of KNOWN_ISSUERS) {
    if (combined.includes(issuer)) return issuer
  }

  // 2) 通用命名模式
  const matches = combined.match(ISSUER_PATTERN)
  if (matches && matches.length > 0) return matches[0]

  return undefined
}

// --- Known institution → asset classification ---

const INSTITUTION_MAP: Record<string, InstitutionInfo> = {
  // WeChat
  // 注意顺序：前缀匹配，'零钱通'必须先于'零钱'
  '零钱通': { name: '零钱通', category: 'cash_deposit', subCategory: '货币基金', liquidity: 'high', riskLevel: 'low' },
  '理财通': { name: '理财通持仓', category: 'fixed_income', subCategory: '银行理财', liquidity: 'medium', riskLevel: 'low' },
  '微信零钱': { name: '微信零钱', category: 'cash_deposit', subCategory: '活期存款', liquidity: 'high', riskLevel: 'low' },
  '零钱': { name: '微信零钱', category: 'cash_deposit', subCategory: '活期存款', liquidity: 'high', riskLevel: 'low' },

  // Alipay
  // 注意顺序：前缀匹配，'余额宝'/'余利宝'必须先于'余额'
  '余额宝': { name: '余额宝', category: 'cash_deposit', subCategory: '货币基金', liquidity: 'high', riskLevel: 'low' },
  '余利宝': { name: '余利宝', category: 'cash_deposit', subCategory: '货币基金', liquidity: 'high', riskLevel: 'low' },
  '余额': { name: '支付宝余额', category: 'cash_deposit', subCategory: '活期存款', liquidity: 'high', riskLevel: 'low' },
  '蚂蚁财富': { name: '蚂蚁财富持仓', category: 'equity', subCategory: '指数/ETF基金', liquidity: 'high', riskLevel: 'high' },
  '帮你投': { name: '帮你投策略组合', category: 'equity', subCategory: '主动权益基金', liquidity: 'high', riskLevel: 'high' },

  // Banks
  '招商银行': { name: '招商银行储蓄', category: 'cash_deposit', subCategory: '活期存款', liquidity: 'high', riskLevel: 'low' },
  '工商银行': { name: '工商银行储蓄', category: 'cash_deposit', subCategory: '活期存款', liquidity: 'high', riskLevel: 'low' },
  '建设银行': { name: '建设银行储蓄', category: 'cash_deposit', subCategory: '活期存款', liquidity: 'high', riskLevel: 'low' },
  '中国银行': { name: '中国银行储蓄', category: 'cash_deposit', subCategory: '活期存款', liquidity: 'high', riskLevel: 'low' },
}

// --- Category key word matching ---

const CATEGORY_KEYWORDS: Record<string, { category: AssetCategory; subCategory: string }> = {
  // 现金类
  '活期': { category: 'cash_deposit', subCategory: '活期存款' },
  '定期': { category: 'cash_deposit', subCategory: '定期存款' },
  '大额存单': { category: 'cash_deposit', subCategory: '大额存单' },
  '货币': { category: 'cash_deposit', subCategory: '货币基金' },
  '余额': { category: 'cash_deposit', subCategory: '活期存款' },

  // 固收
  '理财': { category: 'fixed_income', subCategory: '银行理财' },
  '国债': { category: 'fixed_income', subCategory: '国债/政金债' },
  '债券': { category: 'fixed_income', subCategory: '债券基金' },
  '债基': { category: 'fixed_income', subCategory: '债券基金' },
  '固收': { category: 'fixed_income', subCategory: '银行理财' },

  // 权益
  '股票': { category: 'equity', subCategory: 'A股股票' },
  '基金': { category: 'equity', subCategory: '指数/ETF基金' },
  'ETF': { category: 'equity', subCategory: '指数/ETF基金' },
  '指数': { category: 'equity', subCategory: '指数/ETF基金' },
  '混合': { category: 'equity', subCategory: '主动权益基金' },
  '权益': { category: 'equity', subCategory: '主动权益基金' },

  // 保险
  '保险': { category: 'insurance', subCategory: '重疾险' },
  '年金': { category: 'insurance', subCategory: '年金险' },
  '寿险': { category: 'insurance', subCategory: '定期寿险' },
  '重疾': { category: 'insurance', subCategory: '重疾险' },
  '医疗险': { category: 'insurance', subCategory: '医疗险' },

  // 贵金属
  '黄金': { category: 'precious_metals_alternative', subCategory: '黄金' },
  '金条': { category: 'precious_metals_alternative', subCategory: '黄金' },
  '比特币': { category: 'precious_metals_alternative', subCategory: '加密货币' },

  // 房产
  '房贷': { category: 'real_estate', subCategory: '自住房' },
  '房产': { category: 'real_estate', subCategory: '自住房' },
  '租金': { category: 'real_estate', subCategory: '投资房' },
}

/**
 * Match a transaction description/category to an Open-Balance category.
 */
export function matchCategory(
  description: string,
  originalCategory: string
): { category: AssetCategory; subCategory: string } | null {
  const searchText = (description + originalCategory).toLowerCase()

  for (const [keyword, mapping] of Object.entries(CATEGORY_KEYWORDS)) {
    if (searchText.includes(keyword.toLowerCase())) {
      return mapping
    }
  }

  return null
}

/**
 * Aggregate raw transactions into Asset entries.
 *
 * Strategy:
 * 1. Group transactions by source institution + detected category
 * 2. For each group, estimate balance from net inflow
 * 3. Create an Asset per group
 */
export function transactionsToAssets(
  transactions: RawTransaction[],
  source: string,
  warnings: string[]
): Asset[] {
  if (transactions.length === 0) return []

  // Group by (category, institution description)
  const groups = new Map<string, {
    transactions: RawTransaction[]
    netFlow: number
    category: AssetCategory | null
    subCategory: string | null
  }>()

  for (const tx of transactions) {
    // Determine group key
    const catMatch = matchCategory(tx.description, tx.originalCategory)
    const groupKey = `${tx.paymentMethod || tx.source}_${catMatch?.category ?? 'unknown'}_${catMatch?.subCategory ?? ''}`

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        transactions: [],
        netFlow: 0,
        category: catMatch?.category ?? null,
        subCategory: catMatch?.subCategory ?? null,
      })
    }

    const group = groups.get(groupKey)!
    group.transactions.push(tx)

    // Net flow: income adds, expense subtracts
    if (tx.type === 'income') group.netFlow += tx.amount
    else if (tx.type === 'expense') group.netFlow -= tx.amount
  }

  // Build assets
  const assets: Asset[] = []

  for (const [groupKey, group] of groups) {
    // Skip if net flow is near zero (unlikely to be a holding)
    if (Math.abs(group.netFlow) < 10) continue

    // Negative net flow means money left this account into products we
    // can't value from the statement alone (funds, loans, etc.)
    if (group.netFlow < 0) {
      warnings.push(
        `检测到「${groupKey.split('_')[0]}」净支出 ¥${Math.round(-group.netFlow).toLocaleString()}（可能为理财申购/贷款还款），流水无法推定其资产价值，请手动补充`
      )
      continue
    }

    // Try to match institution
    let instInfo: InstitutionInfo | undefined
    for (const [name, info] of Object.entries(INSTITUTION_MAP)) {
      if (groupKey.includes(name)) {
        instInfo = info
        break
      }
    }

    const category = group.category ?? instInfo?.category ?? 'cash_deposit'
    // When the institution is recognized and its category matches the
    // group's category, prefer the institution's finer sub-category
    // (e.g. 余额宝 → 货币基金 even though keyword matched 活期存款)
    const subCategory =
      instInfo && instInfo.category === category && instInfo.subCategory
        ? instInfo.subCategory
        : group.subCategory ?? undefined

    // Generate a descriptive name. Known institutions keep their clean
    // name; description-derived names are flagged as auto-detected.
    const sampleDesc = group.transactions.slice(0, 3).map((t) => t.description).filter(Boolean)
    const name = instInfo?.name ?? `${sampleDesc[0] ?? source}（自动识别）`

    // 固收类资产尝试从交易描述中识别发行方（区别于持有机构）
    let issuer: string | undefined
    if (category === 'fixed_income') {
      issuer = extractIssuer(...group.transactions.map((t) => `${t.description} ${t.counterparty} ${t.originalCategory}`))
    }

    assets.push({
      id: uuidv4(),
      name,
      category,
      subCategory,
      marketValue: Math.round(Math.max(0, group.netFlow)),
      currency: 'CNY',
      liquidity: instInfo?.liquidity ?? (category === 'cash_deposit' ? 'high' : 'medium'),
      riskLevel: instInfo?.riskLevel ?? (category === 'equity' ? 'high' : category === 'real_estate' ? 'medium' : 'low'),
      heldAt: source,
      issuer,
      notes: `从${group.transactions.length}笔交易自动聚合\n示例: ${sampleDesc.slice(0, 3).join('; ')}`,
    })
  }

  // If no assets detected at all, create one generic entry for the source
  if (assets.length === 0) {
    const totalNet = transactions.reduce((sum, tx) =>
      sum + (tx.type === 'income' ? tx.amount : tx.type === 'expense' ? -tx.amount : 0), 0)
    if (totalNet >= 10) {
      assets.push({
        id: uuidv4(),
        name: `${source}余额（自动识别）`,
        category: 'cash_deposit',
        subCategory: '活期存款',
        marketValue: Math.round(Math.max(0, totalNet)),
        currency: 'CNY',
        liquidity: 'high',
        riskLevel: 'low',
        heldAt: source,
        notes: `从${transactions.length}笔交易自动聚合`,
      })
    }
  }

  if (assets.length === 0 && transactions.length > 0) {
    warnings.push(`未能从 ${transactions.length} 笔交易中识别出资产，请手动录入`)
  }

  return assets
}

/**
 * Detect potential liabilities from transaction patterns.
 * Returns suggested liabilities that the user can confirm.
 */
export function detectLiabilities(
  transactions: RawTransaction[]
): Array<{ name: string; monthlyPayment: number; type: string }> {
  const suggestions: Array<{ name: string; monthlyPayment: number; type: string }> = []

  // Detect mortgage/car loan payments (recurring similar amounts)
  const loanKeywords = ['房贷', '按揭', '车贷', '贷款还款']
  const loanPayments = transactions.filter((tx) =>
    tx.type === 'expense' && loanKeywords.some((kw) => tx.description.includes(kw))
  )

  if (loanPayments.length >= 3) {
    const avgAmount = loanPayments.reduce((s, tx) => s + tx.amount, 0) / loanPayments.length
    const desc = loanPayments[0].description
    suggestions.push({
      name: `${desc}（自动识别）`,
      monthlyPayment: Math.round(avgAmount),
      type: desc.includes('车') ? '车贷' : '房贷',
    })
  }

  return suggestions
}
