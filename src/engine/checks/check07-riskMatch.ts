import type { CheckResult, Snapshot } from '../../types'
import { portfolioVolatility, growthAssetShare } from '../metrics'
import { getRiskProfileKey } from '../../data/riskQuestionnaire'
import { SIGMA_TARGETS, VAR_TOLERANCE } from '../../data/thresholds'
import { monthlyVaR95 } from '../metrics'

export function check07(snapshot: Snapshot): CheckResult {
  const score = snapshot.profile.riskToleranceScore
  const profileKey = getRiskProfileKey(score)
  const sigma = portfolioVolatility(snapshot.assets)
  const growth = growthAssetShare(snapshot.assets)
  const var95 = monthlyVaR95(snapshot.assets)

  const sigmaTarget = SIGMA_TARGETS[profileKey]
  const varTolerance = VAR_TOLERANCE[profileKey]

  // Determine actual portfolio risk level
  let actualRiskLevel: string
  if (sigma < 0.05) actualRiskLevel = 'conservative'
  else if (sigma < 0.10) actualRiskLevel = 'moderate'
  else actualRiskLevel = 'aggressive'

  const levelMap: Record<string, number> = { conservative: 1, moderate: 2, aggressive: 3 }
  const mismatch = Math.abs(levelMap[profileKey] - levelMap[actualRiskLevel])

  let status: CheckResult['status']
  if (mismatch === 0) status = 'pass'
  else if (mismatch === 1) status = 'warn'
  else status = 'fail'

  return {
    id: 'Q7',
    evidenceLevel: 'regulatory',
    name: '风险偏好匹配',
    description: '检查投资组合的实际风险水平是否与风险测评结果匹配',
    layer: 'qualitative',
    framework: '适当性管理(产品风险与投资者风险匹配)',
    status,
    severity: 'critical',
    score: status === 'pass' ? 100 : status === 'warn' ? 50 : 0,
    measuredValue: sigma,
    measuredLabel: `组合波动率 ${(sigma * 100).toFixed(1)}%`,
    threshold: `测评风险等级 vs 实际组合风险等级, 差2档→未通过`,
    detail: `风险测评得分: ${score}/100 → ${profileKey === 'conservative' ? '保守型' : profileKey === 'moderate' ? '稳健型' : '进取型'}\n组合年化波动率: ${(sigma * 100).toFixed(1)}% (目标区间 ${(sigmaTarget.low * 100).toFixed(0)}-${(sigmaTarget.high * 100).toFixed(0)}%)\n月VaR(95%): ${(var95 * 100).toFixed(2)}% (容忍上限 ${(varTolerance * 100).toFixed(0)}%)\n成长类资产占比: ${(growth * 100).toFixed(1)}%\n${
      status === 'fail'
        ? '⚠ 组合风险与风险偏好严重不匹配 — 可能持有超出承受能力的风险产品。'
        : status === 'warn'
          ? '组合风险与风险偏好存在一定偏差，建议微调。'
          : '组合风险水平与风险偏好匹配。'
    }`,
    actionRefs: ['A7-1'],
  }
}
