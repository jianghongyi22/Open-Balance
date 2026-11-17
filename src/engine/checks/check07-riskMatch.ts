import type { CheckResult, Snapshot, EngineContext } from '../../types'
import { portfolioVolatility, growthAssetShare, monthlyVaR95 } from '../metrics'
import { getRiskProfileKey } from '../../data/riskQuestionnaire'
import { SIGMA_TARGETS, VAR_TOLERANCE } from '../../data/thresholds'
import { pick, pickLocale } from '../../i18n/checkHelpers'

const T_ZH = {
  name: '风险偏好匹配',
  description: '检查投资组合的实际风险水平是否与风险测评结果匹配',
  threshold: '测评风险等级 vs 实际组合风险等级, 差2档→未通过',
  measured: (s: number) => `组合波动率 ${(s * 100).toFixed(1)}%`,
  profileNames: { conservative: '保守型', moderate: '稳健型', aggressive: '进取型' },
  detail: (score: number, profileLabel: string, sigma: number, sigmaLow: number, sigmaHigh: number, var95: number, varTol: number, growth: number, verdict: string) =>
    `风险测评得分: ${score}/100 → ${profileLabel}\n组合年化波动率: ${(sigma * 100).toFixed(1)}% (目标区间 ${(sigmaLow * 100).toFixed(0)}-${(sigmaHigh * 100).toFixed(0)}%)\n月VaR(95%): ${(var95 * 100).toFixed(2)}% (容忍上限 ${(varTol * 100).toFixed(0)}%)\n成长类资产占比: ${(growth * 100).toFixed(1)}%\n${verdict}`,
  verdict: {
    fail: '⚠ 组合风险与风险偏好严重不匹配 — 可能持有超出承受能力的风险产品。',
    warn: '组合风险与风险偏好存在一定偏差，建议微调。',
    pass: '组合风险水平与风险偏好匹配。',
  },
}

const T_EN = {
  name: 'Risk Profile Match',
  description: 'Checks whether the portfolio\'s actual risk level matches the risk assessment result',
  threshold: 'assessed risk level vs. actual portfolio risk; 2 levels apart → fail',
  measured: (s: number) => `portfolio volatility ${(s * 100).toFixed(1)}%`,
  profileNames: { conservative: 'Conservative', moderate: 'Moderate', aggressive: 'Aggressive' },
  detail: (score: number, profileLabel: string, sigma: number, sigmaLow: number, sigmaHigh: number, var95: number, varTol: number, growth: number, verdict: string) =>
    `Risk score: ${score}/100 → ${profileLabel}\nAnnualized volatility: ${(sigma * 100).toFixed(1)}% (target ${(sigmaLow * 100).toFixed(0)}-${(sigmaHigh * 100).toFixed(0)}%)\nMonthly VaR(95%): ${(var95 * 100).toFixed(2)}% (tolerance ${(varTol * 100).toFixed(0)}%)\nGrowth share: ${(growth * 100).toFixed(1)}%\n${verdict}`,
  verdict: {
    fail: '⚠ Portfolio risk is seriously mismatched with risk tolerance — holdings may exceed what you can bear.',
    warn: 'Portfolio risk deviates somewhat from risk tolerance; consider fine-tuning.',
    pass: 'Portfolio risk matches your risk profile.',
  },
}

export function check07(snapshot: Snapshot, ctx?: EngineContext): CheckResult {
  const locale = pickLocale(ctx?.locale)
  const T = pick(locale, T_ZH, T_EN)
  const score = snapshot.profile.riskToleranceScore
  const profileKey = getRiskProfileKey(score)
  const sigma = portfolioVolatility(snapshot.assets)
  const growth = growthAssetShare(snapshot.assets)
  const var95 = monthlyVaR95(snapshot.assets)

  const sigmaTarget = SIGMA_TARGETS[profileKey]
  const varTolerance = VAR_TOLERANCE[profileKey]

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
    name: T.name,
    description: T.description,
    layer: 'qualitative',
    framework: locale === 'en' ? 'Product suitability (risk matching)' : '适当性管理(产品风险与投资者风险匹配)',
    status,
    severity: 'critical',
    score: status === 'pass' ? 100 : status === 'warn' ? 50 : 0,
    measuredValue: sigma,
    measuredLabel: T.measured(sigma),
    threshold: T.threshold,
    detail: T.detail(score, T.profileNames[profileKey as keyof typeof T.profileNames], sigma, sigmaTarget.low, sigmaTarget.high, var95, varTolerance, growth, T.verdict[status]),
    actionRefs: ['A7-1'],
  }
}
