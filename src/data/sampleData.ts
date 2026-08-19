// ============================================================
// Open-Balance: Sample Data
//
// A realistic demo family: 二线城市中年家庭 (夫妻+1孩)
// - 自有住房(有房贷)
// - 银行存款+理财
// - A股+基金投资
// - 保险保障
// ============================================================

import type { Asset, Liability, HouseholdProfile } from '../types'

export const SAMPLE_ASSETS: Asset[] = [
  // --- 现金及存款 ---
  {
    id: 'sample-cash-1',
    name: '工资卡活期',
    category: 'cash_deposit',
    subCategory: '活期存款',
    marketValue: 50_000,
    currency: 'CNY',
    liquidity: 'high',
    riskLevel: 'low',
    heldAt: '招商银行',
  },
  {
    id: 'sample-cash-2',
    name: '余额宝',
    category: 'cash_deposit',
    subCategory: '货币基金',
    marketValue: 100_000,
    currency: 'CNY',
    liquidity: 'high',
    riskLevel: 'low',
    expectedReturnPct: 1.8,
    heldAt: '支付宝',
  },
  {
    id: 'sample-cash-3',
    name: '三年期大额存单',
    category: 'cash_deposit',
    subCategory: '大额存单',
    marketValue: 300_000,
    currency: 'CNY',
    liquidity: 'medium',
    riskLevel: 'low',
    expectedReturnPct: 2.6,
    heldAt: '工商银行',
    maturityDate: '2027-06-15',
  },

  // --- 固收理财 ---
  {
    id: 'sample-fi-1',
    name: '招行季季宝',
    category: 'fixed_income',
    subCategory: '银行理财',
    marketValue: 200_000,
    currency: 'CNY',
    liquidity: 'medium',
    riskLevel: 'low',
    expectedReturnPct: 3.2,
    heldAt: '招商银行',
    lockUpUntil: '2026-11-01',
  },
  {
    id: 'sample-fi-2',
    name: '国债ETF联接',
    category: 'fixed_income',
    subCategory: '国债/政金债',
    marketValue: 100_000,
    currency: 'CNY',
    liquidity: 'high',
    riskLevel: 'low',
    expectedReturnPct: 2.8,
    heldAt: '天天基金',
  },

  // --- 权益类 ---
  {
    id: 'sample-eq-1',
    name: '沪深300ETF',
    category: 'equity',
    subCategory: '指数/ETF基金',
    marketValue: 150_000,
    originalCost: 120_000,
    currency: 'CNY',
    liquidity: 'high',
    riskLevel: 'high',
    expectedReturnPct: 8.0,
    heldAt: '华泰证券',
    monthlyContribution: 5_000,
  },
  {
    id: 'sample-eq-2',
    name: '招商中证白酒',
    category: 'equity',
    subCategory: '指数/ETF基金',
    marketValue: 80_000,
    originalCost: 100_000,
    currency: 'CNY',
    liquidity: 'high',
    riskLevel: 'high',
    expectedReturnPct: 10.0,
    heldAt: '支付宝',
    monthlyContribution: 2_000,
  },
  {
    id: 'sample-eq-3',
    name: '中欧医疗健康混合',
    category: 'equity',
    subCategory: '主动权益基金',
    marketValue: 50_000,
    originalCost: 65_000,
    currency: 'CNY',
    liquidity: 'high',
    riskLevel: 'high',
    expectedReturnPct: 8.0,
    heldAt: '天天基金',
  },
  {
    id: 'sample-eq-4',
    name: '某龙头股持仓',
    category: 'equity',
    subCategory: 'A股股票',
    marketValue: 40_000,
    originalCost: 35_000,
    currency: 'CNY',
    liquidity: 'high',
    riskLevel: 'high',
    heldAt: '华泰证券',
  },

  // --- 房地产 ---
  {
    id: 'sample-re-1',
    name: '自住房·万科城',
    category: 'real_estate',
    subCategory: '自住房',
    marketValue: 3_000_000,
    originalCost: 2_200_000,
    currency: 'CNY',
    liquidity: 'low',
    riskLevel: 'medium',
    isPrimaryResidence: true,
    heldAt: '—',
    notes: '89㎡, 2019年购入',
  },
  {
    id: 'sample-re-2',
    name: '车位',
    category: 'real_estate',
    subCategory: '自住房',
    marketValue: 150_000,
    originalCost: 120_000,
    currency: 'CNY',
    liquidity: 'low',
    riskLevel: 'medium',
  },

  // --- 保险 ---
  {
    id: 'sample-ins-1',
    name: '重疾险·夫妻双方',
    category: 'insurance',
    subCategory: '重疾险',
    marketValue: 0, // 保障型保险无现金价值记录
    currency: 'CNY',
    liquidity: 'low',
    riskLevel: 'low',
    insuranceCoverage: 500_000, // 每人25万保额
    insuranceAnnualPremium: 12_000,
    heldAt: '中国平安',
  },
  {
    id: 'sample-ins-2',
    name: '百万医疗险·全家',
    category: 'insurance',
    subCategory: '医疗险',
    marketValue: 0,
    currency: 'CNY',
    liquidity: 'low',
    riskLevel: 'low',
    insuranceCoverage: 4_000_000,
    insuranceAnnualPremium: 2_500,
    heldAt: '众安保险',
  },
  {
    id: 'sample-ins-3',
    name: '定期寿险·丈夫',
    category: 'insurance',
    subCategory: '定期寿险',
    marketValue: 0,
    currency: 'CNY',
    liquidity: 'low',
    riskLevel: 'low',
    insuranceCoverage: 1_000_000,
    insuranceAnnualPremium: 3_000,
    heldAt: '华贵保险',
  },
  {
    id: 'sample-ins-4',
    name: '增额终身寿·教育金',
    category: 'insurance',
    subCategory: '增额终身寿',
    marketValue: 120_000, // 现金价值
    currency: 'CNY',
    liquidity: 'low',
    riskLevel: 'low',
    expectedReturnPct: 2.9,
    insuranceAnnualPremium: 50_000,
    heldAt: '中国人寿',
  },

  // --- 贵金属 ---
  {
    id: 'sample-pm-1',
    name: '黄金积存',
    category: 'precious_metals_alternative',
    subCategory: '黄金',
    marketValue: 30_000,
    originalCost: 27_000,
    currency: 'CNY',
    liquidity: 'medium',
    riskLevel: 'medium',
    expectedReturnPct: 5.0,
    heldAt: '工商银行',
    monthlyContribution: 1_000,
  },

  // --- 其他 ---
  {
    id: 'sample-other-1',
    name: '借出款项·亲戚',
    category: 'other',
    subCategory: '借出款项',
    marketValue: 30_000,
    currency: 'CNY',
    liquidity: 'low',
    riskLevel: 'medium',
    notes: '2024年借出，无利息',
  },
]

export const SAMPLE_LIABILITIES: Liability[] = [
  {
    id: 'sample-debt-1',
    name: '自住房按揭贷款',
    type: '房贷',
    remainingPrincipal: 1_200_000,
    annualRatePct: 3.95,
    monthlyPayment: 8_500,
    remainingMonths: 204, // 17年
    collateralAssetId: 'sample-re-1',
  },
]

export const SAMPLE_PROFILE: HouseholdProfile = {
  memberAges: [38, 36],
  dependentCount: 1,
  dependentAges: [7],
  annualIncome: 350_000,
  monthlyEssentialExpense: 15_000,
  incomeStability: 'stable',
  riskToleranceScore: 55, // 稳健型
  province: '江苏',
  retirementAge: 60,
  monthlySocialPension: 6_000, // 预计退休后社保+年金月领额
  goals: {
    retirementReplacementRate: 0.7,
    educationFundYears: 11,
    educationTier: 'domestic',
  },
}
