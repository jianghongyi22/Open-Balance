// ============================================================
// Open-Balance: Market Parameters
//
// 大类资产的预期收益、波动率与相关性矩阵，为 Q13（组合风险
// 指标）与 Q14（相关性分析）以及情景实验室提供参数。
//
// 数据来源（2015-2024 统计窗口，公开研究报告）：
// - 权益：中证全指（000985.CSI）全收益口径 2015-2024 年化
//   约 2.8%（区间起点为 2015 牛市高点）；年化波动率 19-20%
//   来源：长升理财/清华五道口金融学院研究报告（2005-2024
//   更长窗口全收益年化 8-10%、波动约 30%）
// - 固收：中债新综合财富（总值）指数（CBA00101.CS）
//   2015-2024 年化 4.64%、年化波动 1.10-1.70%
//   来源：万得/中信建投，经东方财富号与中央结算公司数据交叉验证
//   注意：2024 年末 10Y 国债收益率降至 1.74% 历史低位，
//   未来债券回报大概率低于历史区间
// - 黄金：上海金 Au9999，2003-2024 年化 8.98%、波动 13.48%
//   （有知有行《中国大类资产投资 2024 年报》）；2005-2024
//   年化 8.60%、波动 15.59%（申万宏源）
// - 股债相关性：沪深300 vs 中债综合指数长期平均约 -0.10，
//   年度滚动区间 -0.80 ~ +0.65（皮书数据库/深交所研究报告）
// - 股金相关性：近五年约 -0.06 ~ +0.12（世界黄金协会）
// - 房地产/保险/外汇/其他：无公开指数口径，标为模型估计
//
// 如何自行替换：scripts/backtest-market-params.mjs 可用
// 自定义指数 CSV 计算年化收益/波动/相关矩阵，输出参数替换本表。
//
// DISCLAIMER: 历史统计不代表未来表现。本表仅用于教育模拟，
// 不构成投资建议或收益预测。
// ============================================================

import type { AssetCategory, Currency } from '../types'

// --- Expected annual return (decimal) ---
// 口径：年化、全收益（含分红/票息/利息再投资）
export const EXPECTED_RETURNS: Record<AssetCategory, number> = {
  cash_deposit: 0.022,             // 货币基金十年平均约 2.2%（近年下行，估计）
  fixed_income: 0.046,             // 中债新综合财富指数 2015-2024 年化 4.64%
  equity: 0.028,                   // 中证全指全收益 2015-2024 年化 2.8%
  real_estate: 0.03,               // 模型估计（租金+温和升值，后2021周期）
  insurance: 0.025,                // 模型估计（储蓄型保险内含利率）
  precious_metals_alternative: 0.09, // 上海金 2003-2024 年化 8.98%
  forex: 0.02,                     // 模型估计（外币存款/理财综合）
  other: 0.04,                     // 模型估计
}

// --- Annualized volatility (decimal) ---
export const VOLATILITIES: Record<AssetCategory, number> = {
  cash_deposit: 0.005,             // 货币基金净值波动
  fixed_income: 0.013,             // 中债新综合财富 2015-2024 年化波动 1.1-1.7%
  equity: 0.195,                   // 中证全指 2015-2024 年化波动 19-20%
  real_estate: 0.10,               // 模型估计（中国房价波动，非流动性调整）
  insurance: 0.02,                 // 模型估计
  precious_metals_alternative: 0.14, // 上海金 2003-2024 波动 13.5%（申万宏源 15.6%）
  forex: 0.08,                     // 模型估计（汇率波动）
  other: 0.12,                     // 模型估计
}

// --- Category-level risk class ---
export const CATEGORY_RISK_CLASS: Record<AssetCategory, 'low' | 'medium' | 'high'> = {
  cash_deposit: 'low',
  fixed_income: 'low',
  equity: 'high',
  real_estate: 'medium',
  insurance: 'low',
  precious_metals_alternative: 'high',
  forex: 'medium',
  other: 'medium',
}

// --- Category-level liquidity ---
export const CATEGORY_LIQUIDITY: Record<AssetCategory, 'high' | 'medium' | 'low'> = {
  cash_deposit: 'high',
  fixed_income: 'medium',
  equity: 'high',
  real_estate: 'low',
  insurance: 'low',
  precious_metals_alternative: 'medium',
  forex: 'medium',
  other: 'low',
}

// --- Default FX rates to CNY ---
export const DEFAULT_FX_RATES: Record<string, number> = {
  CNY: 1.0,
  USD: 7.25,
  HKD: 0.93,
  EUR: 7.90,
  JPY: 0.049,
}

// --- Risk-free rate ---
// 10Y 国债到期收益率 2024 年末 1.74%（历史低位，2002 年以来中位数 3.25%）
export const RISK_FREE_RATE = 0.017

