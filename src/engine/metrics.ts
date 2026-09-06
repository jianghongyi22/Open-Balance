// ============================================================
// Open-Balance: Derived Metrics
//
// Pure functions that compute all derived financial metrics
// from a Snapshot. These feed into the 16 diagnostic checks.
// ============================================================

import type { Snapshot, Asset, AssetCategory } from '../types'
import {
  CATEGORY_QUADRANT,
  EXPECTED_RETURNS,
  VOLATILITIES,
  CORRELATION_MATRIX,
  RISK_FREE_RATE,
} from '../data/marketParams'
import { ASSET_CATEGORY_ORDER } from '../types'
import { parseDateToMs } from '../utils/dates'
import {
  RETIREMENT_REPLACEMENT_TARGET,
  RETIREMENT_LIFE_EXPECTANCY,
  SOCIAL_PENSION_DEFAULT_RATIO,
  RETIREMENT_SCENARIOS,
  EDUCATION_COST_TIERS,
} from '../data/thresholds'

// --- Basic totals ---

export function totalAssets(assets: Asset[]): number {
  return assets.reduce((sum, a) => sum + a.marketValue, 0)
}

export function totalLiabilities(snapshot: Snapshot): number {
  return snapshot.liabilities.reduce((sum, l) => sum + l.remainingPrincipal, 0)
}

export function netWorth(snapshot: Snapshot): number {
  return totalAssets(snapshot.assets) - totalLiabilities(snapshot)
}

// --- Category breakdown ---

export function categoryTotal(assets: Asset[], category: AssetCategory): number {
  return assets
    .filter((a) => a.category === category)
    .reduce((sum, a) => sum + a.marketValue, 0)
}

export function categoryShare(assets: Asset[], category: AssetCategory): number {
  const total = totalAssets(assets)
  if (total === 0) return 0
  return categoryTotal(assets, category) / total
}

export function categoryBreakdown(assets: Asset[]): Record<AssetCategory, number> {
  const breakdown: Partial<Record<AssetCategory, number>> = {}
  for (const cat of ASSET_CATEGORY_ORDER) {
    breakdown[cat] = categoryTotal(assets, cat)
  }
  return breakdown as Record<AssetCategory, number>
}

// --- Emergency Fund (Q3) ---

export function emergencyMonths(snapshot: Snapshot): number {
  const liquidAssets = snapshot.assets
    .filter((a) => a.liquidity === 'high' && a.category === 'cash_deposit')
    .reduce((sum, a) => sum + a.marketValue, 0)

  const monthlyExpense = snapshot.profile.monthlyEssentialExpense
  if (monthlyExpense <= 0) return 0
  return liquidAssets / monthlyExpense
}

// --- DTI / Debt-to-Income (Q5) ---

export function debtToIncome(snapshot: Snapshot): number {
  const totalMonthlyPayment = snapshot.liabilities.reduce(
    (sum, l) => sum + l.monthlyPayment,
    0
  )
  const monthlyIncome = snapshot.profile.annualIncome / 12
  if (monthlyIncome <= 0) return 0
  return totalMonthlyPayment / monthlyIncome
}

// --- Total Leverage Ratio (Q5) ---

export function leverageRatio(snapshot: Snapshot): number {
  const ta = totalAssets(snapshot.assets)
  if (ta === 0) return 0
  return totalLiabilities(snapshot) / ta
}

// --- Real Estate Share (Q9) ---

export function realEstateShare(assets: Asset[]): number {
  return categoryShare(assets, 'real_estate')
}

// --- Liquidity Ratio (Q10) ---

export function liquidityRatio(assets: Asset[]): number {
  const total = totalAssets(assets)
  if (total === 0) return 0
  const liquid = assets
    .filter((a) => a.liquidity === 'high')
    .reduce((sum, a) => sum + a.marketValue, 0)
  return liquid / total
}

// --- Low-Liquidity Ratio (Q10) ---

export function illiquidRatio(assets: Asset[]): number {
  const total = totalAssets(assets)
  if (total === 0) return 0
  const illiquid = assets
    .filter((a) => a.liquidity === 'low')
    .reduce((sum, a) => sum + a.marketValue, 0)
  return illiquid / total
}

// --- Non-CNY Exposure (Q11) ---

