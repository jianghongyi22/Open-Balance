// ============================================================
// Open-Balance: Market Parameters
//
// Class-level expected returns, volatilities, and a symmetric
// correlation matrix for the 8 asset classes. These power Q13
// (portfolio risk metrics) and Q14 (correlation analysis), as
// well as the Scenario Lab.
//
// DISCLAIMER: These are EDUCATIONAL assumptions for simulation
// purposes only. They are NOT investment advice, price forecasts,
// or guarantees of future performance. Sources: historical index
// data (中证全指, 中债总财富指数, 上海金, 万得理财指数) 2015-2025,
// calibrated for illustration. Swap this file for backtested data
// in Phase 2.
// ============================================================

import type { AssetCategory, Currency } from '../types'

// --- Expected annual return (decimal) ---
export const EXPECTED_RETURNS: Record<AssetCategory, number> = {
  cash_deposit: 0.015,             // ~1.5% (活期/货币基金综合)
  fixed_income: 0.035,             // ~3.5% (理财/债券综合)
  equity: 0.08,                    // ~8% (A股长期)
  real_estate: 0.03,               // ~3% (租金回报+温和升值, 后2021周期)
  insurance: 0.025,                // ~2.5% (储蓄型保险内含利率)
  precious_metals_alternative: 0.05, // ~5% (黄金长期)
  forex: 0.02,                     // ~2% (外币存款/理财综合)
  other: 0.04,                     // ~4% (其他综合)
}

// --- Annualized volatility (decimal) ---
export const VOLATILITIES: Record<AssetCategory, number> = {
  cash_deposit: 0.005,             // 0.5%
  fixed_income: 0.04,              // 4%
  equity: 0.22,                    // 22% (A股)
  real_estate: 0.10,               // 10% (房价波动, 非流动性调整)
  insurance: 0.02,                 // 2% (储蓄型保险波动低)
  precious_metals_alternative: 0.18, // 18% (黄金+加密混合)
  forex: 0.08,                     // 8% (汇率波动)
  other: 0.12,                     // 12%
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

// --- Risk-free rate assumption (Chinese 10Y government bond yield) ---
export const RISK_FREE_RATE = 0.025 // 2.5%

// --- Correlation Matrix (8×8, symmetric) ---
// Order: cash_deposit, fixed_income, equity, real_estate,
//        insurance, precious_metals_alternative, forex, other

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
    equity: -0.1,
    real_estate: 0.15,
    insurance: 0.5,
    precious_metals_alternative: 0.05,
    forex: 0.1,
    other: 0.15,
  },
  equity: {
    cash_deposit: -0.05,
    fixed_income: -0.1,
    equity: 1.0,
    real_estate: 0.4,
    insurance: 0.05,
    precious_metals_alternative: 0.15,
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
    fixed_income: 0.05,
    equity: 0.15,
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
