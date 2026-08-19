import type { CheckResult, Snapshot } from '../../types'
import {
  totalLifeCoverage,
  totalCriticalIllnessCoverage,
  hasMedicalInsurance,
  hasAccidentInsurance,
  premiumRatio,
} from '../metrics'
import {
  LIFE_INSURANCE_MULTIPLIER,
  CRITICAL_ILLNESS_MIN,
  PREMIUM_RATIO_PASS_LOW,
  PREMIUM_RATIO_PASS_HIGH,
} from '../../data/thresholds'

export function check04(snapshot: Snapshot): CheckResult {
  const income = snapshot.profile.annualIncome
  const lifeNeeded = income * LIFE_INSURANCE_MULTIPLIER
  const lifeActual = totalLifeCoverage(snapshot.assets)
  const ciActual = totalCriticalIllnessCoverage(snapshot.assets)
  const hasMedical = hasMedicalInsurance(snapshot.assets)
  const hasAccident = hasAccidentInsurance(snapshot.assets)
  const pr = premiumRatio(snapshot)

  let gaps = 0
  if (lifeActual < lifeNeeded) gaps++
  if (ciActual < CRITICAL_ILLNESS_MIN) gaps++
  if (!hasMedical) gaps++
  if (!hasAccident) gaps++

  let status: CheckResult['status']
  if (gaps === 0) status = 'pass'
  else if (gaps <= 1) status = 'warn'
  else status = 'fail'

  const prStatus =
    pr >= PREMIUM_RATIO_PASS_LOW && pr <= PREMIUM_RATIO_PASS_HIGH
      ? '合理'
      : pr < PREMIUM_RATIO_PASS_LOW
        ? '偏低'
        : '偏高'

  return {
    id: 'Q4',
    evidenceLevel: 'research',
    name: '家庭保障充分性',
    description: '检查寿险、重疾、医疗、意外四大保障是否覆盖家庭风险敞口',
    layer: 'qualitative',
    framework: '保额-收入规则 + 保障金字塔',
    status,
    severity: 'critical',
    score: status === 'pass' ? 100 : status === 'warn' ? 50 : 0,
    measuredValue: gaps,
    measuredLabel: `${gaps} 项保障缺口`,
    threshold: `寿险≥${LIFE_INSURANCE_MULTIPLIER}倍年收入; 重疾≥${(CRITICAL_ILLNESS_MIN / 10000).toFixed(0)}万; 有医疗险; 有意外险`,
    detail: [
      `寿险: 实际 ¥${(lifeActual / 10000).toFixed(0)}万 vs 建议 ¥${(lifeNeeded / 10000).toFixed(0)}万 (${LIFE_INSURANCE_MULTIPLIER}×年收入)${lifeActual < lifeNeeded ? ' ⚠' : ' ✓'}`,
      `重疾: 实际 ¥${(ciActual / 10000).toFixed(0)}万 vs 建议 ≥¥${(CRITICAL_ILLNESS_MIN / 10000).toFixed(0)}万${ciActual < CRITICAL_ILLNESS_MIN ? ' ⚠' : ' ✓'}`,
      `医疗险: ${hasMedical ? '有 ✓' : '无 ⚠'}`,
      `意外险: ${hasAccident ? '有 ✓' : '无 ⚠'}`,
      `保费占收入: ${(pr * 100).toFixed(1)}% (${prStatus})`,
    ].join('\n'),
    actionRefs: ['A4-1', 'A4-2'],
  }
}