export function fxExposure(assets: Asset[]): number {
  const financialAssets = assets
    .filter((a) => a.category !== 'real_estate')
    .reduce((sum, a) => sum + a.marketValue, 0)
  if (financialAssets === 0) return 0
  const nonCNY = assets
    .filter((a) => a.currency !== 'CNY' && a.category !== 'real_estate')
    .reduce((sum, a) => sum + a.marketValue, 0)
  return nonCNY / financialAssets
}

// --- Single Position Concentration (Q9) ---

export function maxSinglePositionShare(assets: Asset[]): number {
  const financialAssets = assets
    .filter((a) => a.category !== 'real_estate')
    .reduce((sum, a) => sum + a.marketValue, 0)
  if (financialAssets === 0) return 0

  const maxSingle = Math.max(
    ...assets
      .filter((a) => a.category !== 'real_estate')
      .map((a) => a.marketValue),
    0
  )
  return maxSingle / financialAssets
}

// --- HHI / Herfindahl-Hirschman Index (Q9) ---

export function hhi(assets: Asset[]): number {
  const total = totalAssets(assets)
  if (total === 0) return 0
  const shares = ASSET_CATEGORY_ORDER.map((cat) => {
    const ct = categoryTotal(assets, cat)
    return (ct / total) ** 2
  })
  return shares.reduce((sum, s) => sum + s, 0)
}

// --- S&P Quadrant Allocation (Q1) ---

export function spQuadrantAllocation(assets: Asset[]): {
  shortTerm: number
  protection: number
  growth: number
  stable: number
} {
  const total = totalAssets(assets)
  if (total === 0) return { shortTerm: 0, protection: 0, growth: 0, stable: 0 }

  const quadrantTotals = {
    shortTerm: 0,
    protection: 0,
    growth: 0,
    stable: 0,
  }

  for (const asset of assets) {
    const quadrant = CATEGORY_QUADRANT[asset.category]
    quadrantTotals[quadrant] += asset.marketValue
  }

  return {
    shortTerm: quadrantTotals.shortTerm / total,
    protection: quadrantTotals.protection / total,
    growth: quadrantTotals.growth / total,
    stable: quadrantTotals.stable / total,
  }
}

// --- Lifecycle Age (Q2) ---

export function oldestAge(profile: Snapshot['profile']): number {
  return Math.max(...profile.memberAges, 0)
}

/**
 * 生命周期检查使用的"经济支柱年龄"：
 * - 优先使用档案填写的 breadwinnerAge
 * - 否则取 60 岁以下成员的最大年龄（避免把同住的退休老人
 *   年龄误作家庭风险年龄，压低权益配置目标）
 * - 全部成员 ≥60 岁时退回最大年龄
 */
export function lifecycleAge(profile: Snapshot['profile']): number {
  if (profile.breadwinnerAge && profile.breadwinnerAge > 0) {
    return profile.breadwinnerAge
  }
  const workingAges = profile.memberAges.filter((a) => a < 60)
  if (workingAges.length > 0) {
    return Math.max(...workingAges)
  }
  return oldestAge(profile)
}

export function lifecycleEquityTarget(age: number): number {
  return Math.max(0, (110 - age) / 100)
}

export function growthAssetShare(assets: Asset[]): number {
  const total = totalAssets(assets)
  if (total === 0) return 0
  const growthTotal = assets
    .filter(
      (a) =>
        CATEGORY_QUADRANT[a.category] === 'growth'
    )
    .reduce((sum, a) => sum + a.marketValue, 0)
  return growthTotal / total
}

// --- Insurance Gap (Q4) ---

export function totalLifeCoverage(assets: Asset[]): number {
  return assets
    .filter(
      (a) =>
        a.category === 'insurance' &&
        (a.subCategory === '定期寿险' || a.subCategory === '增额终身寿') &&
        (a.insuranceCoverage ?? 0) > 0
    )
    .reduce((sum, a) => sum + (a.insuranceCoverage ?? 0), 0)
}

export function totalCriticalIllnessCoverage(assets: Asset[]): number {
  return assets
    .filter(
      (a) =>
        a.category === 'insurance' &&
        a.subCategory === '重疾险' &&
        (a.insuranceCoverage ?? 0) > 0
    )
    .reduce((sum, a) => sum + (a.insuranceCoverage ?? 0), 0)
}

