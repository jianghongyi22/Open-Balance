import type { CheckResult, Snapshot, EngineContext } from '../../types'
import { spQuadrantAllocation } from '../metrics'
import { SP_QUADRANT_TARGETS } from '../../data/thresholds'
import { pick, pickLocale } from '../../i18n/checkHelpers'

const T_ZH = {
  name: '标准普尔四象限检查',
  description: '按标准普尔家庭资产象限图，检查四大账户配置比例是否合理',
  threshold: '4个象限均在目标区间内→通过; 1-2个偏离→警告; ≥3个偏离或要花的钱<2%→未通过',
  quadrantNames: ['要花的钱(短期)', '保命的钱(保障)', '生钱的钱(增值)', '保本升值的钱(稳健)'],
  measured: (n: number) => `${n}/4 象限偏离目标区间`,
  detail: (lines: string[]) => lines.join('\n'),
}

const T_EN = {
  name: 'S&P Family Quadrants',
  description: 'Checks whether the four S&P family-quadrant accounts are within their target ranges',
  threshold: 'all 4 in range → pass; 1-2 off → warning; ≥3 off or short-term <2% → fail',
  quadrantNames: ['Spending (short-term)', 'Protection (insurance)', 'Growth (investing)', 'Stability (wealth preservation)'],
  measured: (n: number) => `${n}/4 quadrants off target`,
  detail: (lines: string[]) => lines.join('\n'),
}

export function check01(snapshot: Snapshot, ctx?: EngineContext): CheckResult {
  const locale = pickLocale(ctx?.locale)
  const T = pick(locale, T_ZH, T_EN)
  const alloc = spQuadrantAllocation(snapshot.assets)
  const targets = SP_QUADRANT_TARGETS

  const quadrants = [
    { name: T.quadrantNames[0], actual: alloc.shortTerm, ...targets.shortTerm },
    { name: T.quadrantNames[1], actual: alloc.protection, ...targets.protection },
    { name: T.quadrantNames[2], actual: alloc.growth, ...targets.growth },
    { name: T.quadrantNames[3], actual: alloc.stable, ...targets.stable },
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

  const detailLines = quadrants.map(
    (q) =>
      `${q.name}: ${locale === 'en' ? 'actual' : '实际'} ${(q.actual * 100).toFixed(1)}% (${locale === 'en' ? 'target' : '目标'} ${(q.target * 100).toFixed(0)}%±${(q.band * 100).toFixed(0)}pp)${Math.abs(q.actual - q.target) > q.band ? ' ⚠' : ''}`
  )

  return {
    id: 'Q1',
    evidenceLevel: 'heuristic',
    name: T.name,
    description: T.description,
    layer: 'qualitative',
    framework: locale === 'en' ? 'S&P Family Asset Quadrants' : '标准普尔家庭资产象限图',
    status,
    severity: 'high',
    score,
    measuredValue: offCount,
    measuredLabel: T.measured(offCount),
    threshold: T.threshold,
    detail: T.detail(detailLines),
    actionRefs: ['A1-1', 'A1-2'],
  }
}
