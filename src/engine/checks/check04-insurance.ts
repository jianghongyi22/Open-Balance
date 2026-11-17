import type { CheckResult, Snapshot, EngineContext } from '../../types'
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
import { pick, pickLocale } from '../../i18n/checkHelpers'

const T_ZH = {
  name: '家庭保障充分性',
  description: '检查寿险、重疾、医疗、意外四大保障是否覆盖家庭风险敞口',
  threshold: `寿险≥${LIFE_INSURANCE_MULTIPLIER}倍年收入; 重疾≥${(CRITICAL_ILLNESS_MIN / 10000).toFixed(0)}万; 有医疗险; 有意外险`,
  measured: (n: number) => `${n} 项保障缺口`,
  lineLife: (a: number, n: number, ok: boolean) => `寿险: 实际 ¥${(a / 10000).toFixed(0)}万 vs 建议 ¥${(n / 10000).toFixed(0)}万 (${LIFE_INSURANCE_MULTIPLIER}×年收入)${ok ? ' ✓' : ' ⚠'}`,
  lineCI: (a: number, ok: boolean) => `重疾: 实际 ¥${(a / 10000).toFixed(0)}万 vs 建议 ≥¥${(CRITICAL_ILLNESS_MIN / 10000).toFixed(0)}万${ok ? ' ✓' : ' ⚠'}`,
  lineMedical: (has: boolean) => `医疗险: ${has ? '有 ✓' : '无 ⚠'}`,
  lineAccident: (has: boolean) => `意外险: ${has ? '有 ✓' : '无 ⚠'}`,
  linePremium: (pr: number, label: string) => `保费占收入: ${(pr * 100).toFixed(1)}% (${label})`,
}

const T_EN = {
  name: 'Insurance Coverage Adequacy',
  description: 'Checks whether life, critical illness, medical and accident insurance cover the household\'s risk exposure',
  threshold: `life ≥${LIFE_INSURANCE_MULTIPLIER}× income; CI ≥¥${(CRITICAL_ILLNESS_MIN / 10000).toFixed(0)}0k; medical; accident`,
  measured: (n: number) => `${n} coverage gap(s)`,
  lineLife: (a: number, n: number, ok: boolean) => `Life: ¥${(a / 10000).toFixed(0)}0k vs. ¥${(n / 10000).toFixed(0)}0k recommended (${LIFE_INSURANCE_MULTIPLIER}× income)${ok ? ' ✓' : ' ⚠'}`,
  lineCI: (a: number, ok: boolean) => `Critical illness: ¥${(a / 10000).toFixed(0)}0k vs. ≥¥${(CRITICAL_ILLNESS_MIN / 10000).toFixed(0)}0k${ok ? ' ✓' : ' ⚠'}`,
  lineMedical: (has: boolean) => `Medical: ${has ? 'yes ✓' : 'no ⚠'}`,
  lineAccident: (has: boolean) => `Accident: ${has ? 'yes ✓' : 'no ⚠'}`,
  linePremium: (pr: number, label: string) => `Premium ratio: ${(pr * 100).toFixed(1)}% (${label})`,
}

export function check04(snapshot: Snapshot, ctx?: EngineContext): CheckResult {
  const locale = pickLocale(ctx?.locale)
  const T = pick(locale, T_ZH, T_EN)
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
      ? (locale === 'en' ? 'reasonable' : '合理')
      : pr < PREMIUM_RATIO_PASS_LOW
        ? (locale === 'en' ? 'low' : '偏低')
        : (locale === 'en' ? 'high' : '偏高')

  return {
    id: 'Q4',
    evidenceLevel: 'research',
    name: T.name,
    description: T.description,
    layer: 'qualitative',
    framework: locale === 'en' ? 'Coverage-to-income rule + protection pyramid' : '保额-收入规则 + 保障金字塔',
    status,
    severity: 'critical',
    score: status === 'pass' ? 100 : status === 'warn' ? 50 : 0,
    measuredValue: gaps,
    measuredLabel: T.measured(gaps),
    threshold: T.threshold,
    detail: [
      T.lineLife(lifeActual, lifeNeeded, lifeActual >= lifeNeeded),
      T.lineCI(ciActual, ciActual >= CRITICAL_ILLNESS_MIN),
      T.lineMedical(hasMedical),
      T.lineAccident(hasAccident),
      T.linePremium(pr, prStatus),
    ].join('\n'),
    actionRefs: ['A4-1', 'A4-2'],
  }
}
