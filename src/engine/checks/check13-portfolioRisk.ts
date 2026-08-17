import type { CheckResult, Snapshot } from '../../types'
import { portfolioVolatility, sharpeRatio, monthlyVaR95, estimatedMaxDrawdown } from '../metrics'
import { getRiskProfileKey } from '../../data/riskQuestionnaire'
import { SIGMA_TARGETS, SHARPE_PASS, VAR_TOLERANCE, MAX_DRAWDOWN_TOLERANCE } from '../../data/thresholds'

export function check13(snapshot: Snapshot): CheckResult {
  const sigma = portfolioVolatility(snapshot.assets)
  const sharpe = sharpeRatio(snapshot.assets)
  const var95 = monthlyVaR95(snapshot.assets)
  const maxDD = estimatedMaxDrawdown(snapshot.assets)
  const profileKey = getRiskProfileKey(snapshot.profile.riskToleranceScore)

  const sigmaTarget = SIGMA_TARGETS[profileKey]
  const varTol = VAR_TOLERANCE[profileKey]
  const ddTol = MAX_DRAWDOWN_TOLERANCE[profileKey]

  const sigmaOk = sigma >= sigmaTarget.low && sigma <= sigmaTarget.high
  const sharpeOk = sharpe >= SHARPE_PASS
  const varOk = var95 <= varTol
  const ddOk = maxDD <= ddTol

  const fails = [sigmaOk, sharpeOk, varOk, ddOk].filter((x) => !x).length

  let status: CheckResult['status']
  if (fails === 0) status = 'pass'
  else if (fails === 1) status = 'warn'
  else status = 'fail'

  return {
    id: 'Q13',
    name: '组合风险量化指标',
    description: '计算组合波动率、夏普比率、VaR和最大回撤，综合评估风险收益特征',
    layer: 'quantitative',
    status,
    severity: 'high',
    score: status === 'pass' ? 100 : status === 'warn' ? 50 : 0,
    measuredValue: sigma,
    measuredLabel: `年化波动率 ${(sigma * 100).toFixed(1)}%`,
    threshold: `波动率${(sigmaTarget.low * 100).toFixed(0)}-${(sigmaTarget.high * 100).toFixed(0)}%; 夏普≥${SHARPE_PASS}; VaR≤${(varTol * 100).toFixed(0)}%; 最大回撤≤${(ddTol * 100).toFixed(0)}%`,
    detail: [
      `年化波动率: ${(sigma * 100).toFixed(1)}% (${profileKey === 'conservative' ? '保守' : profileKey === 'moderate' ? '稳健' : '进取'}型目标 ${(sigmaTarget.low * 100).toFixed(0)}-${(sigmaTarget.high * 100).toFixed(0)}%) ${sigmaOk ? '✓' : '⚠'}`,
      `夏普比率: ${sharpe.toFixed(2)} (≥${SHARPE_PASS}为健康) ${sharpeOk ? '✓' : '⚠'}`,
      `月VaR(95%): ${(var95 * 100).toFixed(2)}% (≤${(varTol * 100).toFixed(0)}%为容忍) ${varOk ? '✓' : '⚠'}`,
      `估计最大回撤: ${(maxDD * 100).toFixed(1)}% (≤${(ddTol * 100).toFixed(0)}%为容忍) ${ddOk ? '✓' : '⚠'}`,
      `\n⚠ 注意：以上指标基于大类资产层面的静态参数估算，仅作教育参考。`,
    ].join('\n'),
    actionRefs: ['A13-1'],
  }
}
