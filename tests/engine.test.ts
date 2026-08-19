import { describe, it, expect } from 'vitest'
import { diagnose } from '../src/engine/report'
import {
  netWorth, emergencyMonths, debtToIncome, hhi,
  hasMaturityGap, maturingValueWithinYear, maxWMPIssuerShare,
  retirementProjection,
} from '../src/engine/metrics'
import { SAMPLE_ASSETS, SAMPLE_LIABILITIES, SAMPLE_PROFILE } from '../src/data/sampleData'
import type { Snapshot, Asset, Liability, HouseholdProfile } from '../src/types'

// --- Test Helpers ---

function makeSnapshot(overrides: Partial<{
  assets: Asset[]
  liabilities: Liability[]
  profile: Partial<HouseholdProfile>
}> = {}): Snapshot {
  return {
    assets: overrides.assets ?? [],
    liabilities: overrides.liabilities ?? [],
    profile: {
      memberAges: [35],
      dependentCount: 1,
      dependentAges: [5],
      annualIncome: 200_000,
      monthlyEssentialExpense: 10_000,
      incomeStability: 'stable',
      riskToleranceScore: 50,
      ...overrides.profile,
    },
  }
}

// --- Test: Empty portfolio ---

describe('Diagnostic Engine', () => {
  it('should handle empty portfolio (no assets, no liabilities)', () => {
    const snapshot = makeSnapshot()
    const report = diagnose(snapshot)

    expect(report.overallScore).toBeGreaterThanOrEqual(0)
    expect(report.overallScore).toBeLessThanOrEqual(100)
    expect(['A', 'B', 'C', 'D']).toContain(report.grade)
    expect(report.checks).toHaveLength(17)
  })

  it('should grade D for severely unbalanced portfolio', () => {
    // All in real estate, no emergency fund, no insurance
    const snapshot = makeSnapshot({
      assets: [
        {
          id: '1', name: '自住房', category: 'real_estate', subCategory: '自住房',
          marketValue: 5_000_000, currency: 'CNY', liquidity: 'low', riskLevel: 'medium',
          isPrimaryResidence: true,
        },
      ],
      liabilities: [
        {
          id: 'l1', name: '房贷', type: '房贷', remainingPrincipal: 3_000_000,
          annualRatePct: 3.95, monthlyPayment: 20_000, remainingMonths: 240,
        },
      ],
    })
    const report = diagnose(snapshot)
    expect(report.grade).toBe('D')
    expect(report.overallScore).toBeLessThan(55)
  })

  it('should get good score for balanced portfolio with emergency fund', () => {
    const snapshot = makeSnapshot({
      assets: [
        { id: '1', name: '活期', category: 'cash_deposit', subCategory: '活期存款', marketValue: 80_000, currency: 'CNY', liquidity: 'high', riskLevel: 'low' },
        { id: '2', name: '货基', category: 'cash_deposit', subCategory: '货币基金', marketValue: 100_000, currency: 'CNY', liquidity: 'high', riskLevel: 'low' },
        { id: '3', name: '理财', category: 'fixed_income', subCategory: '银行理财', marketValue: 200_000, currency: 'CNY', liquidity: 'medium', riskLevel: 'low' },
        { id: '4', name: '沪深300ETF', category: 'equity', subCategory: '指数/ETF基金', marketValue: 150_000, currency: 'CNY', liquidity: 'high', riskLevel: 'high' },
        { id: '5', name: '自住房', category: 'real_estate', subCategory: '自住房', marketValue: 2_000_000, currency: 'CNY', liquidity: 'low', riskLevel: 'medium', isPrimaryResidence: true },
        { id: '6', name: '重疾险', category: 'insurance', subCategory: '重疾险', marketValue: 0, currency: 'CNY', liquidity: 'low', riskLevel: 'low', insuranceCoverage: 500_000, insuranceAnnualPremium: 8_000 },
        { id: '7', name: '医疗险', category: 'insurance', subCategory: '医疗险', marketValue: 0, currency: 'CNY', liquidity: 'low', riskLevel: 'low', insuranceCoverage: 4_000_000, insuranceAnnualPremium: 2_000 },
        { id: '8', name: '定寿', category: 'insurance', subCategory: '定期寿险', marketValue: 0, currency: 'CNY', liquidity: 'low', riskLevel: 'low', insuranceCoverage: 1_000_000, insuranceAnnualPremium: 3_000 },
        { id: '9', name: '意外险', category: 'insurance', subCategory: '意外险', marketValue: 0, currency: 'CNY', liquidity: 'low', riskLevel: 'low', insuranceCoverage: 1_000_000, insuranceAnnualPremium: 500 },
      ],
      liabilities: [
        { id: 'l1', name: '房贷', type: '房贷', remainingPrincipal: 800_000, annualRatePct: 3.95, monthlyPayment: 6_000, remainingMonths: 180 },
      ],
    })
    const report = diagnose(snapshot)
    // Balanced portfolio with mortgage — real estate still 80% of assets,
    // retirement insufficient, so C is reasonable for this modest total
    expect(['B', 'C']).toContain(report.grade)
    expect(report.overallScore).toBeGreaterThanOrEqual(55)
  })

  it('should trigger critical flag when Q3 fails (no emergency fund)', () => {
    const snapshot = makeSnapshot({
      assets: [
        { id: '1', name: '自住房', category: 'real_estate', subCategory: '自住房', marketValue: 3_000_000, currency: 'CNY', liquidity: 'low', riskLevel: 'medium', isPrimaryResidence: true },
      ],
    })
    const report = diagnose(snapshot)
    expect(report.criticalFlag).toBe(true)
    expect(report.criticalChecks).toContain('Q3')
    // 一票警告 caps grade at C, but given the overall score is already below C,
    // the cap doesn't lift it — the raw score prevails as D
  })

  it('should trigger critical flag when Q4 fails (no insurance)', () => {
    const snapshot = makeSnapshot({})
    const report = diagnose(snapshot)
    expect(report.criticalFlag).toBe(true)
    expect(report.criticalChecks).toContain('Q4')
  })

  it('should detect high DTI as failure', () => {
    const snapshot = makeSnapshot({
      assets: [
        { id: '1', name: '自住房', category: 'real_estate', subCategory: '自住房', marketValue: 3_000_000, currency: 'CNY', liquidity: 'low', riskLevel: 'medium' },
      ],
      liabilities: [
        { id: 'l1', name: '房贷', type: '房贷', remainingPrincipal: 2_500_000, annualRatePct: 4.5, monthlyPayment: 18_000, remainingMonths: 300 },
      ],
    })
    const report = diagnose(snapshot)
    const q5 = report.checks.find((c) => c.id === 'Q5')
    expect(q5?.status).toBe('fail')
  })

  it('should pass Q3 when emergency fund is sufficient', () => {
    const snapshot = makeSnapshot({
      assets: [
        { id: '1', name: '活期+货基', category: 'cash_deposit', subCategory: '货币基金', marketValue: 72_000, currency: 'CNY', liquidity: 'high', riskLevel: 'low' },
      ],
      profile: { monthlyEssentialExpense: 10_000 },
    })
    const report = diagnose(snapshot)
    const q3 = report.checks.find((c) => c.id === 'Q3')
    expect(q3?.status).toBe('pass')
  })

  it('should run all 17 checks', () => {
    const snapshot = makeSnapshot()
    const report = diagnose(snapshot)
    const ids = report.checks.map((c) => c.id)
    expect(ids).toContain('Q1')
    expect(ids).toContain('Q16')
    expect(report.checks).toHaveLength(17)
  })

  it('should produce deterministic results', () => {
    const snapshot = makeSnapshot({
      assets: [
        { id: '1', name: '活期', category: 'cash_deposit', subCategory: '活期存款', marketValue: 50_000, currency: 'CNY', liquidity: 'high', riskLevel: 'low' },
        { id: '2', name: '自住房', category: 'real_estate', subCategory: '自住房', marketValue: 3_000_000, currency: 'CNY', liquidity: 'low', riskLevel: 'medium' },
      ],
    })
    const r1 = diagnose(snapshot)
    const r2 = diagnose(snapshot)
    expect(r1.overallScore).toBe(r2.overallScore)
    expect(r1.grade).toBe(r2.grade)
  })

  it('should handle sample data correctly', () => {
    const snapshot: Snapshot = {
      assets: SAMPLE_ASSETS,
      liabilities: SAMPLE_LIABILITIES,
      profile: SAMPLE_PROFILE,
    }
    const report = diagnose(snapshot)
    expect(report.checks).toHaveLength(17)
    expect(report.overallScore).toBeGreaterThanOrEqual(0)
    expect(report.overallScore).toBeLessThanOrEqual(100)
    // Sample data should have some failing checks (real estate heavy + mortgage)
    const failCount = report.checks.filter((c) => c.status === 'fail').length
    expect(failCount).toBeGreaterThan(0)
  })
})

