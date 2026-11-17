import type { CheckResult, Snapshot, EngineContext } from '../../types'
import { fxExposure } from '../metrics'
import { FX_EXPOSURE_PASS, FX_EXPOSURE_WARN } from '../../data/thresholds'
import { pick, pickLocale } from '../../i18n/checkHelpers'

const T_ZH = {
  name: '汇率风险评估',
  description: '检查非人民币计价资产占金融资产的比例',
  threshold: `≤${(FX_EXPOSURE_PASS * 100).toFixed(0)}%通过; ${(FX_EXPOSURE_PASS * 100).toFixed(0)}-${(FX_EXPOSURE_WARN * 100).toFixed(0)}%警告; >${(FX_EXPOSURE_WARN * 100).toFixed(0)}%未通过`,
  measured: (f: number) => `非人民币敞口 ${(f * 100).toFixed(1)}%`,
  detail: (fx: number, verdict: string) => `非人民币资产占金融资产 ${(fx * 100).toFixed(1)}%。${verdict}`,
  verdict: {
    fail: '汇率敞口偏高，人民币升值将侵蚀资产价值。',
    warn: '汇率敞口适中偏高，注意分散币种风险。',
    pass: '汇率敞口在合理范围内。',
  },
}

const T_EN = {
  name: 'FX Risk',
  description: 'Checks the share of non-CNY assets within financial assets',
  threshold: `≤${(FX_EXPOSURE_PASS * 100).toFixed(0)}% pass; ${(FX_EXPOSURE_PASS * 100).toFixed(0)}-${(FX_EXPOSURE_WARN * 100).toFixed(0)}% warning; >${(FX_EXPOSURE_WARN * 100).toFixed(0)}% fail`,
  measured: (f: number) => `non-CNY exposure ${(f * 100).toFixed(1)}%`,
  detail: (fx: number, verdict: string) => `Non-CNY assets make up ${(fx * 100).toFixed(1)}% of financial assets. ${verdict}`,
  verdict: {
    fail: 'FX exposure is high — CNY appreciation would erode asset value.',
    warn: 'FX exposure is moderately high; consider diversifying currencies.',
    pass: 'FX exposure is within a reasonable range.',
  },
}

export function check11(snapshot: Snapshot, ctx?: EngineContext): CheckResult {
  const locale = pickLocale(ctx?.locale)
  const T = pick(locale, T_ZH, T_EN)
  const fx = fxExposure(snapshot.assets)

  let status: CheckResult['status']
  if (fx <= FX_EXPOSURE_PASS) status = 'pass'
  else if (fx <= FX_EXPOSURE_WARN) status = 'warn'
  else status = 'fail'

  return {
    id: 'Q11',
    evidenceLevel: 'research',
    name: T.name,
    description: T.description,
    layer: 'quantitative',
    status,
    severity: 'medium',
    score: status === 'pass' ? 100 : status === 'warn' ? 50 : 0,
    measuredValue: fx,
    measuredLabel: T.measured(fx),
    threshold: T.threshold,
    detail: T.detail(fx, T.verdict[status]),
    actionRefs: ['A11-1'],
  }
}
