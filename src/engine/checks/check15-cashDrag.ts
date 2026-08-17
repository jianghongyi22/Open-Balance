import type { CheckResult, Snapshot } from '../../types'
import { cashDragRatio } from '../metrics'
import { CASH_DRAG_PASS, CASH_DRAG_WARN } from '../../data/thresholds'

export function check15(snapshot: Snapshot): CheckResult {
  const ratio = cashDragRatio(snapshot.assets)

  let status: CheckResult['status']
  if (ratio <= CASH_DRAG_PASS) status = 'pass'
  else if (ratio <= CASH_DRAG_WARN) status = 'warn'
  else status = 'fail'

  return {
    id: 'Q15',
    name: '资金效率（现金拖累）',
    description: '检查活期存款等低效资金占比，识别闲置资金',
    layer: 'quantitative',
    status,
    severity: 'low',
    score: status === 'pass' ? 100 : status === 'warn' ? 50 : 0,
    measuredValue: ratio,
    measuredLabel: `活期资金占 ${(ratio * 100).toFixed(1)}%`,
    threshold: `≤${(CASH_DRAG_PASS * 100).toFixed(0)}%通过; ${(CASH_DRAG_PASS * 100).toFixed(0)}-${(CASH_DRAG_WARN * 100).toFixed(0)}%警告; >${(CASH_DRAG_WARN * 100).toFixed(0)}%未通过`,
    detail: `活期/无收益资金占总资产 ${(ratio * 100).toFixed(1)}%。${
      ratio > CASH_DRAG_WARN
        ? '大量资金以活期形式闲置，跑输通胀。建议将超过应急金部分的资金配置到货基或短期理财。'
        : ratio > CASH_DRAG_PASS
          ? '活期资金略多，可以考虑优化。'
          : '资金利用效率良好。'
    }`,
    actionRefs: ['A15-1'],
  }
}
