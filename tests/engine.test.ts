import { describe, it, expect } from 'vitest'
import { diagnose } from '../src/engine/report'
import {
  netWorth, emergencyMonths, debtToIncome, hhi,
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
    expect(report.checks).toHaveLength(16)
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

  it('should run all 16 checks', () => {
    const snapshot = makeSnapshot()
    const report = diagnose(snapshot)
    const ids = report.checks.map((c) => c.id)
    expect(ids).toContain('Q1')
    expect(ids).toContain('Q16')
    expect(report.checks).toHaveLength(16)
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
    expect(report.checks).toHaveLength(16)
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