export function hasMedicalInsurance(assets: Asset[]): boolean {
  return assets.some(
    (a) => a.category === 'insurance' && a.subCategory === '医疗险'
  )
}

export function hasAccidentInsurance(assets: Asset[]): boolean {
  return assets.some(
    (a) => a.category === 'insurance' && a.subCategory === '意外险'
  )
}

export function totalInsurancePremiums(assets: Asset[]): number {
  return assets
    .filter((a) => a.category === 'insurance')
    .reduce((sum, a) => sum + (a.insuranceAnnualPremium ?? 0), 0)
}

export function premiumRatio(snapshot: Snapshot): number {
  if (snapshot.profile.annualIncome <= 0) return 0
  return totalInsurancePremiums(snapshot.assets) / snapshot.profile.annualIncome
}

// --- Portfolio Metrics (Q13) ---

export function portfolioExpectedReturn(assets: Asset[]): number {
  const total = totalAssets(assets)
  if (total === 0) return 0
  let weightedReturn = 0
  for (const asset of assets) {
    const weight = asset.marketValue / total
    const er = asset.expectedReturnPct
      ? asset.expectedReturnPct / 100
      : EXPECTED_RETURNS[asset.category]
    weightedReturn += weight * er
  }
  return weightedReturn
}

export function portfolioVolatility(assets: Asset[]): number {
  // Use category-level weights and correlation matrix
  const total = totalAssets(assets)
  if (total === 0) return 0

  const weights = ASSET_CATEGORY_ORDER.map((cat) => {
    const ct = categoryTotal(assets, cat)
    return ct / total
  })

  const vols = ASSET_CATEGORY_ORDER.map((cat) => VOLATILITIES[cat])

  let variance = 0
  for (let i = 0; i < ASSET_CATEGORY_ORDER.length; i++) {
    for (let j = 0; j < ASSET_CATEGORY_ORDER.length; j++) {
      const catI = ASSET_CATEGORY_ORDER[i]
      const catJ = ASSET_CATEGORY_ORDER[j]
      const rho = CORRELATION_MATRIX[catI][catJ]
      variance += weights[i] * weights[j] * vols[i] * vols[j] * rho
    }
  }

  return Math.sqrt(Math.max(0, variance))
}

// 95% VaR for 1 month
export function monthlyVaR95(assets: Asset[]): number {
  const sigma = portfolioVolatility(assets)
  return 1.645 * sigma / Math.sqrt(12)
}

// Sharpe Ratio
export function sharpeRatio(assets: Asset[]): number {
  const er = portfolioExpectedReturn(assets)
  const sigma = portfolioVolatility(assets)
  if (sigma === 0) return 0
  return (er - RISK_FREE_RATE) / sigma
}

// Approximate maximum drawdown proxy (1.5 * annual sigma)
export function estimatedMaxDrawdown(assets: Asset[]): number {
  return Math.min(1.5 * portfolioVolatility(assets), 1.0)
}

// --- Cash Drag (Q15) ---

export function cashDragRatio(assets: Asset[]): number {
  const total = totalAssets(assets)
  if (total === 0) return 0

  // Cash + demand deposits only (exclude MMF and CDs for cash drag calculation)
  const idleCash = assets
    .filter(
      (a) =>
        a.category === 'cash_deposit' &&
        (a.subCategory === '活期存款' || !a.subCategory)
    )
    .reduce((sum, a) => sum + a.marketValue, 0)

  return idleCash / total
}

// --- Passive Cash Flow Coverage (Q16) ---

export function passiveMonthlyIncome(assets: Asset[]): number {
  const annual = assets.reduce((sum, a) => sum + (a.annualIncome ?? 0), 0)
  return annual / 12
}

export function cashFlowCoverage(snapshot: Snapshot): number {
  const monthlyExpense = snapshot.profile.monthlyEssentialExpense
  if (monthlyExpense <= 0) return 0
  return passiveMonthlyIncome(snapshot.assets) / monthlyExpense
}

// --- Retirement Projection (Q8) ---

export interface RetirementScenarioResult {
  /** 退休资金缺口现值（中性情景），0 表示无缺口 */
  gapPV: number
  /** 充足率 = 可投资资产现值 / 退休资金需求现值 */
  sufficiency: number
}

