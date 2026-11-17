import type { CheckResult, Snapshot, EngineContext } from '../../types'
import { findHighCorrelationPairs } from '../metrics'
import { CORRELATION_HIGH } from '../../data/thresholds'
import { ASSET_CATEGORY_LABELS } from '../../types'
import { pick, pickLocale } from '../../i18n/checkHelpers'

const T_ZH = {
  name: '相关性分析',
  description: '检查是否存在高度相关的大类资产同涨同跌——虚假分散化',
  threshold: `0对→通过; 1对→警告; ≥2对→未通过`,
  measured: (n: number) => `${n} 对高相关(ρ>${CORRELATION_HIGH})的大仓位`,
  okDetail: '未发现高相关大仓位对，分散化效果良好。',
  pair: (a: string, b: string, sa: number, sb: number, rho: number) => `${a}(占比${(sa * 100).toFixed(1)}%) 与 ${b}(占比${(sb * 100).toFixed(1)}%) ρ=${rho.toFixed(2)} — 高位资产正相关，可能同涨同跌`,
}

const T_EN = {
  name: 'Correlation Analysis',
  description: 'Detects highly correlated large positions that move together — false diversification',
  threshold: `0 pairs → pass; 1 pair → warning; ≥2 pairs → fail`,
  measured: (n: number) => `${n} large-position pair(s) with ρ>${CORRELATION_HIGH}`,
  okDetail: 'No highly correlated large positions found — diversification is effective.',
  pair: (a: string, b: string, sa: number, sb: number, rho: number) => `${a} (${(sa * 100).toFixed(1)}%) vs ${b} (${(sb * 100).toFixed(1)}%), ρ=${rho.toFixed(2)} — positively correlated large positions may fall together`,
}

export function check14(snapshot: Snapshot, ctx?: EngineContext): CheckResult {
  const locale = pickLocale(ctx?.locale)
  const T = pick(locale, T_ZH, T_EN)
  const pairs = findHighCorrelationPairs(snapshot.assets)

  let status: CheckResult['status']
  if (pairs.length === 0) status = 'pass'
  else if (pairs.length === 1) status = 'warn'
  else status = 'fail'

  const detail = pairs.length === 0
    ? T.okDetail
    : pairs.map((p) => T.pair(ASSET_CATEGORY_LABELS[p.cat1], ASSET_CATEGORY_LABELS[p.cat2], p.share1, p.share2, p.rho)).join('\n')

  return {
    id: 'Q14',
    evidenceLevel: 'research',
    name: T.name,
    description: T.description,
    layer: 'quantitative',
    status,
    severity: 'medium',
    score: status === 'pass' ? 100 : status === 'warn' ? 50 : 0,
    measuredValue: pairs.length,
    measuredLabel: T.measured(pairs.length),
    threshold: T.threshold,
    detail,
    actionRefs: ['A14-1'],
  }
}
