import type { CheckResult, Snapshot, EngineContext } from '../../types'
import { hasMaturityGap, maxWMPIssuerShare } from '../metrics'
import { SINGLE_ISSUER_WMP_MAX } from '../../data/thresholds'
import { pick, pickLocale } from '../../i18n/checkHelpers'

const T_ZH = {
  name: '信用与久期风险',
  description: '检查固收类资产的期限匹配和发行方集中度',
  threshold: `12月内到期资金覆盖50%年度支出→通过; 单一发行方≤${(SINGLE_ISSUER_WMP_MAX * 100).toFixed(0)}%固收→通过`,
  measured: (s: number) => `单一发行方占固收 ${(s * 100).toFixed(0)}%`,
  lineMaturity: (ref: string, ok: boolean) => `期限匹配（基准日 ${ref}）: ${ok ? '✓ 期限匹配合理' : '⚠ 12个月内到期资金不足以覆盖50%年度刚性支出'}`,
  lineIssuer: (s: number, top: string | null) => `单一发行方集中度: ${(s * 100).toFixed(1)}% (≤${(SINGLE_ISSUER_WMP_MAX * 100).toFixed(0)}%固收为健康)${top ? `，最大发行方「${top}」` : ''}`,
  lineCoverage: (c: number) => `⚠ 仅 ${(c * 100).toFixed(0)}% 的固收资产标注了发行方，集中度可能被低估——请在资产台账补充 issuer 字段`,
}

const T_EN = {
  name: 'Credit & Duration Risk',
  description: 'Checks maturity matching and issuer concentration of fixed-income holdings',
  threshold: `maturing within 12m ≥50% of annual spending → pass; single issuer ≤${(SINGLE_ISSUER_WMP_MAX * 100).toFixed(0)}% of fixed income → pass`,
  measured: (s: number) => `largest issuer ${(s * 100).toFixed(0)}% of fixed income`,
  lineMaturity: (ref: string, ok: boolean) => `Maturity ladder (ref. ${ref}): ${ok ? '✓ reasonably matched' : '⚠ maturing funds within 12 months may not cover 50% of annual essential spending'}`,
  lineIssuer: (s: number, top: string | null) => `Single-issuer concentration: ${(s * 100).toFixed(1)}% (≤${(SINGLE_ISSUER_WMP_MAX * 100).toFixed(0)}% of fixed income is healthy)${top ? `, largest issuer " ${top}"` : ''}`,
  lineCoverage: (c: number) => `⚠ Only ${(c * 100).toFixed(0)}% of fixed-income assets have an issuer tag — concentration may be understated; add issuer fields in the asset manager`,
}

export function check12(snapshot: Snapshot, ctx?: EngineContext): CheckResult {
  const locale = pickLocale(ctx?.locale)
  const T = pick(locale, T_ZH, T_EN)
  const referenceDate = ctx?.referenceDate ?? new Date().toISOString().slice(0, 10)
  const hasGap = hasMaturityGap(snapshot, referenceDate)
  const { maxShare, topIssuer, coverage } = maxWMPIssuerShare(snapshot.assets)

  const issuerStatus = maxShare <= SINGLE_ISSUER_WMP_MAX ? 'pass' : 'fail'
  const coverageStatus = coverage < 1 ? 'warn' : 'pass'
  const gapStatus = hasGap ? 'warn' : 'pass'

  const statuses = [gapStatus, issuerStatus, coverageStatus]
  const status: CheckResult['status'] =
    statuses.includes('fail') ? 'fail' : statuses.includes('warn') ? 'warn' : 'pass'

  const detailLines = [
    T.lineMaturity(referenceDate, !hasGap),
    T.lineIssuer(maxShare, topIssuer),
  ]
  if (coverage < 1) {
    detailLines.push(T.lineCoverage(coverage))
  }

  return {
    id: 'Q12',
    evidenceLevel: 'research',
    name: T.name,
    description: T.description,
    layer: 'quantitative',
    status,
    severity: 'medium',
    score: status === 'pass' ? 100 : status === 'warn' ? 50 : 0,
    measuredValue: maxShare,
    measuredLabel: T.measured(maxShare),
    threshold: T.threshold,
    detail: detailLines.join('\n'),
    actionRefs: ['A12-1'],
  }
}