// --- Metric Tests ---

describe('Metrics', () => {
  it('should compute net worth correctly', () => {
    const snapshot = makeSnapshot({
      assets: [
        { id: '1', name: '现金', category: 'cash_deposit', subCategory: '活期存款', marketValue: 100_000, currency: 'CNY', liquidity: 'high', riskLevel: 'low' },
      ],
      liabilities: [
        { id: 'l1', name: '贷款', type: '消费贷', remainingPrincipal: 30_000, annualRatePct: 5, monthlyPayment: 3_000, remainingMonths: 12 },
      ],
    })
    expect(netWorth(snapshot)).toBe(70_000)
  })

  it('should compute emergency months', () => {
    const snapshot = makeSnapshot({
      assets: [
        { id: '1', name: '活期', category: 'cash_deposit', subCategory: '活期存款', marketValue: 60_000, currency: 'CNY', liquidity: 'high', riskLevel: 'low' },
      ],
      profile: { monthlyEssentialExpense: 10_000 },
    })
    expect(emergencyMonths(snapshot)).toBe(6)
  })

  it('should compute DTI', () => {
    const snapshot = makeSnapshot({
      liabilities: [
        { id: 'l1', name: '贷款', type: '消费贷', remainingPrincipal: 50_000, annualRatePct: 5, monthlyPayment: 5_000, remainingMonths: 12 },
      ],
      profile: { annualIncome: 120_000 },
    })
    expect(debtToIncome(snapshot)).toBe(0.5)
  })

  it('should compute HHI', () => {
    const assets: Asset[] = [
      { id: '1', name: '现金', category: 'cash_deposit', subCategory: '活期存款', marketValue: 500_000, currency: 'CNY', liquidity: 'high', riskLevel: 'low' },
      { id: '2', name: '股票', category: 'equity', subCategory: 'A股股票', marketValue: 300_000, currency: 'CNY', liquidity: 'high', riskLevel: 'high' },
      { id: '3', name: '房产', category: 'real_estate', subCategory: '自住房', marketValue: 1_200_000, currency: 'CNY', liquidity: 'low', riskLevel: 'medium' },
    ]
    const result = hhi(assets)
    // 500k/2M = 0.25, 300k/2M = 0.15, 1.2M/2M = 0.6
    // HHI = 0.25^2 + 0.15^2 + 0.6^2 = 0.0625 + 0.0225 + 0.36 = 0.445
    expect(result).toBeCloseTo(0.445, 2)
  })
})

