import type { CheckResult, Snapshot } from '../../types'
import { fxExposure } from '../metrics'
import { FX_EXPOSURE_PASS, FX_EXPOSURE_WARN } from '../../data/thresholds'

export function check11(snapshot: Snapshot): CheckResult {
  const fx = fxExposure(snapshot.assets)

  let status: CheckResult['status']
  if (fx <= FX_EXPOSURE_PASS) status = 'pass'
  else if (fx <= FX_EXPOSURE_WARN) status = 'warn'
  else status = 'fail'

  return {
    id: 'Q11',
    evidenceLevel: 'research',
    name: '汇率风险评估',
    description: '检查非人民币计价资产占金融资产的比例',
    layer: 'quantitative',
    status,
    severity: 'medium',
    score: status === 'pass' ? 100 : status === 'warn' ? 50 : 0,
    measuredValue: fx,
    measuredLabel: `非人民币敞口 ${(fx * 100).toFixed(1)}%`,
    threshold: `≤${(FX_EXPOSURE_PASS * 100).toFixed(0)}%通过; ${(FX_EXPOSURE_PASS * 100).toFixed(0)}-${(FX_EXPOSURE_WARN * 100).toFixed(0)}%警告; >${(FX_EXPOSURE_WARN * 100).toFixed(0)}%未通过`,
    detail: `非人民币资产占金融资产 ${(fx * 100).toFixed(1)}%。${
      fx > FX_EXPOSURE_WARN
        ? '汇率敞口偏高，人民币升值将侵蚀资产价值。'
        : fx > FX_EXPOSURE_PASS
          ? '汇率敞口适中偏高，注意分散币种风险。'
          : '汇率敞口在合理范围内。'
    }`,
    actionRefs: ['A11-1'],
  }
}
