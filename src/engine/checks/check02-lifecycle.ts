import type { CheckResult, Snapshot, EngineContext } from '../../types'
import { lifecycleAge, lifecycleEquityTarget, growthAssetShare } from '../metrics'
import { LIFECYCLE_BAND } from '../../data/thresholds'
import { pick, pickLocale } from '../../i18n/checkHelpers'

const T_ZH = {
  name: '生命周期适配度',
  description: '检查当前权益/成长类资产比例是否符合年龄对应的风险承受能力',
  threshold: (age: number) => `目标 ${lifecycleEquityTarget(age) * 100}% ±${(LIFECYCLE_BAND * 100).toFixed(0)}pp (基于经济支柱年龄${age}岁)`,
  measured: (a: number) => `成长类资产占比 ${(a * 100).toFixed(1)}%`,
  detail: (age: number, target: number, actual: number, diff: number) =>
    `经济支柱年龄${age}岁，目标权益/成长仓位 ${(target * 100).toFixed(1)}%，当前 ${(actual * 100).toFixed(1)}%，偏差 ${(diff > 0 ? '+' : '')}${(diff * 100).toFixed(1)}pp。${
      actual > target + LIFECYCLE_BAND
        ? '成长类资产偏高，建议适当降低风险敞口。'
        : actual < target - LIFECYCLE_BAND
          ? '成长类资产偏低，长期可能难以跑赢通胀。'
          : '配置与年龄阶段匹配。'
    }`,
}

const T_EN = {
  name: 'Lifecycle Fit',
  description: 'Checks whether the growth-asset share fits the risk capacity implied by age',
  threshold: (age: number) => `target ${lifecycleEquityTarget(age) * 100}% ±${(LIFECYCLE_BAND * 100).toFixed(0)}pp (breadwinner age ${age})`,
  measured: (a: number) => `growth share ${(a * 100).toFixed(1)}%`,
  detail: (age: number, target: number, actual: number, diff: number) =>
    `Breadwinner age ${age}, target growth allocation ${(target * 100).toFixed(1)}%, current ${(actual * 100).toFixed(1)}%, deviation ${(diff > 0 ? '+' : '')}${(diff * 100).toFixed(1)}pp. ${
      actual > target + LIFECYCLE_BAND
        ? 'Growth assets are overweight — consider reducing risk exposure.'
        : actual < target - LIFECYCLE_BAND
          ? 'Growth assets are underweight — long-term returns may lag inflation.'
          : 'Allocation matches the life stage.'
    }`,
}

export function check02(snapshot: Snapshot, ctx?: EngineContext): CheckResult {
  const locale = pickLocale(ctx?.locale)
  const T = pick(locale, T_ZH, T_EN)
  const age = lifecycleAge(snapshot.profile)
  const target = lifecycleEquityTarget(age)
  const actual = growthAssetShare(snapshot.assets)
  const diff = actual - target

  let status: CheckResult['status']
  if (Math.abs(diff) <= LIFECYCLE_BAND) status = 'pass'
  else if (Math.abs(diff) <= LIFECYCLE_BAND * 2) status = 'warn'
  else status = 'fail'

  return {
    id: 'Q2',
    evidenceLevel: 'research',
    name: T.name,
    description: T.description,
    layer: 'qualitative',
    framework: locale === 'en' ? 'Lifecycle theory (110-age rule)' : '生命周期理论 (110-年龄法则)',
    status,
    severity: 'medium',
    score: status === 'pass' ? 100 : status === 'warn' ? 50 : 0,
    measuredValue: actual,
    measuredLabel: T.measured(actual),
    threshold: T.threshold(age),
    detail: T.detail(age, target, actual, diff),
    actionRefs: ['A2-1'],
  }
}
