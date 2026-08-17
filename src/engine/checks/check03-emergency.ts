import type { CheckResult, Snapshot } from '../../types'
import { emergencyMonths } from '../metrics'
import { EMERGENCY_MONTHS_PASS, EMERGENCY_MONTHS_WARN } from '../../data/thresholds'

export function check03(snapshot: Snapshot): CheckResult {
  const months = emergencyMonths(snapshot)

  let status: CheckResult['status']
  if (months >= EMERGENCY_MONTHS_PASS) status = 'pass'
  else if (months >= EMERGENCY_MONTHS_WARN) status = 'warn'
  else status = 'fail'

  return {
    id: 'Q3',
    name: '应急备用金充足性',
    description: '检查高流动性资产能否覆盖3-6个月家庭刚性支出',
    layer: 'qualitative',
    framework: '3-6个月应急金法则',
    status,
    severity: 'critical',
    score: status === 'pass' ? 100 : status === 'warn' ? 50 : 0,
    measuredValue: months,
    measuredLabel: `${months.toFixed(1)} 个月`,
    threshold: `≥${EMERGENCY_MONTHS_PASS}个月通过; ${EMERGENCY_MONTHS_WARN}-${EMERGENCY_MONTHS_PASS}个月警告; <${EMERGENCY_MONTHS_WARN}个月未通过`,
    detail: `当前高流动性资产可覆盖 ${months.toFixed(1)} 个月刚性支出（¥${snapshot.profile.monthlyEssentialExpense.toLocaleString()}/月）。${
      status === 'fail'
        ? '应急储备严重不足，一旦发生收入中断将立即陷入财务困境。建议优先建立至少3个月的应急金。'
        : status === 'warn'
          ? '应急储备偏紧，建议逐步补充至6个月。'
          : '应急储备充足，能应对大多数突发状况。'
    }`,
    actionRefs: ['A3-1'],
  }
}