export interface RetirementProjection {
  neutral: RetirementScenarioResult
  pessimistic: RetirementScenarioResult
  optimistic: RetirementScenarioResult
  /** 扣除社保/年金后的年净需求（退休首年，按退休时点币值） */
  netAnnualNeed: number
  /** 社保/企业年金年领取额 */
  socialPensionAnnual: number
  /** 可计入退休用途的资产现值（剔除自住房） */
  investableAssets: number
  yearsToRetirement: number
  retirementYears: number
}

/**
 * 折现现金流（DCF）退休测算：
 * - 需求：年收入 × 替代率 − 社保/年金领取额，按通胀增长、按投资回报折现
 * - 资产：总资产剔除自住房（自住房仅作居住用途，不产生退休现金流）
 * - 三档情景：悲观 / 中性 / 乐观（通胀与回报假设见 thresholds）
 */
export function retirementProjection(snapshot: Snapshot): RetirementProjection {
  const profile = snapshot.profile
  const replacementRate = profile.goals?.retirementReplacementRate ?? RETIREMENT_REPLACEMENT_TARGET
  const retirementAge = profile.retirementAge ?? 60
  const age = oldestAge(profile)
  const yearsToRetirement = Math.max(0, retirementAge - age)
  const retirementYears = Math.max(1, RETIREMENT_LIFE_EXPECTANCY - retirementAge)

  // 社保/年金：优先用家庭档案填写值，否则按收入比例估算
  const socialPensionAnnual = profile.monthlySocialPension
    ? profile.monthlySocialPension * 12
    : profile.annualIncome * SOCIAL_PENSION_DEFAULT_RATIO

  // 退休首年的净需求（扣除社保后，按今天币值）
  const annualRetirementNeed = profile.annualIncome * replacementRate
  const netAnnualNeedToday = Math.max(0, annualRetirementNeed - socialPensionAnnual)

  // 可投资资产：剔除自住房（自住房不产生退休现金流）
  const investableAssets = snapshot.assets
    .filter(
      (a) =>
        !a.isPrimaryResidence &&
        !(a.category === 'real_estate' && a.subCategory === '自住房')
    )
    .reduce((sum, a) => sum + a.marketValue, 0)

  const computeScenario = (inflation: number, discount: number): RetirementScenarioResult => {
    if (netAnnualNeedToday <= 0) {
      // 社保已覆盖全部退休需求
      return { gapPV: 0, sufficiency: 99 }
    }
    // 净增长率 g = (1+通胀)/(1+回报)：每一年退休现金流折到今天的因子
    const g = (1 + inflation) / (1 + discount)
    // 需求现值 = 年净需求 × g^距退休年数 × Σ_{t=0}^{退休年限-1} g^t
    let annuitySum = 0
    for (let t = 0; t < retirementYears; t++) {
      annuitySum += Math.pow(g, t)
    }
    const needPV = netAnnualNeedToday * Math.pow(g, yearsToRetirement) * annuitySum

    if (needPV <= 0) return { gapPV: 0, sufficiency: 99 }
    return {
      gapPV: Math.round(needPV - investableAssets),
      sufficiency: investableAssets / needPV,
    }
  }

  return {
    neutral: computeScenario(
      RETIREMENT_SCENARIOS.neutral.inflation,
      RETIREMENT_SCENARIOS.neutral.discount
    ),
    pessimistic: computeScenario(
      RETIREMENT_SCENARIOS.pessimistic.inflation,
      RETIREMENT_SCENARIOS.pessimistic.discount
    ),
    optimistic: computeScenario(
      RETIREMENT_SCENARIOS.optimistic.inflation,
      RETIREMENT_SCENARIOS.optimistic.discount
    ),
    netAnnualNeed: Math.round(netAnnualNeedToday * Math.pow(1 + RETIREMENT_SCENARIOS.neutral.inflation, yearsToRetirement)),
    socialPensionAnnual: Math.round(socialPensionAnnual),
    investableAssets: Math.round(investableAssets),
    yearsToRetirement,
    retirementYears,
  }
}

/** 兼容旧签名：返回中性情景充足率 */
export function retirementSufficiency(snapshot: Snapshot): number {
  return retirementProjection(snapshot).neutral.sufficiency
}