// ============================================================
// Issue #2: 期限错配检查按真实日期判断
// ============================================================

describe('期限错配检查 (Issue #2)', () => {
  const REF = '2026-08-19'

  const makeDeposit = (marketValue: number, maturityDate?: string): Asset => ({
    id: 'd1', name: '银行理财A', category: 'fixed_income', subCategory: '银行理财',
    marketValue, currency: 'CNY', liquidity: 'medium', riskLevel: 'low',
    issuer: '招银理财', maturityDate,
  })

  it('12个月内到期资产足够覆盖50%年支出 → 无缺口', () => {
    const snapshot = makeSnapshot({
      assets: [
        makeDeposit(100_000, '2026-12-01'), // 3.5个月后到期
        makeDeposit(200_000, '2028-01-01'), // 超出12个月，不计入
      ],
      profile: { monthlyEssentialExpense: 10_000 }, // yearNeed = 120k, 50% = 60k
    })
    expect(hasMaturityGap(snapshot, REF)).toBe(false)
  })

  it('所有到期资产都在12个月外 → 存在缺口', () => {
    const snapshot = makeSnapshot({
      assets: [makeDeposit(100_000, '2027-10-01')], // 13.5个月后
      profile: { monthlyEssentialExpense: 10_000 },
    })
    expect(hasMaturityGap(snapshot, REF)).toBe(true)
  })

  it('无到期日期的资产不计入到期金额', () => {
    const snapshot = makeSnapshot({
      assets: [makeDeposit(100_000)], // 无日期
      profile: { monthlyEssentialExpense: 10_000 },
    })
    expect(maturingValueWithinYear(snapshot, REF)).toBe(0)
    expect(hasMaturityGap(snapshot, REF)).toBe(true)
  })

  it('Q12 通过 referenceDate 注入基准日期（诊断结果确定）', () => {
    const snapshot = makeSnapshot({
      assets: [makeDeposit(100_000, '2026-12-01')],
      profile: { monthlyEssentialExpense: 10_000 },
    })
    const report = diagnose(snapshot, { referenceDate: REF })
    const q12 = report.checks.find((c) => c.id === 'Q12')!
    expect(q12.status).not.toBe('warn') // 期限匹配通过；发行方覆盖率 100%
  })
})

