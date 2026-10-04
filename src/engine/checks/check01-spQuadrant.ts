import type { CheckResult, Snapshot } from '../../types'
import { spQuadrantAllocation } from '../metrics'
import { SP_QUADRANT_TARGETS } from '../../data/thresholds'

export function check01(snapshot: Snapshot): CheckResult {
  const alloc = spQuadrantAllocation(snapshot.assets)
  const targets = SP_QUADRANT_TARGETS

  const quadrants = [
    { name: '要花的钱(短期)', actual: alloc.shortTerm, ...targets.shortTerm },
    { name: '保命的钱(保障)', actual: alloc.protection, ...targets.protection },
    { name: '生钱的钱(增值)', actual: alloc.growth, ...targets.growth },
    { name: '保本升值的钱(稳健)', actual: alloc.stable, ...targets.stable },
  ]

  const offCount = quadrants.filter(
    (q) => Math.abs(q.actual - q.target) > q.band
  ).length

  const shortTermTooLow = alloc.shortTerm < 0.02

  let status: CheckResult['status']
  if (shortTermTooLow || offCount >= 3) status = 'fail'
  else if (offCount >= 1) status = 'warn'
  else status = 'pass'

  const score = status === 'pass' ? 100 : status === 'warn' ? 50 : 0

  return {
    id: 'Q1',
    evidenceLevel: 'heuristic',
    name: '标准普尔四象限检查',
    description: '按标准普尔家庭资产象限图，检查四大账户配置比例是否合理',
    layer: 'qualitative',
    framework: '标准普尔家庭资产象限图',
    status,
    severity: 'high',
    score,
    measuredValue: offCount,
    measuredLabel: `${offCount}/4 象限偏离目标区间`,
    threshold: '4个象限均在目标区间内→通过; 1-2个偏离→警告; ≥3个偏离或要花的钱<2%→未通过',
    detail: quadrants
      .map(
        (q) =>
          `${q.name}: 实际 ${(q.actual * 100).toFixed(1)}% (目标 ${(q.target * 100).toFixed(0)}%±${(q.band * 100).toFixed(0)}pp)${Math.abs(q.actual - q.target) > q.band ? ' ⚠' : ''}`
      )
      .join('\n'),
    actionRefs: ['A1-1', 'A1-2'],
  }
}
