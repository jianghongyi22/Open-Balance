import type { CheckResult, Snapshot } from '../../types'
import { liquidityRatio, illiquidRatio } from '../metrics'
import { LIQUIDITY_PASS, LIQUIDITY_WARN } from '../../data/thresholds'

export function check10(snapshot: Snapshot): CheckResult {
  const lr = liquidityRatio(snapshot.assets)
  const illr = illiquidRatio(snapshot.assets)

  let status: CheckResult['status']
  if (lr >= LIQUIDITY_PASS) status = 'pass'
  else if (lr >= LIQUIDITY_WARN) status = 'warn'
  else status = 'fail'

  return {
    id: 'Q10',
    evidenceLevel: 'research',
    name: '流动性风险评估',
    description: '检查高流动性资产占比是否充足，评估变现能力',
    layer: 'quantitative',
    status,
    severity: 'high',
    score: status === 'pass' ? 100 : status === 'warn' ? 50 : 0,
    measuredValue: lr,
    measuredLabel: `高流动性资产占 ${(lr * 100).toFixed(1)}%`,
    threshold: `≥${(LIQUIDITY_PASS * 100).toFixed(0)}%通过; ${(LIQUIDITY_WARN * 100).toFixed(0)}-${(LIQUIDITY_PASS * 100).toFixed(0)}%警告; <${(LIQUIDITY_WARN * 100).toFixed(0)}%未通过`,
    detail: `高流动性资产(现金+货基+可即时赎回理财)占总资产 ${(lr * 100).toFixed(1)}%\n低流动性资产(房产+保险+锁定理财)占总资产 ${(illr * 100).toFixed(1)}%\n${
      status === 'fail'
        ? '流动性严重不足，大额意外开支可能需要贱卖资产或借贷。'
        : status === 'warn'
          ? '流动性偏紧，建议适当补充。'
          : '流动性充足。'
    }`,
    actionRefs: ['A10-1'],
  }
}
