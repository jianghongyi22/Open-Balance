import type { CheckResult, Snapshot, EngineContext } from '../../types'
import { hhi, realEstateShare, maxSinglePositionShare } from '../metrics'
import {
  HHI_PASS, HHI_WARN,
  REAL_ESTATE_PASS, REAL_ESTATE_WARN,
  SINGLE_POSITION_PASS, SINGLE_POSITION_WARN,
} from '../../data/thresholds'
import { pick, pickLocale } from '../../i18n/checkHelpers'

const T_ZH = {
  name: '集中度风险评估',
  description: '通过HHI指数、房地产占比、单只持仓占比综合评估资产集中度',
  threshold: `HHI≤${HHI_PASS}且房地产≤${(REAL_ESTATE_PASS * 100).toFixed(0)}%且单只≤${(SINGLE_POSITION_PASS * 100).toFixed(0)}%→通过`,
  measured: (h: number) => `HHI ${h.toFixed(3)}`,
  lineHHI: (h: number, mark: string) => `大类资产HHI: ${h.toFixed(3)} (≤${HHI_PASS}健康, >${HHI_WARN}高度集中) - ${mark}`,
  lineRE: (r: number, mark: string) => `房地产占总资产: ${(r * 100).toFixed(1)}% (≤${(REAL_ESTATE_PASS * 100).toFixed(0)}%健康) - ${mark}`,
  lineSingle: (s: number, mark: string) => `单只最大持仓占金融资产: ${(s * 100).toFixed(1)}% (≤${(SINGLE_POSITION_PASS * 100).toFixed(0)}%健康) - ${mark}`,
  worst: (w: string) => `\n最突出的集中度问题是：${w}`,
  worstNames: ['大类资产集中度', '房地产占比', '单只持仓集中度'],
}

const T_EN = {
  name: 'Concentration Risk',
  description: 'Assesses concentration via the HHI index, real-estate share and single-position share',
  threshold: `HHI≤${HHI_PASS} & real estate≤${(REAL_ESTATE_PASS * 100).toFixed(0)}% & single≤${(SINGLE_POSITION_PASS * 100).toFixed(0)}% → pass`,
  measured: (h: number) => `HHI ${h.toFixed(3)}`,
  lineHHI: (h: number, mark: string) => `Class-level HHI: ${h.toFixed(3)} (≤${HHI_PASS} healthy, >${HHI_WARN} highly concentrated) - ${mark}`,
  lineRE: (r: number, mark: string) => `Real estate share: ${(r * 100).toFixed(1)}% (≤${(REAL_ESTATE_PASS * 100).toFixed(0)}% healthy) - ${mark}`,
  lineSingle: (s: number, mark: string) => `Largest single position (of financial assets): ${(s * 100).toFixed(1)}% (≤${(SINGLE_POSITION_PASS * 100).toFixed(0)}% healthy) - ${mark}`,
  worst: (w: string) => `\nBiggest concentration issue: ${w}`,
  worstNames: ['class-level concentration', 'real-estate share', 'single-position concentration'],
}

export function check09(snapshot: Snapshot, ctx?: EngineContext): CheckResult {
  const locale = pickLocale(ctx?.locale)
  const T = pick(locale, T_ZH, T_EN)
  const h = hhi(snapshot.assets)
  const re = realEstateShare(snapshot.assets)
  const maxSingle = maxSinglePositionShare(snapshot.assets)

  const hStatus = h <= HHI_PASS ? 'pass' : h <= HHI_WARN ? 'warn' : 'fail'
  const reStatus = re <= REAL_ESTATE_PASS ? 'pass' : re <= REAL_ESTATE_WARN ? 'warn' : 'fail'
  const sStatus = maxSingle <= SINGLE_POSITION_PASS ? 'pass' : maxSingle <= SINGLE_POSITION_WARN ? 'warn' : 'fail'

  const statuses = [hStatus, reStatus, sStatus]
  const status: CheckResult['status'] =
    statuses.includes('fail') ? 'fail' : statuses.includes('warn') ? 'warn' : 'pass'

  const worstMetric =
    reStatus === 'fail' ? T.worstNames[1] :
    sStatus === 'fail' ? T.worstNames[2] :
    hStatus === 'fail' ? T.worstNames[0] :
    reStatus === 'warn' ? T.worstNames[1] :
    sStatus === 'warn' ? T.worstNames[2] : T.worstNames[0]

  const mark = (s: string) => (s === 'pass' ? '✓' : s === 'warn' ? '⚠' : '✗')

  return {
    id: 'Q9',
    evidenceLevel: 'research',
    name: T.name,
    description: T.description,
    layer: 'quantitative',
    status,
    severity: 'high',
    score: status === 'pass' ? 100 : status === 'warn' ? 50 : 0,
    measuredValue: h,
    measuredLabel: T.measured(h),
    threshold: T.threshold,
    detail: [
      T.lineHHI(h, mark(hStatus)),
      T.lineRE(re, mark(reStatus)),
      T.lineSingle(maxSingle, mark(sStatus)),
      T.worst(worstMetric),
    ].join('\n'),
    actionRefs: ['A9-1', 'A9-2'],
  }
}