// --- Correlation Matrix (8×8, symmetric) ---
// 有公开统计的用统计值（股债 -0.10、股金 0.05、债金 0.10），
// 其余为模型估计。Order: cash_deposit, fixed_income, equity,
// real_estate, insurance, precious_metals_alternative, forex, other

export const CORRELATION_MATRIX: Record<AssetCategory, Record<AssetCategory, number>> = {
  cash_deposit: {
    cash_deposit: 1.0,
    fixed_income: 0.3,
    equity: -0.05,
    real_estate: 0.1,
    insurance: 0.2,
    precious_metals_alternative: -0.1,
    forex: 0.05,
    other: 0.1,
  },
  fixed_income: {
    cash_deposit: 0.3,
    fixed_income: 1.0,
    equity: -0.1,   // 沪深300 vs 中债综合 长期平均约 -0.10
    real_estate: 0.15,
    insurance: 0.5,
    precious_metals_alternative: 0.1, // 债金长期低相关（估计）
    forex: 0.1,
    other: 0.15,
  },
  equity: {
    cash_deposit: -0.05,
    fixed_income: -0.1,
    equity: 1.0,
    real_estate: 0.4, // 股房相关性（模型估计）
    insurance: 0.05,
    precious_metals_alternative: 0.05, // 近五年股金 -0.06 ~ +0.12
    forex: 0.2,
    other: 0.3,
  },
  real_estate: {
    cash_deposit: 0.1,
    fixed_income: 0.15,
    equity: 0.4,
    real_estate: 1.0,
    insurance: 0.1,
    precious_metals_alternative: 0.1,
    forex: 0.15,
    other: 0.2,
  },
  insurance: {
    cash_deposit: 0.2,
    fixed_income: 0.5,
    equity: 0.05,
    real_estate: 0.1,
    insurance: 1.0,
    precious_metals_alternative: 0.05,
    forex: 0.05,
    other: 0.1,
  },
  precious_metals_alternative: {
    cash_deposit: -0.1,
    fixed_income: 0.1,
    equity: 0.05,
    real_estate: 0.1,
    insurance: 0.05,
    precious_metals_alternative: 1.0,
    forex: 0.25,
    other: 0.2,
  },
  forex: {
    cash_deposit: 0.05,
    fixed_income: 0.1,
    equity: 0.2,
    real_estate: 0.15,
    insurance: 0.05,
    precious_metals_alternative: 0.25,
    forex: 1.0,
    other: 0.15,
  },
  other: {
    cash_deposit: 0.1,
    fixed_income: 0.15,
    equity: 0.3,
    real_estate: 0.2,
    insurance: 0.1,
    precious_metals_alternative: 0.2,
    forex: 0.15,
    other: 1.0,
  },
}

// --- Category color palette (for charts) ---
export const CATEGORY_COLORS: Record<AssetCategory, string> = {
  cash_deposit: '#5470C6',
  fixed_income: '#91CC75',
  equity: '#EE6666',
  real_estate: '#FAC858',
  insurance: '#73C0DE',
  precious_metals_alternative: '#9A60B4',
  forex: '#FC8452',
  other: '#999999',
}

// --- Category icons (antd icon names as strings) ---
export const CATEGORY_ICONS: Record<AssetCategory, string> = {
  cash_deposit: 'DollarOutlined',
  fixed_income: 'SafetyCertificateOutlined',
  equity: 'StockOutlined',
  real_estate: 'HomeOutlined',
  insurance: 'InsuranceOutlined',
  precious_metals_alternative: 'GoldOutlined',
  forex: 'GlobalOutlined',
  other: 'EllipsisOutlined',
}

// --- S&P Quadrant classification of each category ---
export type SPQuadrant = 'shortTerm' | 'protection' | 'growth' | 'stable'

export const CATEGORY_QUADRANT: Record<AssetCategory, SPQuadrant> = {
  cash_deposit: 'shortTerm',
  fixed_income: 'stable',
  equity: 'growth',
  real_estate: 'growth',
  insurance: 'protection',
  precious_metals_alternative: 'growth',
  forex: 'shortTerm',
  other: 'growth',
}

// --- Category that counts as "liquid" for emergency fund ---
export const EMERGENCY_LIQUID_CATEGORIES: AssetCategory[] = [
  'cash_deposit',
]

// --- Category that generates passive income ---
export const INCOME_CATEGORIES: AssetCategory[] = [
  'real_estate',    // rent
  'equity',          // dividends
  'fixed_income',    // coupon
  'insurance',       // annuity payout
  'cash_deposit',    // deposit interest (negligible but counts)
]

// Type for the default currency of a category
export const CATEGORY_DEFAULT_CURRENCY: Record<AssetCategory, Currency> = {
  cash_deposit: 'CNY',
  fixed_income: 'CNY',
  equity: 'CNY',
  real_estate: 'CNY',
  insurance: 'CNY',
  precious_metals_alternative: 'CNY',
  forex: 'USD',
  other: 'CNY',
}
