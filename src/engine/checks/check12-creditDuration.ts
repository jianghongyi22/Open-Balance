import type { CheckResult, Snapshot } from '../../types'
import { hasMaturityGap, maxWMPIssuerShare } from '../metrics'
import { SINGLE_ISSUER_WMP_MAX } from '../../data/thresholds'

export function check12(snapshot: Snapshot): CheckResult {
  const hasGap = hasMaturityGap(snapshot)
  const maxIssuer = maxWMPIssuerShare(snapshot.assets)

  const issuerStatus = maxIssuer <= SINGLE_ISSUER_WMP_MAX ? 'pass' : 'fail'
  const gapStatus = hasGap ? 'warn' : 'pass'

  const statuses = [gapStatus, issuerStatus]
  const status: CheckResult['status'] =
    statuses.includes('fail') ? 'fail' : statuses.includes('warn') ? 'warn' : 'pass'

  return {
    id: 'Q12',
    name: '信用与久期风险',
    description: '检查固收类资产的期限匹配和发行方集中度',
    layer: 'quantitative',
    status,
    severity: 'medium',
    score: status === 'pass' ? 100 : status === 'warn' ? 50 : 0,
    measuredValue: maxIssuer,
    measuredLabel: `单一发行方占固收 ${(maxIssuer * 100).toFixed(0)}%`,
    threshold: `12月内到期资金覆盖年度支出→通过; 单一发行方≤${(SINGLE_ISSUER_WMP_MAX * 100).toFixed(0)}%固收→通过`,
    detail: [
      `期限匹配: ${hasGap ? '⚠ 12个月内到期资金可能不足以覆盖年度刚性支出' : '✓ 期限匹配合理'}`,
      `单一发行方集中度: ${(maxIssuer * 100).toFixed(1)}% (≤${(SINGLE_ISSUER_WMP_MAX * 100).toFixed(0)}%固收为健康)`,
    ].join('\n'),
    actionRefs: ['A12-1'],
  }
}
