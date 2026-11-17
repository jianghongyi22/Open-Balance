import type { CheckResult, Snapshot, EngineContext } from '../../types'
import { rule4321Allocation } from '../metrics'
import { RULE_4321_TARGETS } from '../../data/thresholds'
import { pick, pickLocale } from '../../i18n/checkHelpers'

const T_ZH = {
  name: '4321法则检查',
  description: '按4321法则检查家庭收入分配：40%生活/30%投资/20%储蓄/10%保险',
  threshold: '4项均在±5pp内→通过; 1-2项偏离→警告; ≥3项偏离→未通过',
  measured: (n: number) => `${n}/4 项偏离目标`,
  itemNames: ['生活支出', '投资', '储蓄', '保险'],
  detail: (lines: string[]) => lines.join('\n'),
}

const T_EN = {
  name: '4-3-2-1 Income Split',
  description: 'Checks the household income split against the 4-3-2-1 rule: 40% living / 30% investing / 20% saving / 10% insurance',
  threshold: 'all 4 within ±5pp → pass; 1-2 off → warning; ≥3 off → fail',
  measured: (n: number) => `${n}/4 off target`,
  itemNames: ['Living', 'Investing', 'Saving', 'Insurance'],
  detail: (lines: string[]) => lines.join('\n'),
}

export function check06(snapshot: Snapshot, ctx?: EngineContext): CheckResult {
  const locale = pickLocale(ctx?.locale)
  const T = pick(locale, T_ZH, T_EN)
  const alloc = rule4321Allocation(snapshot)
  const targets = RULE_4321_TARGETS

  const items = [
    { name: T.itemNames[0], actual: alloc.living, ...targets.living },
    { name: T.itemNames[1], actual: alloc.investment, ...targets.investment },
    { name: T.itemNames[2], actual: alloc.savings, ...targets.savings },
    { name: T.itemNames[3], actual: alloc.insurance, ...targets.insurance },
  ]

  const offCount = items.filter(
    (i) => Math.abs(i.actual - i.target) > i.band
  ).length

  let status: CheckResult['status']
  if (offCount >= 3) status = 'fail'
  else if (offCount >= 1) status = 'warn'
  else status = 'pass'

  const lines = items.map(
    (i) => `${i.name}: ${locale === 'en' ? 'actual' : '实际'} ${(i.actual * 100).toFixed(1)}% (${locale === 'en' ? 'target' : '目标'} ${(i.target * 100).toFixed(0)}%±${(i.band * 100).toFixed(0)}pp)`
  )

  return {
    id: 'Q6',
    evidenceLevel: 'heuristic',
    name: T.name,
    description: T.description,
    layer: 'qualitative',
    framework: locale === 'en' ? '4-3-2-1 rule of thumb' : '4321理财法则',
    status,
    severity: 'low',
    score: status === 'pass' ? 100 : status === 'warn' ? 50 : 0,
    measuredValue: offCount,
    measuredLabel: T.measured(offCount),
    threshold: T.threshold,
    detail: T.detail(lines),
    actionRefs: ['A6-1'],
  }
}
