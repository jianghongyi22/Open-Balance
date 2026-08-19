import type { CheckResult, Snapshot } from '../../types'
import { rule4321Allocation } from '../metrics'
import { RULE_4321_TARGETS } from '../../data/thresholds'

export function check06(snapshot: Snapshot): CheckResult {
  const alloc = rule4321Allocation(snapshot)
  const targets = RULE_4321_TARGETS

  const items = [
    { name: '生活支出', actual: alloc.living, ...targets.living },
    { name: '投资', actual: alloc.investment, ...targets.investment },
    { name: '储蓄', actual: alloc.savings, ...targets.savings },
    { name: '保险', actual: alloc.insurance, ...targets.insurance },
  ]

  const offCount = items.filter(
    (i) => Math.abs(i.actual - i.target) > i.band
  ).length

  let status: CheckResult['status']
  if (offCount >= 3) status = 'fail'
  else if (offCount >= 1) status = 'warn'
  else status = 'pass'

  return {
    id: 'Q6',
    evidenceLevel: 'heuristic',
    name: '4321法则检查',
    description: '按4321法则检查家庭收入分配：40%生活/30%投资/20%储蓄/10%保险',
    layer: 'qualitative',
    framework: '4321理财法则',
    status,
    severity: 'low',
    score: status === 'pass' ? 100 : status === 'warn' ? 50 : 0,
    measuredValue: offCount,
    measuredLabel: `${offCount}/4 项偏离目标`,
    threshold: '4项均在±5pp内→通过; 1-2项偏离→警告; ≥3项偏离→未通过',
    detail: items
      .map((i) => `${i.name}: 实际 ${(i.actual * 100).toFixed(1)}% (目标 ${(i.target * 100).toFixed(0)}%±${(i.band * 100).toFixed(0)}pp)`)
      .join('\n'),
    actionRefs: ['A6-1'],
  }
}
