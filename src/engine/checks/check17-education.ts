import type { CheckResult, Snapshot, EngineContext } from '../../types'
import { educationProjection } from '../metrics'
import {
  EDUCATION_COST_TIERS,
  EDUCATION_SUFFICIENCY_PASS,
  EDUCATION_SUFFICIENCY_WARN,
} from '../../data/thresholds'
import { formatCNY } from '../../utils/format'
import { pick, pickLocale } from '../../i18n/checkHelpers'

const T_ZH = {
  name: '教育金储备',
  description: '检查教育金储备是否覆盖子女高等教育目标',
  descriptionTier: (label: string, cost: string) => `检查教育金储备是否覆盖子女${label}目标（${cost} 现价）`,
  threshold: `充足率≥${(EDUCATION_SUFFICIENCY_PASS * 100).toFixed(0)}%通过; ${(EDUCATION_SUFFICIENCY_WARN * 100).toFixed(0)}-${(EDUCATION_SUFFICIENCY_PASS * 100).toFixed(0)}%警告; <${(EDUCATION_SUFFICIENCY_WARN * 100).toFixed(0)}%未通过`,
  measured: (pct: string) => `储备充足率 ${pct}`,
  na: {
    measured: '不适用',
    threshold: '无抚养对象或未设置教育目标时不适用',
    detail: '无抚养对象或未在家庭档案中设置教育目标，本项检查不适用。',
  },
  lineTarget: (label: string, years: number) => `目标：${label}，距入学约 ${years} 年。`,
  lineNeed: (pv: number, cost: string) => `教育金需求现值：${formatCNY(pv)}（${cost} 现价按通胀增长后折现）`,
  lineEarmarked: (v: number) => `已定向教育金资产：${formatCNY(v)}（增额终身寿/年金险/名称含"教育"的资产）`,
  lineGap: (gap: string) => `缺口现值：${gap}`,
  note: '注：本模型为教育性估算，成本档位与通胀假设可调整。',
}

const T_EN = {
  name: 'Education Fund',
  description: 'Checks whether the education fund covers the children\'s higher-education goal',
  descriptionTier: (label: string, cost: string) => `Checks whether the education fund covers the ${label} goal (${cost} at current prices)`,
  threshold: `sufficiency ≥${(EDUCATION_SUFFICIENCY_PASS * 100).toFixed(0)}% pass; ${(EDUCATION_SUFFICIENCY_WARN * 100).toFixed(0)}-${(EDUCATION_SUFFICIENCY_PASS * 100).toFixed(0)}% warning; <${(EDUCATION_SUFFICIENCY_WARN * 100).toFixed(0)}% fail`,
  measured: (pct: string) => `sufficiency ${pct}`,
  na: {
    measured: 'N/A',
    threshold: 'Not applicable without dependents or an education goal',
    detail: 'No dependents or no education goal set in the household profile — check not applicable.',
  },
  lineTarget: (label: string, years: number) => `Goal: ${label}, about ${years} years to enrollment.`,
  lineNeed: (pv: number, cost: string) => `Present value of education need: ${formatCNY(pv)} (${cost} at current prices, inflated and discounted)`,
  lineEarmarked: (v: number) => `Earmarked education assets: ${formatCNY(v)} (whole life / annuity policies or assets named "education")`,
  lineGap: (gap: string) => `Gap PV: ${gap}`,
  note: 'Note: educational estimate; cost tiers and inflation assumptions are adjustable.',
}

export function check17(snapshot: Snapshot, ctx?: EngineContext): CheckResult {
  const locale = pickLocale(ctx?.locale)
  const T = pick(locale, T_ZH, T_EN)
  const proj = educationProjection(snapshot)

  if (!proj.applicable) {
    return {
      id: 'Q17',
      evidenceLevel: 'research',
      name: T.name,
      description: T.description,
      layer: 'quantitative',
      status: 'pass',
      severity: 'medium',
      score: 100,
      measuredValue: 0,
      measuredLabel: T.na.measured,
      threshold: T.na.threshold,
      detail: T.na.detail,
      actionRefs: [],
    }
  }

  const ratio = proj.sufficiency
  const tierLabel = locale === 'en'
    ? (proj.tier === 'domestic' ? 'Domestic Bachelor' : 'Overseas Bachelor')
    : EDUCATION_COST_TIERS[proj.tier!].label
  const tierCost = formatCNY(EDUCATION_COST_TIERS[proj.tier!].totalCost)

  let status: CheckResult['status']
  if (ratio >= EDUCATION_SUFFICIENCY_PASS) status = 'pass'
  else if (ratio >= EDUCATION_SUFFICIENCY_WARN) status = 'warn'
  else status = 'fail'

  const pct = (r: number) => (r >= 99 ? (locale === 'en' ? 'sufficient' : '充足') : `${(r * 100).toFixed(0)}%`)
  const gap = proj.gapPV > 0 ? formatCNY(proj.gapPV) : (locale === 'en' ? 'no gap' : '无缺口')

  return {
    id: 'Q17',
    evidenceLevel: 'research',
    name: T.name,
    description: T.descriptionTier(tierLabel, tierCost),
    layer: 'quantitative',
    status,
    severity: 'medium',
    score: status === 'pass' ? 100 : status === 'warn' ? 50 : 0,
    measuredValue: ratio,
    measuredLabel: T.measured(pct(ratio)),
    threshold: T.threshold,
    detail: [
      T.lineTarget(tierLabel, proj.yearsUntilEnrollment),
      T.lineNeed(proj.needPV, tierCost),
      T.lineEarmarked(proj.earmarkedAssets),
      T.lineGap(gap),
      '',
      T.note,
    ].join('\n'),
    actionRefs: ['A17-1'],
  }
}
