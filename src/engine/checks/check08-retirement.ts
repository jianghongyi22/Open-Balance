import type { CheckResult, Snapshot, EngineContext } from '../../types'
import { retirementProjection, oldestAge } from '../metrics'
import {
  RETIREMENT_SUFFICIENCY_PASS,
  RETIREMENT_SUFFICIENCY_WARN,
  RETIREMENT_SCENARIOS,
  RETIREMENT_LIFE_EXPECTANCY,
} from '../../data/thresholds'
import { formatCNY } from '../../utils/format'
import { pick, pickLocale } from '../../i18n/checkHelpers'

const T_ZH = {
  name: '养老储备测算',
  description: (retAge: number) => `折现现金流（DCF）模型估算退休储备是否满足 ${retAge} 岁退休后至${RETIREMENT_LIFE_EXPECTANCY}岁的生活所需`,
  threshold: `充足率≥${(RETIREMENT_SUFFICIENCY_PASS * 100).toFixed(0)}%通过; ${(RETIREMENT_SUFFICIENCY_WARN * 100).toFixed(0)}-${(RETIREMENT_SUFFICIENCY_PASS * 100).toFixed(0)}%警告; <${(RETIREMENT_SUFFICIENCY_WARN * 100).toFixed(0)}%未通过`,
  measured: (pct: string) => `中性情景充足率 ${pct}`,
  note: '注：本模型为教育性估算，通胀与投资回报为假设值。',
}

const T_EN = {
  name: 'Retirement Readiness',
  description: (retAge: number) => `DCF estimate of whether retirement assets cover living needs from age ${retAge} to ${RETIREMENT_LIFE_EXPECTANCY}`,
  threshold: `sufficiency ≥${(RETIREMENT_SUFFICIENCY_PASS * 100).toFixed(0)}% pass; ${(RETIREMENT_SUFFICIENCY_WARN * 100).toFixed(0)}-${(RETIREMENT_SUFFICIENCY_PASS * 100).toFixed(0)}% warning; <${(RETIREMENT_SUFFICIENCY_WARN * 100).toFixed(0)}% fail`,
  measured: (pct: string) => `neutral sufficiency ${pct}`,
  note: 'Note: educational estimate; inflation and return are assumptions.',
}

export function check08(snapshot: Snapshot, ctx?: EngineContext): CheckResult {
  const locale = pickLocale(ctx?.locale)
  const T = pick(locale, T_ZH, T_EN)
  const proj = retirementProjection(snapshot)
  const age = oldestAge(snapshot.profile)
  const retAge = snapshot.profile.retirementAge ?? 60

  const ratio = proj.neutral.sufficiency

  let status: CheckResult['status']
  if (ratio >= RETIREMENT_SUFFICIENCY_PASS) status = 'pass'
  else if (ratio >= RETIREMENT_SUFFICIENCY_WARN) status = 'warn'
  else status = 'fail'

  const pct = (r: number) => (r >= 99 ? (locale === 'en' ? 'sufficient' : '充足') : `${(r * 100).toFixed(0)}%`)
  const gapText = proj.neutral.gapPV > 0
    ? (locale === 'en' ? `gap PV ≈ ${formatCNY(proj.neutral.gapPV)}` : `缺口现值约 ${formatCNY(proj.neutral.gapPV)}`)
    : (locale === 'en' ? 'no gap' : '无缺口')

  const L = locale === 'en'
  const lines = [
    L
      ? `Oldest member ${age}, ${proj.yearsToRetirement} years to retirement, ~${proj.retirementYears} years in retirement.`
      : `最大年龄${age}岁，距离退休${proj.yearsToRetirement}年，退休期约${proj.retirementYears}年。`,
    L ? 'Sufficiency by scenario:' : '三档情景充足率：',
    L
      ? `  Pessimistic (${RETIREMENT_SCENARIOS.pessimistic.label}): ${pct(proj.pessimistic.sufficiency)}`
      : `  悲观（${RETIREMENT_SCENARIOS.pessimistic.label}）：${pct(proj.pessimistic.sufficiency)}`,
    L
      ? `  Neutral (${RETIREMENT_SCENARIOS.neutral.label}): ${pct(proj.neutral.sufficiency)}`
      : `  中性（${RETIREMENT_SCENARIOS.neutral.label}）：${pct(proj.neutral.sufficiency)}`,
    L
      ? `  Optimistic (${RETIREMENT_SCENARIOS.optimistic.label}): ${pct(proj.optimistic.sufficiency)}`
      : `  乐观（${RETIREMENT_SCENARIOS.optimistic.label}）：${pct(proj.optimistic.sufficiency)}`,
    L
      ? `Social security / annuity pension: ${formatCNY(proj.socialPensionAnnual)} (deducted from needs)`
      : `社保/年金年领取额：${formatCNY(proj.socialPensionAnnual)}（已从需求中扣除）`,
    L
      ? `Investable assets (primary residence excluded): ${formatCNY(proj.investableAssets)}`
      : `可投资资产（已剔除自住房）：${formatCNY(proj.investableAssets)}`,
    L ? `Neutral scenario: ${gapText}` : `中性情景：${gapText}`,
    '',
    T.note,
  ]

  return {
    id: 'Q8',
    evidenceLevel: 'research',
    name: T.name,
    description: T.description(retAge),
    layer: 'qualitative',
    framework: locale === 'en' ? 'Replacement-rate model + DCF' : '养老金替代率模型 + DCF',
    status,
    severity: 'medium',
    score: status === 'pass' ? 100 : status === 'warn' ? 50 : 0,
    measuredValue: ratio,
    measuredLabel: T.measured(pct(ratio)),
    threshold: T.threshold,
    detail: lines.join('\n'),
    actionRefs: ['A8-1'],
    rangeValue: {
      low: proj.pessimistic.sufficiency,
      high: proj.optimistic.sufficiency,
    },
  }
}
