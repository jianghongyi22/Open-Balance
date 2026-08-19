import type { CheckResult, Snapshot, EngineContext } from '../../types'
import { hasMaturityGap, maxWMPIssuerShare } from '../metrics'
import { SINGLE_ISSUER_WMP_MAX } from '../../data/thresholds'

export function check12(snapshot: Snapshot, ctx?: EngineContext): CheckResult {
  const referenceDate = ctx?.referenceDate ?? new Date().toISOString().slice(0, 10)
  const hasGap = hasMaturityGap(snapshot, referenceDate)
  const { maxShare, topIssuer, coverage } = maxWMPIssuerShare(snapshot.assets)

  const issuerStatus = maxShare <= SINGLE_ISSUER_WMP_MAX ? 'pass' : 'fail'
  // 发行方数据缺失本身是风险信号：无法核实集中度 → 至少警告
  const coverageStatus = coverage < 1 ? 'warn' : 'pass'
  const gapStatus = hasGap ? 'warn' : 'pass'

  const statuses = [gapStatus, issuerStatus, coverageStatus]
  const status: CheckResult['status'] =
    statuses.includes('fail') ? 'fail' : statuses.includes('warn') ? 'warn' : 'pass'

  const detailLines = [
    `期限匹配（基准日 ${referenceDate}）: ${hasGap ? '⚠ 12个月内到期资金不足以覆盖50%年度刚性支出' : '✓ 期限匹配合理'}`,
    `单一发行方集中度: ${(maxShare * 100).toFixed(1)}% (≤${(SINGLE_ISSUER_WMP_MAX * 100).toFixed(0)}%固收为健康)${topIssuer ? `，最大发行方「${topIssuer}」` : ''}`,
  ]
  if (coverage < 1) {
    detailLines.push(
      `⚠ 仅 ${(coverage * 100).toFixed(0)}% 的固收资产标注了发行方，集中度可能被低估——请在资产台账补充 issuer 字段`
    )
  }

  return {
    id: 'Q12',
    evidenceLevel: 'research',
    name: '信用与久期风险',
    description: '检查固收类资产的期限匹配和发行方集中度',
    layer: 'quantitative',
    status,
    severity: 'medium',
    score: status === 'pass' ? 100 : status === 'warn' ? 50 : 0,
    measuredValue: maxShare,
    measuredLabel: `单一发行方占固收 ${(maxShare * 100).toFixed(0)}%`,
    threshold: `12月内到期资金覆盖50%年度支出→通过; 单一发行方≤${(SINGLE_ISSUER_WMP_MAX * 100).toFixed(0)}%固收→通过`,
    detail: detailLines.join('\n'),
    actionRefs: ['A12-1'],
  }
}
