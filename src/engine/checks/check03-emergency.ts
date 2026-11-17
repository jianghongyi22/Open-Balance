import type { CheckResult, Snapshot, EngineContext } from '../../types'
import { emergencyMonths } from '../metrics'
import { EMERGENCY_MONTHS_PASS, EMERGENCY_MONTHS_WARN } from '../../data/thresholds'
import { pick, pickLocale } from '../../i18n/checkHelpers'

const T_ZH = {
  name: '应急备用金充足性',
  description: '检查高流动性资产能否覆盖3-6个月家庭刚性支出',
  threshold: `≥${EMERGENCY_MONTHS_PASS}个月通过; ${EMERGENCY_MONTHS_WARN}-${EMERGENCY_MONTHS_PASS}个月警告; <${EMERGENCY_MONTHS_WARN}个月未通过`,
  measured: (m: number) => `${m.toFixed(1)} 个月`,
  detail: (m: number, expense: number, status: string) =>
    `当前高流动性资产可覆盖 ${m.toFixed(1)} 个月刚性支出（¥${expense.toLocaleString()}/月）。${
      status === 'fail'
        ? '应急储备严重不足，一旦发生收入中断将立即陷入财务困境。建议优先建立至少3个月的应急金。'
        : status === 'warn'
          ? '应急储备偏紧，建议逐步补充至6个月。'
          : '应急储备充足，能应对大多数突发状况。'
    }`,
}

const T_EN = {
  name: 'Emergency Fund Adequacy',
  description: 'Checks whether liquid assets cover 3-6 months of essential household spending',
  threshold: `≥${EMERGENCY_MONTHS_PASS} months pass; ${EMERGENCY_MONTHS_WARN}-${EMERGENCY_MONTHS_PASS} warning; <${EMERGENCY_MONTHS_WARN} fail`,
  measured: (m: number) => `${m.toFixed(1)} months`,
  detail: (m: number, expense: number, status: string) =>
    `Liquid assets cover ${m.toFixed(1)} months of essential spending (¥${expense.toLocaleString()}/month). ${
      status === 'fail'
        ? 'Emergency reserve is critically low — an income interruption would cause immediate distress. Build at least 3 months of reserves first.'
        : status === 'warn'
          ? 'Reserve is thin — gradually top up to 6 months.'
          : 'Reserve is sufficient for most contingencies.'
    }`,
}

export function check03(snapshot: Snapshot, ctx?: EngineContext): CheckResult {
  const locale = pickLocale(ctx?.locale)
  const T = pick(locale, T_ZH, T_EN)
  const months = emergencyMonths(snapshot)

  let status: CheckResult['status']
  if (months >= EMERGENCY_MONTHS_PASS) status = 'pass'
  else if (months >= EMERGENCY_MONTHS_WARN) status = 'warn'
  else status = 'fail'

  return {
    id: 'Q3',
    evidenceLevel: 'research',
    name: T.name,
    description: T.description,
    layer: 'qualitative',
    framework: locale === 'en' ? '3-6 month emergency fund rule' : '3-6个月应急金法则',
    status,
    severity: 'critical',
    score: status === 'pass' ? 100 : status === 'warn' ? 50 : 0,
    measuredValue: months,
    measuredLabel: T.measured(months),
    threshold: T.threshold,
    detail: T.detail(months, snapshot.profile.monthlyEssentialExpense, status),
    actionRefs: ['A3-1'],
  }
}
