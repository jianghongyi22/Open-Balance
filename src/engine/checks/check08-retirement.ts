import type { CheckResult, Snapshot } from '../../types'
import { retirementProjection, oldestAge } from '../metrics'
import {
  RETIREMENT_SUFFICIENCY_PASS,
  RETIREMENT_SUFFICIENCY_WARN,
  RETIREMENT_SCENARIOS,
  RETIREMENT_LIFE_EXPECTANCY,
} from '../../data/thresholds'
import { formatCNY } from '../../utils/format'

export function check08(snapshot: Snapshot): CheckResult {
  const proj = retirementProjection(snapshot)
  const age = oldestAge(snapshot.profile)
  const retAge = snapshot.profile.retirementAge ?? 60

  const ratio = proj.neutral.sufficiency

  let status: CheckResult['status']
  if (ratio >= RETIREMENT_SUFFICIENCY_PASS) status = 'pass'
  else if (ratio >= RETIREMENT_SUFFICIENCY_WARN) status = 'warn'
  else status = 'fail'

  const pct = (r: number) => (r >= 99 ? '充足' : `${(r * 100).toFixed(0)}%`)
  const gapText = proj.neutral.gapPV > 0
    ? `缺口现值约 ${formatCNY(proj.neutral.gapPV)}`
    : '无缺口'

  return {
    id: 'Q8',
    evidenceLevel: 'research',
    name: '养老储备测算',
    description: `折现现金流（DCF）模型估算退休储备是否满足 ${retAge} 岁退休后至${RETIREMENT_LIFE_EXPECTANCY}岁的生活所需`,
    layer: 'qualitative',
    framework: '养老金替代率模型 + DCF',
    status,
    severity: 'medium',
    score: status === 'pass' ? 100 : status === 'warn' ? 50 : 0,
    measuredValue: ratio,
    measuredLabel: `中性情景充足率 ${pct(ratio)}`,
    threshold: `充足率≥${(RETIREMENT_SUFFICIENCY_PASS * 100).toFixed(0)}%通过; ${(RETIREMENT_SUFFICIENCY_WARN * 100).toFixed(0)}-${(RETIREMENT_SUFFICIENCY_PASS * 100).toFixed(0)}%警告; <${(RETIREMENT_SUFFICIENCY_WARN * 100).toFixed(0)}%未通过`,
    detail: [
      `最大年龄${age}岁，距离退休${proj.yearsToRetirement}年，退休期约${proj.retirementYears}年。`,
      `三档情景充足率：`,
      `  悲观（${RETIREMENT_SCENARIOS.pessimistic.label}）：${pct(proj.pessimistic.sufficiency)}`,
      `  中性（${RETIREMENT_SCENARIOS.neutral.label}）：${pct(proj.neutral.sufficiency)}`,
      `  乐观（${RETIREMENT_SCENARIOS.optimistic.label}）：${pct(proj.optimistic.sufficiency)}`,
      `社保/年金年领取额：${formatCNY(proj.socialPensionAnnual)}（已从需求中扣除）`,
      `可投资资产（已剔除自住房）：${formatCNY(proj.investableAssets)}`,
      `中性情景：${gapText}`,
      '',
      '注：本模型为教育性估算，通胀与投资回报为假设值。',
    ].join('\n'),
    actionRefs: ['A8-1'],
    rangeValue: {
      low: proj.pessimistic.sufficiency,
      high: proj.optimistic.sufficiency,
    },
  }
}
