import type { CheckResult, Snapshot } from '../../types'
import { oldestAge, lifecycleEquityTarget, growthAssetShare } from '../metrics'
import { LIFECYCLE_BAND } from '../../data/thresholds'

export function check02(snapshot: Snapshot): CheckResult {
  const age = oldestAge(snapshot.profile)
  const target = lifecycleEquityTarget(age)
  const actual = growthAssetShare(snapshot.assets)
  const diff = actual - target

  let status: CheckResult['status']
  if (Math.abs(diff) <= LIFECYCLE_BAND) status = 'pass'
  else if (Math.abs(diff) <= LIFECYCLE_BAND * 2) status = 'warn'
  else status = 'fail'

  return {
    id: 'Q2',
    evidenceLevel: 'research',
    name: '生命周期适配度',
    description: '检查当前权益/成长类资产比例是否符合年龄对应的风险承受能力',
    layer: 'qualitative',
    framework: '生命周期理论 (110-年龄法则)',
    status,
    severity: 'medium',
    score: status === 'pass' ? 100 : status === 'warn' ? 50 : 0,
    measuredValue: actual,
    measuredLabel: `成长类资产占比 ${(actual * 100).toFixed(1)}%`,
    threshold: `目标 ${(target * 100).toFixed(1)}% ±${(LIFECYCLE_BAND * 100).toFixed(0)}pp (基于最大年龄${age}岁)`,
    detail: `最大年龄${age}岁，目标权益/成长仓位 ${(target * 100).toFixed(1)}%，当前 ${(actual * 100).toFixed(1)}%，偏差 ${(diff > 0 ? '+' : '')}${(diff * 100).toFixed(1)}pp。${
      actual > target + LIFECYCLE_BAND
        ? '成长类资产偏高，建议适当降低风险敞口。'
        : actual < target - LIFECYCLE_BAND
          ? '成长类资产偏低，长期可能难以跑赢通胀。'
          : '配置与年龄阶段匹配。'
    }`,
    actionRefs: ['A2-1'],
  }
}
