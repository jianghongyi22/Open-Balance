import type { CheckResult, Snapshot } from '../../types'
import { debtToIncome, leverageRatio } from '../metrics'
import { DTI_PASS, DTI_WARN, LEVERAGE_PASS, LEVERAGE_WARN } from '../../data/thresholds'

export function check05(snapshot: Snapshot): CheckResult {
  const dti = debtToIncome(snapshot)
  const lev = leverageRatio(snapshot)

  const dtiStatus: CheckResult['status'] =
    dti <= DTI_PASS ? 'pass' : dti <= DTI_WARN ? 'warn' : 'fail'

  const levStatus: CheckResult['status'] =
    lev <= LEVERAGE_PASS ? 'pass' : lev <= LEVERAGE_WARN ? 'warn' : 'fail'

  // Combined: worst of the two
  const statuses = [dtiStatus, levStatus]
  const status: CheckResult['status'] =
    statuses.includes('fail') ? 'fail' : statuses.includes('warn') ? 'warn' : 'pass'

  return {
    id: 'Q5',
    name: '负债压力测试',
    description: '检查月供收入比(DSR/DTI)和总负债率是否在安全线以内',
    layer: 'qualitative',
    framework: '银行房贷审批标准 + 负债安全线',
    status,
    severity: 'critical',
    score: status === 'pass' ? 100 : status === 'warn' ? 50 : 0,
    measuredValue: dti,
    measuredLabel: `月供占月收入 ${(dti * 100).toFixed(1)}%`,
    threshold: `DTI≤${(DTI_PASS * 100).toFixed(0)}%通过, ${(DTI_PASS * 100).toFixed(0)}-${(DTI_WARN * 100).toFixed(0)}%警告, >${(DTI_WARN * 100).toFixed(0)}%未通过`,
    detail: [
      `月供收入比 (DTI): ${(dti * 100).toFixed(1)}% (月供¥${snapshot.liabilities.reduce((s, l) => s + l.monthlyPayment, 0).toLocaleString()} / 月收入¥${(snapshot.profile.annualIncome / 12).toLocaleString()}) - ${dtiStatus === 'pass' ? '✓' : dtiStatus === 'warn' ? '⚠' : '✗'}`,
      `总负债率: ${(lev * 100).toFixed(1)}% (负债¥${snapshot.liabilities.reduce((s, l) => s + l.remainingPrincipal, 0).toLocaleString()} / 总资产) - ${levStatus === 'pass' ? '✓' : levStatus === 'warn' ? '⚠' : '✗'}`,
    ].join('\n'),
    actionRefs: ['A5-1', 'A5-2'],
  }
}
