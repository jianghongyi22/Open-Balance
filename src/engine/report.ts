// ============================================================
// Open-Balance: Diagnostic Report Generator
//
// Runs all 16 checks → aggregates → produces DiagnosticReport.
// This is the main entry point for the diagnostic engine.
// ============================================================

import type { DiagnosticReport, Snapshot } from '../types'
import { ALL_CHECKS } from './checks'
import {
  computeWeightedScore,
  checkCriticalFlag,
  applyCrossValidation,
  determineGrade,
  dimensionScores,
} from './aggregate'

export function diagnose(snapshot: Snapshot): DiagnosticReport {
  // Run all checks
  let checks = ALL_CHECKS.map((fn) => fn(snapshot))

  // Cross-validation
  const { checks: validatedChecks, overrides } = applyCrossValidation(checks)
  checks = validatedChecks

  // Score
  const overallScore = computeWeightedScore(checks)
  const { qualitativeScore, quantitativeScore } = dimensionScores(checks)

  // Critical flag
  const { triggered, criticalChecks, cappedGrade } = checkCriticalFlag(checks)

  // Grade
  const { grade, label } = determineGrade(overallScore, triggered ? cappedGrade : null)

  return {
    overallScore: Math.round(overallScore),
    grade,
    gradeLabel: label,
    qualitativeScore: Math.round(qualitativeScore),
    quantitativeScore: Math.round(quantitativeScore),
    checks,
    criticalFlag: triggered,
    criticalChecks,
    crossValidationOverrides: overrides,
    generatedAt: new Date().toISOString(),
  }
}
