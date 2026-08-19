import type { CheckResult, Snapshot } from '../../types'
import { educationProjection } from '../metrics'
import {
  EDUCATION_COST_TIERS,
  EDUCATION_SUFFICIENCY_PASS,
  EDUCATION_SUFFICIENCY_WARN,
} from '../../data/thresholds'
import { formatCNY } from '../../utils/format'

export function check17(snapshot: Snapshot): CheckResult {
  const proj = educationProjection(snapshot)

  // 无抚养对象或未设置教育目标 → 检查不适用，直接通过
  if (!proj.applicable) {
    return {
      id: 'Q17',
      evidenceLevel: 'research',
      name: '教育金储备',
      description: '检查教育金储备是否覆盖子女高等教育目标',
      layer: 'quantitative',
      status: 'pass',
      severity: 'medium',
      score: 100,
      measuredValue: 0,
      measuredLabel: '不适用',
      threshold: '无抚养对象或未设置教育目标时不适用',
      detail: '无抚养对象或未在家庭档案中设置教育目标，本项检查不适用。',
      actionRefs: [],
    }
  }

  const ratio = proj.sufficiency
  const tierLabel = EDUCATION_COST_TIERS[proj.tier!].label

  let status: CheckResult['status']
  if (ratio >= EDUCATION_SUFFICIENCY_PASS) status = 'pass'
  else if (ratio >= EDUCATION_SUFFICIENCY_WARN) status = 'warn'
  else status = 'fail'

  const pct = (r: number) => (r >= 99 ? '充足' : `${(r * 100).toFixed(0)}%`)

  return {
    id: 'Q17',
    evidenceLevel: 'research',
    name: '教育金储备',
    description: `检查教育金储备是否覆盖子女${tierLabel}目标（${formatCNY(EDUCATION_COST_TIERS[proj.tier!].totalCost)} 现价）`,
    layer: 'quantitative',
    status,
    severity: 'medium',
    score: status === 'pass' ? 100 : status === 'warn' ? 50 : 0,
    measuredValue: ratio,
    measuredLabel: `储备充足率 ${pct(ratio)}`,
    threshold: `充足率≥${(EDUCATION_SUFFICIENCY_PASS * 100).toFixed(0)}%通过; ${(EDUCATION_SUFFICIENCY_WARN * 100).toFixed(0)}-${(EDUCATION_SUFFICIENCY_PASS * 100).toFixed(0)}%警告; <${(EDUCATION_SUFFICIENCY_WARN * 100).toFixed(0)}%未通过`,
    detail: [
      `目标：${tierLabel}，距入学约 ${proj.yearsUntilEnrollment} 年。`,
      `教育金需求现值：${formatCNY(proj.needPV)}（${formatCNY(EDUCATION_COST_TIERS[proj.tier!].totalCost)} 现价按通胀增长后折现）`,
      `已定向教育金资产：${formatCNY(proj.earmarkedAssets)}（增额终身寿/年金险/名称含"教育"的资产）`,
      `缺口现值：${proj.gapPV > 0 ? formatCNY(proj.gapPV) : '无缺口'}`,
      '',
      '注：本模型为教育性估算，成本档位与通胀假设可调整。',
    ].join('\n'),
    actionRefs: ['A17-1'],
  }
}
