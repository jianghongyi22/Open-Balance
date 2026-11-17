import type { CheckResult, Snapshot, EngineContext } from '../../types'
import { portfolioVolatility, sharpeRatio, monthlyVaR95, estimatedMaxDrawdown } from '../metrics'
import { getRiskProfileKey } from '../../data/riskQuestionnaire'
import { SIGMA_TARGETS, SHARPE_PASS, VAR_TOLERANCE, MAX_DRAWDOWN_TOLERANCE } from '../../data/thresholds'
import { pick, pickLocale } from '../../i18n/checkHelpers'

const T_ZH = {
  name: '组合风险量化指标',
  description: '计算组合波动率、夏普比率、VaR和最大回撤，综合评估风险收益特征',
  threshold: (low: number, high: number, tol: number, dd: number) => `波动率${(low * 100).toFixed(0)}-${(high * 100).toFixed(0)}%; 夏普≥${SHARPE_PASS}; VaR≤${(tol * 100).toFixed(0)}%; 最大回撤≤${(dd * 100).toFixed(0)}%`,
  measured: (s: number) => `年化波动率 ${(s * 100).toFixed(1)}%`,
  profileNames: { conservative: '保守', moderate: '稳健', aggressive: '进取' },
  lines: {
    sigma: (s: number, name: string, low: number, high: number, mark: string) => `年化波动率: ${(s * 100).toFixed(1)}% (${name}型目标 ${(low * 100).toFixed(0)}-${(high * 100).toFixed(0)}%) ${mark}`,
    sharpe: (v: number, mark: string) => `夏普比率: ${v.toFixed(2)} (≥${SHARPE_PASS}为健康) ${mark}`,
    var: (v: number, tol: number, mark: string) => `月VaR(95%): ${(v * 100).toFixed(2)}% (≤${(tol * 100).toFixed(0)}%为容忍) ${mark}`,
    dd: (v: number, tol: number, mark: string) => `估计最大回撤: ${(v * 100).toFixed(1)}% (≤${(tol * 100).toFixed(0)}%为容忍) ${mark}`,
  },
  note: '\n⚠ 注意：以上指标基于大类资产层面的静态参数估算，仅作教育参考。',
}

const T_EN = {
  name: 'Portfolio Risk Metrics',
  description: 'Computes portfolio volatility, Sharpe ratio, VaR and max drawdown to assess the risk-return profile',
  threshold: (low: number, high: number, tol: number, dd: number) => `volatility ${(low * 100).toFixed(0)}-${(high * 100).toFixed(0)}%; Sharpe ≥${SHARPE_PASS}; VaR ≤${(tol * 100).toFixed(0)}%; max drawdown ≤${(dd * 100).toFixed(0)}%`,
  measured: (s: number) => `annualized volatility ${(s * 100).toFixed(1)}%`,
  profileNames: { conservative: 'Conservative', moderate: 'Moderate', aggressive: 'Aggressive' },
  lines: {
    sigma: (s: number, name: string, low: number, high: number, mark: string) => `Volatility: ${(s * 100).toFixed(1)}% (${name} target ${(low * 100).toFixed(0)}-${(high * 100).toFixed(0)}%) ${mark}`,
    sharpe: (v: number, mark: string) => `Sharpe ratio: ${v.toFixed(2)} (≥${SHARPE_PASS} healthy) ${mark}`,
    var: (v: number, tol: number, mark: string) => `Monthly VaR(95%): ${(v * 100).toFixed(2)}% (≤${(tol * 100).toFixed(0)}% tolerated) ${mark}`,
    dd: (v: number, tol: number, mark: string) => `Est. max drawdown: ${(v * 100).toFixed(1)}% (≤${(tol * 100).toFixed(0)}% tolerated) ${mark}`,
  },
  note: '\n⚠ Note: these metrics use static class-level parameter estimates, for education only.',
}

export function check13(snapshot: Snapshot, ctx?: EngineContext): CheckResult {
  const locale = pickLocale(ctx?.locale)
  const T = pick(locale, T_ZH, T_EN)
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

  const mark = (ok: boolean) => (ok ? '✓' : '⚠')
  const pname = T.profileNames[profileKey as keyof typeof T.profileNames]

  return {
    id: 'Q13',
    evidenceLevel: 'research',
    name: T.name,
    description: T.description,
    layer: 'quantitative',
    status,
    severity: 'high',
    score: status === 'pass' ? 100 : status === 'warn' ? 50 : 0,
    measuredValue: sigma,
    measuredLabel: T.measured(sigma),
    threshold: T.threshold(sigmaTarget.low, sigmaTarget.high, varTol, ddTol),
    detail: [
      T.lines.sigma(sigma, pname, sigmaTarget.low, sigmaTarget.high, mark(sigmaOk)),
      T.lines.sharpe(sharpe, mark(sharpeOk)),
      T.lines.var(var95, varTol, mark(varOk)),
      T.lines.dd(maxDD, ddTol, mark(ddOk)),
      T.note,
    ].join('\n'),
    actionRefs: ['A13-1'],
  }
}
