// ============================================================
// Open-Balance: Thresholds — Single source of truth for all
// pass/warn/fail bands used by the 16 diagnostic checks.
// ============================================================

// --- Emergency Fund (Q3) ---
export const EMERGENCY_MONTHS_PASS = 6
export const EMERGENCY_MONTHS_WARN = 3
// < EMERGENCY_MONTHS_WARN = fail

// --- DTI / Debt-to-Income (Q5) ---
export const DTI_PASS = 0.4 // ≤40%
export const DTI_WARN = 0.5 // 40-50%
// > DTI_WARN = fail

// --- Total Leverage (Q5) ---
export const LEVERAGE_PASS = 0.4 // ≤40%
export const LEVERAGE_WARN = 0.6 // 40-60%
// > LEVERAGE_WARN = fail

// --- Real Estate Concentration (Q9) ---
export const REAL_ESTATE_PASS = 0.5 // ≤50%
export const REAL_ESTATE_WARN = 0.6 // 50-60%
// > REAL_ESTATE_WARN = fail

// --- Liquidity Ratio (Q10) ---
export const LIQUIDITY_PASS = 0.15 // ≥15%
export const LIQUIDITY_WARN = 0.08 // 8-15%
// < LIQUIDITY_WARN = fail

// --- Non-CNY Exposure (Q11) ---
export const FX_EXPOSURE_PASS = 0.1 // ≤10%
export const FX_EXPOSURE_WARN = 0.2 // 10-20%
// > FX_EXPOSURE_WARN = fail

// --- Single Position Concentration (Q9) ---
export const SINGLE_POSITION_PASS = 0.1 // ≤10%
export const SINGLE_POSITION_WARN = 0.2 // 10-20%
// > SINGLE_POSITION_WARN = fail

// --- HHI / Herfindahl-Hirschman Index (Q9) ---
export const HHI_PASS = 0.2
export const HHI_WARN = 0.35
// > HHI_WARN = fail

// --- S&P Quadrant Targets (Q1) ---
// 要花的钱(短期) / 保命的钱(保障) / 生钱的钱(增值) / 保本升值的钱(稳健)
export const SP_QUADRANT_TARGETS = {
  shortTerm: { target: 0.10, band: 0.05 },   // 10% ±5pp
  protection: { target: 0.20, band: 0.05 },   // 20% ±5pp
  growth: { target: 0.30, band: 0.05 },       // 30% ±5pp
  stable: { target: 0.40, band: 0.05 },       // 40% ±5pp
}

// --- Lifecycle (Q2): equity target = (110 - age)% ---
export const LIFECYCLE_BAND = 0.10 // ±10pp

// --- 4-3-2-1 Rule (Q6) ---
// 40% 生活 / 30% 投资 / 20% 储蓄 / 10% 保险
export const RULE_4321_TARGETS = {
  living: { target: 0.40, band: 0.05 },
  investment: { target: 0.30, band: 0.05 },
  savings: { target: 0.20, band: 0.05 },
  insurance: { target: 0.10, band: 0.05 },
}

// --- Insurance Gaps (Q4) ---
export const LIFE_INSURANCE_MULTIPLIER = 5 // 寿险 ≥ 5×年收入
export const CRITICAL_ILLNESS_MIN = 300_000 // 重疾 ≥ 30万

// --- Insurance Premium Ratio (Q4) ---
export const PREMIUM_RATIO_PASS_LOW = 0.10
export const PREMIUM_RATIO_PASS_HIGH = 0.20
// 10-20% pass; 5-10% or 20-30% warn; else fail

// --- Retirement Replacement Rate (Q8) ---
export const RETIREMENT_REPLACEMENT_TARGET = 0.70 // 70%
export const RETIREMENT_SUFFICIENCY_PASS = 1.10 // 110% of needed
export const RETIREMENT_SUFFICIENCY_WARN = 0.80 // 80-110%

// --- Retirement DCF Model (Q8) ---
export const RETIREMENT_LIFE_EXPECTANCY = 85
/** 未填写社保月领额时的默认替代估算：年收入的 30% */
export const SOCIAL_PENSION_DEFAULT_RATIO = 0.30

