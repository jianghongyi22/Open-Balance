// ============================================================
// Open-Balance: Score Aggregation
//
// Combines 16 check results into an overall score with:
// - Weighted scoring
// - 一票警告 (critical check cap)
// - Qualitative vs quantitative cross-validation
// ============================================================

import type { CheckResult, CheckStatus, Grade } from '../types'
import {
  CHECK_WEIGHTS,
  CRITICAL_CHECKS,
  GRADE_BANDS,
} from '../data/thresholds'

// --- Weighted Score ---

export function computeWeightedScore(checks: CheckResult[]): number {
  let totalWeight = 0
  let weightedSum = 0

  for (const check of checks) {
    const weight = CHECK_WEIGHTS[check.id] ?? 1
    totalWeight += weight
    weightedSum += weight * check.score
  }

  if (totalWeight === 0) return 0
  return weightedSum / totalWeight
}

// --- 一票警告 ---

export function checkCriticalFlag(checks: CheckResult[]): {
  triggered: boolean
  criticalChecks: string[]
  cappedGrade: Grade
} {
  const failedCritical = checks.filter(
    (c) => CRITICAL_CHECKS.includes(c.id) && c.status === 'fail'
  )

  return {
    triggered: failedCritical.length > 0,
    criticalChecks: failedCritical.map((c) => c.id),
    cappedGrade: 'C', // cannot exceed 关注
  }
}

// --- Qualitative vs Quantitative Cross-Validation ---

// Map qualitative checks to their quantitative counterparts
const CROSS_VALIDATION_PAIRS: [string, string][] = [
  ['Q1', 'Q9'],  // S&P quadrant ↔ concentration
  ['Q2', 'Q13'], // lifecycle ↔ portfolio risk
  ['Q3', 'Q10'], // emergency ↔ liquidity risk
  ['Q4', 'Q16'], // insurance ↔ cash flow coverage
  ['Q6', 'Q15'], // 4321 ↔ cash drag
]

function statusRank(status: CheckStatus): number {
  return status === 'pass' ? 2 : status === 'warn' ? 1 : 0
}

export function applyCrossValidation(checks: CheckResult[]): {
  checks: CheckResult[]
  overrides: string[]
} {
  const overrides: string[] = []
  const updatedChecks = checks.map((c) => ({ ...c }))

  for (const [qualId, quantId] of CROSS_VALIDATION_PAIRS) {
    const qual = updatedChecks.find((c) => c.id === qualId)
    const quant = updatedChecks.find((c) => c.id === quantId)

    if (!qual || !quant) continue

    const qualRank = statusRank(qual.status)
    const quantRank = statusRank(quant.status)

    // If disagreement > 1 notch, override the qualitative check to 'warn'
    if (Math.abs(qualRank - quantRank) > 1) {
      const target = qualRank > quantRank ? qual : quant
      if (target.status !== 'warn') {
        target.status = 'warn'
        target.score = 50
        overrides.push(target.id)
      }
    }
  }

  return { checks: updatedChecks, overrides }
}

// --- Determine Grade ---

export function determineGrade(
  score: number,
  cappedGrade: Grade | null
): { grade: Grade; label: string } {
  let grade = GRADE_BANDS.find((b) => score >= b.min)!

  // If capped, use the capped grade if it's lower
  const gradeOrder: Grade[] = ['A', 'B', 'C', 'D']
  if (cappedGrade) {
    const originalIdx = gradeOrder.indexOf(grade.grade)
    const cappedIdx = gradeOrder.indexOf(cappedGrade)
    if (cappedIdx > originalIdx) {
      grade = GRADE_BANDS.find((b) => b.grade === cappedGrade)!
    }
  }

  return { grade: grade.grade, label: grade.label }
}

// --- Dimension Scores ---

export function dimensionScores(checks: CheckResult[]): {
  qualitativeScore: number
  quantitativeScore: number
} {
  const qualChecks = checks.filter((c) => c.layer === 'qualitative')
  const quantChecks = checks.filter((c) => c.layer === 'quantitative')

  return {
    qualitativeScore: computeWeightedScore(qualChecks),
    quantitativeScore: computeWeightedScore(quantChecks),
  }
}