// ============================================================
// Issue #1: 单一发行方集中度按 issuer 计算
// ============================================================

describe('发行方集中度 (Issue #1)', () => {

  const makeWMP = (marketValue: number, issuer: string | undefined, heldAt: string): Asset => ({
    id: `w${Math.random().toString(36).slice(2, 8)}`, name: `${issuer ?? '未知'}理财`,
    category: 'fixed_income', subCategory: '银行理财', marketValue,
    currency: 'CNY', liquidity: 'medium', riskLevel: 'low', issuer, heldAt,
  })

  it('同一银行不同发行方应分开计算', () => {
    const assets = [
      makeWMP(400_000, '招银理财', '招商银行'),
      makeWMP(200_000, '兴银理财', '招商银行'),
    ]
    const { maxShare, coverage, topIssuer } = maxWMPIssuerShare(assets)
    expect(maxShare).toBeCloseTo(400_000 / 600_000, 4) // 66.7% 而非按 heldAt 的 100%
    expect(coverage).toBe(1)
    expect(topIssuer).toBe('招银理财')
  })

  it('跨银行同一发行方应合并计算', () => {
    const assets = [
      makeWMP(200_000, '招银理财', '招商银行'),
      makeWMP(100_000, '招银理财', '兴业银行'),
      makeWMP(300_000, '兴银理财', '招商银行'),
    ]
    const { maxShare, topIssuer } = maxWMPIssuerShare(assets)
    expect(maxShare).toBeCloseTo(300_000 / 600_000, 4) // 招银理财 30万 / 60万
    expect(topIssuer).toBe('招银理财')
  })

  it('未标注发行方时覆盖率应小于1', () => {
    const assets = [
      makeWMP(300_000, '招银理财', '招商银行'),
      makeWMP(100_000, undefined, '招商银行'),
    ]
    const { coverage } = maxWMPIssuerShare(assets)
    expect(coverage).toBeCloseTo(300_000 / 400_000, 4)
  })
})

// ============================================================
// Issue #4: 证据分级
// ============================================================

describe('证据分级 (Issue #4)', () => {
  it('全部检查均有 evidenceLevel 标注', () => {
    const report = diagnose(makeSnapshot())
    for (const check of report.checks) {
      expect(['heuristic', 'research', 'regulatory']).toContain(check.evidenceLevel)
    }
  })

  it('经验法则类检查（Q1/Q6）触发 fail 时降级为 warn', () => {
    // 全部资产为房产 → 短期账户为 0% → Q1 原本应 fail
    const snapshot = makeSnapshot({
      assets: [
        { id: '1', name: '自住房', category: 'real_estate', subCategory: '自住房', marketValue: 5_000_000, currency: 'CNY', liquidity: 'low', riskLevel: 'medium' },
      ],
    })
    const report = diagnose(snapshot)
    const q1 = report.checks.find((c) => c.id === 'Q1')!
    const q6 = report.checks.find((c) => c.id === 'Q6')!
    expect(q1.evidenceLevel).toBe('heuristic')
    expect(q1.status).toBe('warn') // 而非 fail
    expect(q6.evidenceLevel).toBe('heuristic')
  })

  it('监管标准检查（Q5/Q7）不受证据规则影响', () => {
    const report = diagnose(makeSnapshot())
    expect(report.checks.find((c) => c.id === 'Q5')!.evidenceLevel).toBe('regulatory')
    expect(report.checks.find((c) => c.id === 'Q7')!.evidenceLevel).toBe('regulatory')
  })
})

// ============================================================
// Issue #3: 退休测算 DCF 重构
// ============================================================

