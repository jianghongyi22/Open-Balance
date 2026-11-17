import type { CheckResult, Snapshot, EngineContext } from '../../types'
import { cashDragRatio } from '../metrics'
import { CASH_DRAG_PASS, CASH_DRAG_WARN } from '../../data/thresholds'
import { pick, pickLocale } from '../../i18n/checkHelpers'

const T_ZH = {
  name: '资金效率（现金拖累）',
  description: '检查活期存款等低效资金占比，识别闲置资金',
  threshold: `≤${(CASH_DRAG_PASS * 100).toFixed(0)}%通过; ${(CASH_DRAG_PASS * 100).toFixed(0)}-${(CASH_DRAG_WARN * 100).toFixed(0)}%警告; >${(CASH_DRAG_WARN * 100).toFixed(0)}%未通过`,
  measured: (r: number) => `活期资金占 ${(r * 100).toFixed(1)}%`,
  verdict: {
    fail: '大量资金以活期形式闲置，跑输通胀。建议将超过应急金部分的资金配置到货基或短期理财。',
    warn: '活期资金略多，可以考虑优化。',
    pass: '资金利用效率良好。',
  },
}

const T_EN = {
  name: 'Capital Efficiency (Cash Drag)',
  description: 'Checks the share of idle demand-deposit cash and flags underutilized funds',
  threshold: `≤${(CASH_DRAG_PASS * 100).toFixed(0)}% pass; ${(CASH_DRAG_PASS * 100).toFixed(0)}-${(CASH_DRAG_WARN * 100).toFixed(0)}% warning; >${(CASH_DRAG_WARN * 100).toFixed(0)}% fail`,
  measured: (r: number) => `demand cash ${(r * 100).toFixed(1)}%`,
  verdict: {
    fail: 'A large share of funds sits idle in demand deposits, losing to inflation. Move anything beyond the emergency reserve into MMFs or short-term products.',
    warn: 'Idle cash is slightly high; consider optimizing.',
    pass: 'Capital efficiency is good.',
  },
}

export function check15(snapshot: Snapshot, ctx?: EngineContext): CheckResult {
  const locale = pickLocale(ctx?.locale)
  const T = pick(locale, T_ZH, T_EN)
  const ratio = cashDragRatio(snapshot.assets)

  let status: CheckResult['status']
  if (ratio <= CASH_DRAG_PASS) status = 'pass'
  else if (ratio <= CASH_DRAG_WARN) status = 'warn'
  else status = 'fail'

  return {
    id: 'Q15',
    evidenceLevel: 'research',
    name: T.name,
    description: T.description,
    layer: 'quantitative',
    status,
    severity: 'low',
    score: status === 'pass' ? 100 : status === 'warn' ? 50 : 0,
    measuredValue: ratio,
    measuredLabel: T.measured(ratio),
    threshold: T.threshold,
    detail: `${locale === 'en' ? 'Idle/demand funds make up' : '活期/无收益资金占总资产'} ${(ratio * 100).toFixed(1)}%。${T.verdict[status]}`,
    actionRefs: ['A15-1'],
  }
}
