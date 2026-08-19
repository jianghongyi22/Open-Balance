// ============================================================
// Open-Balance: Diagnostic Report Generator
//
// Runs all checks → applies evidence rules → cross-validation
// → aggregates → produces DiagnosticReport.
// This is the main entry point for the diagnostic engine.
// ============================================================

import type { DiagnosticReport, Snapshot, EngineContext } from '../types'
import { ALL_CHECKS } from './checks'
import {
  computeWeightedScore,
  checkCriticalFlag,
  applyCrossValidation,
  applyEvidenceRules,
  determineGrade,
  dimensionScores,
} from './aggregate'

export interface DiagnoseOptions {
  /** 诊断基准日期（YYYY-MM-DD），默认今天。 */
  referenceDate?: string
}

export function diagnose(
  snapshot: Snapshot,
  options?: DiagnoseOptions
): DiagnosticReport {
  const ctx: EngineContext = {
    referenceDate:
      options?.referenceDate ?? new Date().toISOString().slice(0, 10),
  }

  // Run all checks
  let checks = ALL_CHECKS.map((fn) => fn(snapshot, ctx))

  // Evidence rules: 经验法则类检查封顶"警告"，不得触发 fail
  checks = applyEvidenceRules(checks)

  // Qualitative × quantitative cross-validation
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
