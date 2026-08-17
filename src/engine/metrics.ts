// ============================================================
// Open-Balance: Derived Metrics
//
// Pure functions that compute all derived financial metrics
// from a Snapshot. These feed into the 16 diagnostic checks.
// ============================================================

import type { Snapshot, Asset, AssetCategory } from '../types'
import {
  CATEGORY_LIQUIDITY,
  CATEGORY_QUADRANT,
  EXPECTED_RETURNS,
  VOLATILITIES,
  CORRELATION_MATRIX,
  RISK_FREE_RATE,
  INCOME_CATEGORIES,
} from '../data/marketParams'
import { ASSET_CATEGORY_ORDER } from '../types'

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

export function retirementSufficiency(snapshot: Snapshot): number {
  const profile = snapshot.profile
  const replacementRate = profile.goals?.retirementReplacementRate ?? 0.7
  const retirementAge = profile.retirementAge ?? 60
  const age = oldestAge(profile)
  const yearsToRetirement = Math.max(0, retirementAge - age)

  // Estimated life expectancy: 85
  const retirementYears = Math.max(0, 85 - retirementAge)

  // Annual retirement need (in today's CNY)
  const annualRetirementNeed = profile.annualIncome * replacementRate

  // Total retirement fund needed (simple multiplication, no discounting for prototype)
  const totalNeeded = annualRetirementNeed * retirementYears

  // Current retirement assets: pension-type savings + long-term investments
  const retirementAssets =
    categoryTotal(snapshot.assets, 'fixed_income') +
    categoryTotal(snapshot.assets, 'equity') * 0.5 + // assume 50% for retirement
    categoryTotal(snapshot.assets, 'insurance') * 1.0 + // savings insurance
    categoryTotal(snapshot.assets, 'real_estate') * 0.3 // partial rental income

  if (totalNeeded === 0) return 2.0 // very sufficient
  return retirementAssets / totalNeeded
}

// --- Maturity Ladder Check (Q12) ---

export function hasMaturityGap(snapshot: Snapshot): boolean {
  const monthlyExpense = snapshot.profile.monthlyEssentialExpense
  const yearNeed = monthlyExpense * 12

  // Get deposits/WMP maturing within 12 months
  const maturingInYear = snapshot.assets
    .filter(
      (a) =>
        (a.category === 'cash_deposit' && a.subCategory === '定期存款') ||
        (a.subCategory === '大额存单') ||
        (a.category === 'fixed_income' && a.subCategory === '银行理财')
    )
    .reduce((sum, a) => {
      if (!a.maturityDate && !a.lockUpUntil) return sum
      // Simple check: if have maturity/lockup date, assume some will mature
      return sum + a.marketValue * 0.3 // rough proxy
    }, 0)

  return maturingInYear < yearNeed * 0.5
}

// --- Single WMP Issuer Concentration (Q12) ---

export function maxWMPIssuerShare(assets: Asset[]): number {
  const fixedIncomeTotal = categoryTotal(assets, 'fixed_income')
  if (fixedIncomeTotal === 0) return 0

  const wmpByIssuer: Record<string, number> = {}
  for (const asset of assets) {
    if (asset.category === 'fixed_income' && asset.heldAt) {
      wmpByIssuer[asset.heldAt] =
        (wmpByIssuer[asset.heldAt] || 0) + asset.marketValue
    }
  }

  const maxShare = Math.max(
    ...Object.values(wmpByIssuer).map((v) => v / fixedIncomeTotal),
    0
  )
  return maxShare
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
