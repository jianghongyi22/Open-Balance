import type { CheckResult, Snapshot } from '../../types'
import { retirementSufficiency, oldestAge } from '../metrics'
import { RETIREMENT_SUFFICIENCY_PASS, RETIREMENT_SUFFICIENCY_WARN } from '../../data/thresholds'

export function check08(snapshot: Snapshot): CheckResult {
  const ratio = retirementSufficiency(snapshot)
  const age = oldestAge(snapshot.profile)
  const retAge = snapshot.profile.retirementAge ?? 60

  let status: CheckResult['status']
  if (ratio >= RETIREMENT_SUFFICIENCY_PASS) status = 'pass'
  else if (ratio >= RETIREMENT_SUFFICIENCY_WARN) status = 'warn'
  else status = 'fail'

  return {
    id: 'Q8',
    name: '养老储备测算',
    description: `估算退休储备是否满足 ${retAge} 岁退休后至85岁的生活所需`,
    layer: 'qualitative',
    framework: '养老金替代率模型',
    status,
    severity: 'medium',
    score: status === 'pass' ? 100 : status === 'warn' ? 50 : 0,
    measuredValue: ratio,
    measuredLabel: `储备充足率 ${(ratio * 100).toFixed(0)}%`,
    threshold: `≥${(RETIREMENT_SUFFICIENCY_PASS * 100).toFixed(0)}%通过; ${(RETIREMENT_SUFFICIENCY_WARN * 100).toFixed(0)}-${(RETIREMENT_SUFFICIENCY_PASS * 100).toFixed(0)}%警告; <${(RETIREMENT_SUFFICIENCY_WARN * 100).toFixed(0)}%未通过`,
    detail: `当前最大年龄${age}岁，距离退休${Math.max(0, retAge - age)}年。\n当前可计入退休储备的资产约为所需金额的 ${(ratio * 100).toFixed(0)}%（基于70%收入替代率，预期寿命85岁）。${
      status === 'fail'
        ? '\n退休储备严重不足，建议加大养老储蓄力度或考虑延迟退休。'
        : status === 'warn'
          ? '\n退休储备略有不足，建议逐步补充。'
          : '\n退休储备相对充足。'
    }`,
    actionRefs: ['A8-1'],
  }
}