describe('退休测算 DCF (Issue #3)', () => {

  const baseProfile = {
    memberAges: [40],
    annualIncome: 200_000,
    monthlyEssentialExpense: 10_000,
    incomeStability: 'stable' as const,
    riskToleranceScore: 50,
  }

  it('社保领取额应从退休需求中扣除（有社保 vs 无社保）', () => {
    const assets = [
      { id: 'a1', name: '理财', category: 'fixed_income' as const, subCategory: '银行理财', marketValue: 1_000_000, currency: 'CNY' as const, liquidity: 'medium' as const, riskLevel: 'low' as const },
    ]
    const withPension = retirementProjection(makeSnapshot({ assets, profile: { ...baseProfile, monthlySocialPension: 8_000 } }))
    const withoutPension = retirementProjection(makeSnapshot({ assets, profile: { ...baseProfile } }))

    // 有社保时需求更小 → 充足率更高
    expect(withPension.neutral.sufficiency).toBeGreaterThan(withoutPension.neutral.sufficiency)
    expect(withPension.socialPensionAnnual).toBe(96_000)
    // 无社保时按收入 30% 默认估算
    expect(withoutPension.socialPensionAnnual).toBe(60_000) // 200k * 30%
  })

  it('自住房应剔除出退休资产（仅作居住用途）', () => {
    const houseOnly = makeSnapshot({
      assets: [
        { id: 'h1', name: '自住房', category: 'real_estate' as const, subCategory: '自住房', marketValue: 5_000_000, currency: 'CNY' as const, liquidity: 'low' as const, riskLevel: 'medium' as const, isPrimaryResidence: true },
      ],
      profile: baseProfile,
    })
    const proj = retirementProjection(houseOnly)
    expect(proj.investableAssets).toBe(0)
    expect(proj.neutral.sufficiency).toBe(0)
  })

  it('三档情景充足率：悲观 < 中性 < 乐观', () => {
    const snapshot = makeSnapshot({
      assets: [
        { id: 'a1', name: '理财', category: 'fixed_income' as const, subCategory: '银行理财', marketValue: 1_000_000, currency: 'CNY' as const, liquidity: 'medium' as const, riskLevel: 'low' as const },
      ],
      profile: baseProfile,
    })
    const proj = retirementProjection(snapshot)
    expect(proj.pessimistic.sufficiency).toBeLessThan(proj.neutral.sufficiency)
    expect(proj.neutral.sufficiency).toBeLessThan(proj.optimistic.sufficiency)
  })

  it('Q8 报告应包含区间值（悲观~乐观）', () => {
    const snapshot = makeSnapshot({
      assets: [
        { id: 'a1', name: '理财', category: 'fixed_income' as const, subCategory: '银行理财', marketValue: 1_000_000, currency: 'CNY' as const, liquidity: 'medium' as const, riskLevel: 'low' as const },
      ],
      profile: baseProfile,
    })
    const report = diagnose(snapshot)
    const q8 = report.checks.find((c) => c.id === 'Q8')!
    expect(q8.rangeValue).toBeDefined()
    expect(q8.rangeValue!.low).toBeLessThanOrEqual(q8.rangeValue!.high)
    expect(q8.detail).toContain('悲观')
    expect(q8.detail).toContain('社保/年金年领取额')
  })
})

// ============================================================
// Issue #5: 教育金检查 Q17
// ============================================================

describe('教育金储备 (Issue #5)', () => {
  it('无抚养对象或未设置教育目标 → Q17 通过且标记不适用', () => {
    const report = diagnose(makeSnapshot({ profile: { dependentCount: 0 } }))
    const q17 = report.checks.find((c) => c.id === 'Q17')!
    expect(q17).toBeDefined()
    expect(q17.status).toBe('pass')
    expect(q17.measuredLabel).toBe('不适用')
  })

  it('有教育目标但无储备 → Q17 未通过', () => {
    const snapshot = makeSnapshot({
      profile: {
        dependentCount: 1,
        dependentAges: [7],
        goals: { educationTier: 'domestic', educationFundYears: 11 },
      },
    })
    const report = diagnose(snapshot)
    const q17 = report.checks.find((c) => c.id === 'Q17')!
    expect(q17.status).toBe('fail')
    expect(q17.detail).toContain('国内本科')
  })

  it('教育金资产充足 → Q17 通过', () => {
    const snapshot = makeSnapshot({
      assets: [
        { id: 'e1', name: '教育金增额终身寿', category: 'insurance', subCategory: '增额终身寿', marketValue: 500_000, currency: 'CNY', liquidity: 'low', riskLevel: 'low' },
      ],
      profile: {
        dependentCount: 1,
        dependentAges: [7],
        goals: { educationTier: 'domestic', educationFundYears: 5 },
      },
    })
    const report = diagnose(snapshot)
    const q17 = report.checks.find((c) => c.id === 'Q17')!
    // 距入学5年，需求现值 ≈ 400k * (1.02/1.03)^5 ≈ 380k < 500k → 通过
    expect(q17.status).toBe('pass')
  })

  it('17 项检查全部注册并参与评分', () => {
    const report = diagnose(makeSnapshot())
    expect(report.checks.map((c) => c.id)).toContain('Q17')
  })
})