// --- Education Fund Projection (Q17) ---

export interface EducationProjection {
  /** 是否适用：无抚养对象或未设置教育目标时为 false */
  applicable: boolean
  /** 距入学年数 */
  yearsUntilEnrollment: number
  /** 目标档位 */
  tier: 'domestic' | 'overseas' | null
  /** 教育金需求现值（中性通胀/折现假设） */
  needPV: number
  /** 当前已定向的教育金资产（增额终身寿/年金险/名称含"教育"的资产） */
  earmarkedAssets: number
  /** 充足率 = earmarkedAssets / needPV */
  sufficiency: number
  /** 缺口现值 */
  gapPV: number
}

const EDUCATION_DEFAULT_ENROLLMENT_AGE = 18

export function educationProjection(snapshot: Snapshot): EducationProjection {
  const profile = snapshot.profile
  const tier = profile.goals?.educationTier ?? null

  if (profile.dependentCount <= 0 || !tier) {
    return {
      applicable: false,
      yearsUntilEnrollment: 0,
      tier,
      needPV: 0,
      earmarkedAssets: 0,
      sufficiency: 99,
      gapPV: 0,
    }
  }

  const maxDependentAge = Math.max(...profile.dependentAges, 0)
  const yearsUntilEnrollment = Math.max(
    1,
    profile.goals?.educationFundYears ??
      Math.max(0, EDUCATION_DEFAULT_ENROLLMENT_AGE - maxDependentAge)
  )

  // 与退休模型共用中性假设：通胀 2% / 折现 3%
  const { inflation, discount } = RETIREMENT_SCENARIOS.neutral
  const tierCost = EDUCATION_COST_TIERS[tier].totalCost
  // 入学时点成本按通胀增长，再折回今天
  const needPV = tierCost * Math.pow((1 + inflation) / (1 + discount), yearsUntilEnrollment)

  // 已定向教育金：储蓄型保险（增额终身寿/年金险）+ 名称含"教育"的资产
  const earmarkedAssets = snapshot.assets
    .filter(
      (a) =>
        (a.category === 'insurance' &&
          (a.subCategory === '增额终身寿' || a.subCategory === '年金险')) ||
        a.name.includes('教育')
    )
    .reduce((sum, a) => sum + a.marketValue, 0)

  const sufficiency = needPV > 0 ? earmarkedAssets / needPV : 99
  const gapPV = Math.round(Math.max(0, needPV - earmarkedAssets))

  return {
    applicable: true,
    yearsUntilEnrollment,
    tier,
    needPV: Math.round(needPV),
    earmarkedAssets: Math.round(earmarkedAssets),
    sufficiency,
    gapPV,
  }
}

// --- Maturity Ladder Check (Q12) ---

const DEPOSIT_LIKE_SUBCATEGORIES = ['定期存款', '大额存单', '银行理财']

/**
 * 12 个月内可到期兑现的固收/存款市值，是否足以覆盖未来一年的刚性支出。
 * 用 maturityDate/lockUpUntil 与基准日期精确比较；无日期的资产不计入。
 */
export function maturingValueWithinYear(
  snapshot: Snapshot,
  referenceDate: string
): number {
  const refMs = parseDateToMs(referenceDate) ?? Date.now()
  const oneYearLater = refMs + 365 * 86_400_000

  return snapshot.assets
    .filter(
      (a) =>
        (a.category === 'cash_deposit' && DEPOSIT_LIKE_SUBCATEGORIES.includes(a.subCategory ?? '')) ||
        (a.category === 'fixed_income' && DEPOSIT_LIKE_SUBCATEGORIES.includes(a.subCategory ?? ''))
    )
    .reduce((sum, a) => {
      const dueMs =
        parseDateToMs(a.maturityDate) ?? parseDateToMs(a.lockUpUntil)
      if (dueMs === null) return sum
      if (dueMs >= refMs && dueMs <= oneYearLater) return sum + a.marketValue
      return sum
    }, 0)
}

export function hasMaturityGap(snapshot: Snapshot, referenceDate: string): boolean {
  const yearNeed = snapshot.profile.monthlyEssentialExpense * 12
  if (yearNeed === 0) return false
  const maturingInYear = maturingValueWithinYear(snapshot, referenceDate)
  return maturingInYear < yearNeed * 0.5
}