// 三档情景假设（年化）：通胀率与长期投资回报率
export const RETIREMENT_SCENARIOS: Record<
  'pessimistic' | 'neutral' | 'optimistic',
  { inflation: number; discount: number; label: string }
> = {
  pessimistic: { inflation: 0.03, discount: 0.02, label: '悲观（通胀3%/回报2%）' },
  neutral: { inflation: 0.02, discount: 0.03, label: '中性（通胀2%/回报3%）' },
  optimistic: { inflation: 0.015, discount: 0.04, label: '乐观（通胀1.5%/回报4%）' },
}

// --- Education Fund (Q17) ---
/** 教育成本档位：2026 年现价（4 年学费+生活费合计） */
export const EDUCATION_COST_TIERS: Record<
  'domestic' | 'overseas',
  { label: string; totalCost: number }
> = {
  domestic: { label: '国内本科', totalCost: 400_000 },
  overseas: { label: '海外本科', totalCost: 1_600_000 },
}
export const EDUCATION_SUFFICIENCY_PASS = 1.0
export const EDUCATION_SUFFICIENCY_WARN = 0.8

// --- Cash Drag (Q15) ---
export const CASH_DRAG_PASS = 0.10
export const CASH_DRAG_WARN = 0.20

// --- Passive Cash Flow Coverage (Q16) ---
export const CASHFLOW_COVERAGE_PASS = 1.5
export const CASHFLOW_COVERAGE_WARN = 1.0

// --- Risk Tolerance Mismatch (Q7) ---
// riskToleranceScore bands
export const RISK_TOLERANCE_CONSERVATIVE = 30  // 0-30: 保守型
export const RISK_TOLERANCE_MODERATE = 60      // 30-60: 稳健型
export const RISK_TOLERANCE_AGGRESSIVE = 100   // 60-100: 进取型

// --- Portfolio Sigma Targets (Q13) ---
// by risk profile
export const SIGMA_TARGETS: Record<string, { low: number; high: number }> = {
  conservative: { low: 0, high: 0.05 },
  moderate: { low: 0.05, high: 0.10 },
  aggressive: { low: 0.10, high: 0.18 },
}

// --- Sharpe Ratio (Q13) ---
export const SHARPE_PASS = 0.6

// --- VaR 95% 1-month tolerance by risk profile (Q13) ---
export const VAR_TOLERANCE: Record<string, number> = {
  conservative: 0.03,  // max 3% monthly loss
  moderate: 0.06,      // max 6%
  aggressive: 0.10,    // max 10%
}

// --- Maximum Drawdown tolerance (Q13) ---
export const MAX_DRAWDOWN_TOLERANCE: Record<string, number> = {
  conservative: 0.10,
  moderate: 0.20,
  aggressive: 0.35,
}

// --- Correlation Flag (Q14) ---
export const CORRELATION_HIGH = 0.8 // ρ > 0.8 = diversification illusion
export const LARGE_POSITION_THRESHOLD = 0.15 // > 15% of financial assets

// --- Credit / Duration Risk (Q12) ---
export const SINGLE_ISSUER_WMP_MAX = 0.5 // no single WMP > 50% of 固收

// --- Check Weights (sum ~ 100) ---
// 经验法则类检查（Q1 标准普尔四象限、Q6 4321法则）降权：
// 民间流传的配置比例缺乏研究依据，不应与有据可依的模型等权。
export const CHECK_WEIGHTS: Record<string, number> = {
  Q1: 4, Q2: 6, Q3: 12, Q4: 12, Q5: 12, Q6: 1, Q7: 12, Q8: 6,
  Q9: 8, Q10: 5, Q11: 3, Q12: 4, Q13: 3, Q14: 1, Q15: 1, Q16: 1,
  Q17: 5,
}

// --- Critical Checks (一票警告) ---
export const CRITICAL_CHECKS = ['Q3', 'Q4', 'Q5', 'Q7']

// --- Grade Bands ---
export const GRADE_BANDS: { grade: import('../types').Grade; min: number; label: string }[] = [
  { grade: 'A', min: 85, label: '健康' },
  { grade: 'B', min: 70, label: '良好' },
  { grade: 'C', min: 55, label: '关注' },
  { grade: 'D', min: 0, label: '风险' },
]
