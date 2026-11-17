import type { CheckResult, Snapshot, EngineContext } from '../../types'
import { liquidityRatio, illiquidRatio } from '../metrics'
import { LIQUIDITY_PASS, LIQUIDITY_WARN } from '../../data/thresholds'
import { pick, pickLocale } from '../../i18n/checkHelpers'

const T_ZH = {
  name: '流动性风险评估',
  description: '检查高流动性资产占比是否充足，评估变现能力',
  threshold: `≥${(LIQUIDITY_PASS * 100).toFixed(0)}%通过; ${(LIQUIDITY_WARN * 100).toFixed(0)}-${(LIQUIDITY_PASS * 100).toFixed(0)}%警告; <${(LIQUIDITY_WARN * 100).toFixed(0)}%未通过`,
  measured: (r: number) => `高流动性资产占 ${(r * 100).toFixed(1)}%`,
  detail: (lr: number, illr: number, verdict: string) =>
    `高流动性资产(现金+货基+可即时赎回理财)占总资产 ${(lr * 100).toFixed(1)}%\n低流动性资产(房产+保险+锁定理财)占总资产 ${(illr * 100).toFixed(1)}%\n${verdict}`,
  verdict: {
    fail: '流动性严重不足，大额意外开支可能需要贱卖资产或借贷。',
    warn: '流动性偏紧，建议适当补充。',
    pass: '流动性充足。',
  },
}

const T_EN = {
  name: 'Liquidity Risk',
  description: 'Checks whether highly liquid assets are sufficient for emergency liquidation needs',
  threshold: `≥${(LIQUIDITY_PASS * 100).toFixed(0)}% pass; ${(LIQUIDITY_WARN * 100).toFixed(0)}-${(LIQUIDITY_PASS * 100).toFixed(0)}% warning; <${(LIQUIDITY_WARN * 100).toFixed(0)}% fail`,
  measured: (r: number) => `liquid share ${(r * 100).toFixed(1)}%`,
  detail: (lr: number, illr: number, verdict: string) =>
    `Liquid assets (cash + MMF + instantly redeemable) as share of total: ${(lr * 100).toFixed(1)}%\nIlliquid assets (property + insurance + locked products): ${(illr * 100).toFixed(1)}%\n${verdict}`,
  verdict: {
    fail: 'Liquidity is critically low — a large unexpected expense may force distress sales or borrowing.',
    warn: 'Liquidity is tight; consider topping up.',
    pass: 'Liquidity is adequate.',
  },
}

export function check10(snapshot: Snapshot, ctx?: EngineContext): CheckResult {
  const locale = pickLocale(ctx?.locale)
  const T = pick(locale, T_ZH, T_EN)
  const lr = liquidityRatio(snapshot.assets)
  const illr = illiquidRatio(snapshot.assets)

  let status: CheckResult['status']
  if (lr >= LIQUIDITY_PASS) status = 'pass'
  else if (lr >= LIQUIDITY_WARN) status = 'warn'
  else status = 'fail'

  return {
    id: 'Q10',
    evidenceLevel: 'research',
    name: T.name,
    description: T.description,
    layer: 'quantitative',
    status,
    severity: 'high',
    score: status === 'pass' ? 100 : status === 'warn' ? 50 : 0,
    measuredValue: lr,
    measuredLabel: T.measured(lr),
    threshold: T.threshold,
    detail: T.detail(lr, illr, T.verdict[status]),
    actionRefs: ['A10-1'],
  }
}
