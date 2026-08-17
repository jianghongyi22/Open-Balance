// ============================================================
// Open-Balance: Scenario Analysis
//
// Applies market/economic shocks to a snapshot to produce
// a hypothetical transformed snapshot for re-diagnosis.
// ============================================================

import type { Snapshot, ScenarioShocks, Asset, ScenarioResult } from '../types'
import { diagnose } from '../engine/report'

export function applyShocks(snapshot: Snapshot, shocks: ScenarioShocks): Snapshot {
  const shockedAssets: Asset[] = snapshot.assets.map((asset) => {
    let newValue = asset.marketValue

    // Stock market shock (apply to equity and some growth assets)
    if (shocks.stockMarketPct !== 0) {
      if (asset.category === 'equity') {
        newValue *= 1 + shocks.stockMarketPct / 100
      }
      // Partial impact on growth-oriented other assets
      if (
        asset.category === 'precious_metals_alternative' ||
        (asset.category === 'other' && ['股权/期权'].includes(asset.subCategory ?? ''))
      ) {
        newValue *= 1 + shocks.stockMarketPct / 100 * 0.5
      }
    }

    // Property market shock
    if (shocks.propertyMarketPct !== 0 && asset.category === 'real_estate') {
      newValue *= 1 + shocks.propertyMarketPct / 100
    }

    // Interest rate shock (affects fixed income)
    if (shocks.interestRateBps !== 0) {
      if (asset.category === 'fixed_income') {
        // Bond price change ≈ -duration * rate change
        // Assume duration ≈ 3 for the portfolio
        const duration = 3
        const rateChange = shocks.interestRateBps / 10000
        newValue *= 1 - duration * rateChange
      }
    }

    // FX rate shock (affects non-CNY assets)
    if (shocks.fxRatePct !== 0 && asset.currency !== 'CNY') {
      newValue *= 1 + shocks.fxRatePct / 100
    }

    // Clamp to non-negative
    newValue = Math.max(0, newValue)

    return { ...asset, marketValue: Math.round(newValue) }
  })

  // Income interruption shock (doesn't change assets, but we note it)
  const shockedProfile = { ...snapshot.profile }
  if (shocks.incomeInterruptionMonths > 0) {
    // For income interruption, we reduce annual income proportionally
    const reductionRatio = shocks.incomeInterruptionMonths / 12
    shockedProfile.annualIncome = Math.round(
      shockedProfile.annualIncome * (1 - reductionRatio)
    )
  }

  return {
    assets: shockedAssets,
    liabilities: snapshot.liabilities, // Liabilities don't change
    profile: shockedProfile,
  }
}

export function runScenario(
  baseline: Snapshot,
  shocks: ScenarioShocks,
  name: string
): ScenarioResult {
  const baselineReport = diagnose(baseline)
  const shockedSnapshot = applyShocks(baseline, shocks)
  const shockedReport = diagnose(shockedSnapshot)

  const checkDiffs = baselineReport.checks.map((bc) => {
    const sc = shockedReport.checks.find((c) => c.id === bc.id)!
    return {
      checkId: bc.id,
      checkName: bc.name,
      baselineStatus: bc.status,
      shockedStatus: sc.status,
      scoreDiff: sc.score - bc.score,
    }
  })

  const gradeChange =
    baselineReport.grade !== shockedReport.grade
      ? `${baselineReport.grade}→${shockedReport.grade}`
      : null

  return {
    name,
    shocks,
    baselineReport,
    shockedReport,
    scoreDiff: shockedReport.overallScore - baselineReport.overallScore,
    gradeChange,
    checkDiffs,
  }
}

// --- Scenario presets ---

export const SCENARIO_PRESETS: { name: string; shocks: ScenarioShocks; description: string }[] = [
  {
    name: '股市回调 -20%',
    shocks: { stockMarketPct: -20, propertyMarketPct: 0, interestRateBps: 0, fxRatePct: 0, incomeInterruptionMonths: 0 },
    description: '假设A股市场出现20%的回调',
  },
  {
    name: '房价下跌 -10%',
    shocks: { stockMarketPct: 0, propertyMarketPct: -10, interestRateBps: 0, fxRatePct: 0, incomeInterruptionMonths: 0 },
    description: '假设房地产市场继续调整10%',
  },
  {
    name: '加息100bp',
    shocks: { stockMarketPct: 0, propertyMarketPct: 0, interestRateBps: 100, fxRatePct: 0, incomeInterruptionMonths: 0 },
    description: '假设利率上升100个基点(1%)',
  },
  {
    name: '人民币升值5%',
    shocks: { stockMarketPct: 0, propertyMarketPct: 0, interestRateBps: 0, fxRatePct: -5, incomeInterruptionMonths: 0 },
    description: '假设人民币升值5%',
  },
  {
    name: '收入中断6个月',
    shocks: { stockMarketPct: 0, propertyMarketPct: 0, interestRateBps: 0, fxRatePct: 0, incomeInterruptionMonths: 6 },
    description: '假设主要收入来源中断6个月',
  },
  {
    name: '股房双杀',
    shocks: { stockMarketPct: -30, propertyMarketPct: -15, interestRateBps: 0, fxRatePct: 0, incomeInterruptionMonths: 0 },
    description: '最坏情景：股市暴跌30%同时房价下跌15%',
  },
]
