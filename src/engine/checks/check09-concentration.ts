import type { CheckResult, Snapshot } from '../../types'
import { hhi, realEstateShare, maxSinglePositionShare } from '../metrics'
import {
  HHI_PASS, HHI_WARN,
  REAL_ESTATE_PASS, REAL_ESTATE_WARN,
  SINGLE_POSITION_PASS, SINGLE_POSITION_WARN,
} from '../../data/thresholds'

export function check09(snapshot: Snapshot): CheckResult {
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
    reStatus === 'fail' ? '房地产占比' :
    sStatus === 'fail' ? '单只持仓集中度' :
    hStatus === 'fail' ? '大类资产集中度' :
    reStatus === 'warn' ? '房地产占比' :
    sStatus === 'warn' ? '单只持仓集中度' : '大类资产集中度'

  return {
    id: 'Q9',
    name: '集中度风险评估',
    description: '通过HHI指数、房地产占比、单只持仓占比综合评估资产集中度',
    layer: 'quantitative',
    status,
    severity: 'high',
    score: status === 'pass' ? 100 : status === 'warn' ? 50 : 0,
    measuredValue: h,
    measuredLabel: `HHI ${h.toFixed(3)}`,
    threshold: `HHI≤${HHI_PASS}且房地产≤${(REAL_ESTATE_PASS * 100).toFixed(0)}%且单只≤${(SINGLE_POSITION_PASS * 100).toFixed(0)}%→通过`,
    detail: [
      `大类资产HHI: ${h.toFixed(3)} (≤${HHI_PASS}健康, >${HHI_WARN}高度集中) - ${hStatus === 'pass' ? '✓' : hStatus === 'warn' ? '⚠' : '✗'}`,
      `房地产占总资产: ${(re * 100).toFixed(1)}% (≤${(REAL_ESTATE_PASS * 100).toFixed(0)}%健康) - ${reStatus === 'pass' ? '✓' : reStatus === 'warn' ? '⚠' : '✗'}`,
      `单只最大持仓占金融资产: ${(maxSingle * 100).toFixed(1)}% (≤${(SINGLE_POSITION_PASS * 100).toFixed(0)}%健康) - ${sStatus === 'pass' ? '✓' : sStatus === 'warn' ? '⚠' : '✗'}`,
      `\n最突出的集中度问题是：${worstMetric}`,
    ].join('\n'),
    actionRefs: ['A9-1', 'A9-2'],
  }
}
