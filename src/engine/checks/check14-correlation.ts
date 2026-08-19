import type { CheckResult, Snapshot } from '../../types'
import { findHighCorrelationPairs } from '../metrics'
import { CORRELATION_HIGH } from '../../data/thresholds'
import { ASSET_CATEGORY_LABELS } from '../../types'

export function check14(snapshot: Snapshot): CheckResult {
  const pairs = findHighCorrelationPairs(snapshot.assets)

  let status: CheckResult['status']
  if (pairs.length === 0) status = 'pass'
  else if (pairs.length === 1) status = 'warn'
  else status = 'fail'

  return {
    id: 'Q14',
    evidenceLevel: 'research',
    name: '相关性分析',
    description: '检查是否存在高度相关的大类资产同涨同跌——虚假分散化',
    layer: 'quantitative',
    status,
    severity: 'medium',
    score: status === 'pass' ? 100 : status === 'warn' ? 50 : 0,
    measuredValue: pairs.length,
    measuredLabel: `${pairs.length} 对高相关(ρ>${CORRELATION_HIGH})的大仓位`,
    threshold: `0对→通过; 1对→警告; ≥2对→未通过`,
    detail: pairs.length === 0
      ? '未发现高相关大仓位对，分散化效果良好。'
      : pairs
          .map(
            (p) =>
              `${ASSET_CATEGORY_LABELS[p.cat1]}(占比${(p.share1 * 100).toFixed(1)}%) 与 ${ASSET_CATEGORY_LABELS[p.cat2]}(占比${(p.share2 * 100).toFixed(1)}%) ρ=${p.rho.toFixed(2)} — 高位资产正相关，可能同涨同跌`
          )
          .join('\n'),
    actionRefs: ['A14-1'],
  }
}