// --- Single WMP Issuer Concentration (Q12) ---

export interface IssuerConcentration {
  /** 单一发行方占固收总市值的最大比例 (0-1) */
  maxShare: number
  /** 该发行方名称（可能为 null，固收为空时） */
  topIssuer: string | null
  /** 已标注发行方的固收市值覆盖率 (0-1)。<1 说明部分资产缺 issuer，集中度可能被低估 */
  coverage: number
}

/**
 * 按发行方（issuer）而非持有机构（heldAt）计算固收集中度。
 * 未标注 issuer 的固收资产不计入集中度分子，但通过 coverage 暴露数据缺口。
 */
export function maxWMPIssuerShare(assets: Asset[]): IssuerConcentration {
  const fixedIncomeTotal = categoryTotal(assets, 'fixed_income')
  if (fixedIncomeTotal === 0) {
    return { maxShare: 0, topIssuer: null, coverage: 1 }
  }

  const wmpByIssuer: Record<string, number> = {}
  let taggedValue = 0

  for (const asset of assets) {
    if (asset.category !== 'fixed_income') continue
    if (asset.issuer) {
      wmpByIssuer[asset.issuer] = (wmpByIssuer[asset.issuer] || 0) + asset.marketValue
      taggedValue += asset.marketValue
    }
  }

  let topIssuer: string | null = null
  let maxIssuerValue = 0
  for (const [issuer, value] of Object.entries(wmpByIssuer)) {
    if (value > maxIssuerValue) {
      maxIssuerValue = value
      topIssuer = issuer
    }
  }

  // 集中度按已标注发行方的部分计算；覆盖率单独暴露数据缺口
  const base = taggedValue > 0 ? taggedValue : fixedIncomeTotal
  return {
    maxShare: maxIssuerValue / base,
    topIssuer,
    coverage: taggedValue / fixedIncomeTotal,
  }
}

// --- Correlation Risk: find pairwise high correlations (Q14) ---

export function findHighCorrelationPairs(assets: Asset[]): {
  cat1: AssetCategory
  cat2: AssetCategory
  rho: number
  share1: number
  share2: number
}[] {
  const total = totalAssets(assets)
  if (total === 0) return []

  const shares = ASSET_CATEGORY_ORDER.map((cat) => ({
    cat,
    share: categoryTotal(assets, cat) / total,
  }))

  const largePositions = shares.filter((s) => s.share > 0.15)

  const pairs: {
    cat1: AssetCategory
    cat2: AssetCategory
    rho: number
    share1: number
    share2: number
  }[] = []

  for (let i = 0; i < largePositions.length; i++) {
    for (let j = i + 1; j < largePositions.length; j++) {
      const cat1 = largePositions[i].cat
      const cat2 = largePositions[j].cat
      const rho = CORRELATION_MATRIX[cat1][cat2]
      if (rho > 0.8) {
        pairs.push({
          cat1,
          cat2,
          rho,
          share1: largePositions[i].share,
          share2: largePositions[j].share,
        })
      }
    }
  }

  return pairs
}

// --- Financial assets total (excluding real estate, for certain calcs) ---
export function financialAssetsTotal(assets: Asset[]): number {
  return assets
    .filter((a) => a.category !== 'real_estate')
    .reduce((sum, a) => sum + a.marketValue, 0)
}

// --- 4-3-2-1 Rule allocation (Q6) ---
export function rule4321Allocation(snapshot: Snapshot): {
  living: number
  investment: number
  savings: number
  insurance: number
} {
  const income = snapshot.profile.annualIncome
  if (income <= 0) return { living: 0, investment: 0, savings: 0, insurance: 0 }

  // Approximate 生活 = annual expense / income
  const living = (snapshot.profile.monthlyEssentialExpense * 12) / income

  // 投资 = growth assets' annual contribution proxy
  const monthlyInvestments = snapshot.assets.reduce(
    (sum, a) => sum + (a.monthlyContribution ?? 0),
    0
  )
  const investment = (monthlyInvestments * 12) / income

  // 保险 = insurance premium ratio
  const insurance = premiumRatio(snapshot)

  // 储蓄 = remainder
  const savings = Math.max(0, 1 - living - investment - insurance)

  return { living, investment, savings, insurance }
}
