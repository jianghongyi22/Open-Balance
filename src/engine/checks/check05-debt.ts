import type { CheckResult, Snapshot, EngineContext } from '../../types'
import { debtToIncome, leverageRatio } from '../metrics'
import { DTI_PASS, DTI_WARN, LEVERAGE_PASS, LEVERAGE_WARN } from '../../data/thresholds'
import { pick, pickLocale } from '../../i18n/checkHelpers'

const T_ZH = {
  name: '负债压力测试',
  description: '检查月供收入比(DSR/DTI)和总负债率是否在安全线以内',
  threshold: `DTI≤${(DTI_PASS * 100).toFixed(0)}%通过, ${(DTI_PASS * 100).toFixed(0)}-${(DTI_WARN * 100).toFixed(0)}%警告, >${(DTI_WARN * 100).toFixed(0)}%未通过`,
  measured: (d: number) => `月供占月收入 ${(d * 100).toFixed(1)}%`,
  lineDTI: (d: number, pay: number, income: number, mark: string) => `月供收入比 (DTI): ${(d * 100).toFixed(1)}% (月供¥${pay.toLocaleString()} / 月收入¥${income.toLocaleString()}) - ${mark}`,
  lineLev: (l: number, debt: number, mark: string) => `总负债率: ${(l * 100).toFixed(1)}% (负债¥${debt.toLocaleString()} / 总资产) - ${mark}`,
}

const T_EN = {
  name: 'Debt Stress Test',
  description: 'Checks whether the debt-service-to-income ratio and total leverage are within safe limits',
  threshold: `DTI≤${(DTI_PASS * 100).toFixed(0)}% pass, ${(DTI_PASS * 100).toFixed(0)}-${(DTI_WARN * 100).toFixed(0)}% warning, >${(DTI_WARN * 100).toFixed(0)}% fail`,
  measured: (d: number) => `debt service ${(d * 100).toFixed(1)}% of income`,
  lineDTI: (d: number, pay: number, income: number, mark: string) => `DTI: ${(d * 100).toFixed(1)}% (payments ¥${pay.toLocaleString()} / income ¥${income.toLocaleString()}) - ${mark}`,
  lineLev: (l: number, debt: number, mark: string) => `Leverage: ${(l * 100).toFixed(1)}% (debt ¥${debt.toLocaleString()} / total assets) - ${mark}`,
}

export function check05(snapshot: Snapshot, ctx?: EngineContext): CheckResult {
  const locale = pickLocale(ctx?.locale)
  const T = pick(locale, T_ZH, T_EN)
  const dti = debtToIncome(snapshot)
  const lev = leverageRatio(snapshot)

  const dtiStatus: CheckResult['status'] =
    dti <= DTI_PASS ? 'pass' : dti <= DTI_WARN ? 'warn' : 'fail'

  const levStatus: CheckResult['status'] =
    lev <= LEVERAGE_PASS ? 'pass' : lev <= LEVERAGE_WARN ? 'warn' : 'fail'

  const statuses = [dtiStatus, levStatus]
  const status: CheckResult['status'] =
    statuses.includes('fail') ? 'fail' : statuses.includes('warn') ? 'warn' : 'pass'

  const mark = (s: string) => (s === 'pass' ? '✓' : s === 'warn' ? '⚠' : '✗')
  const totalPay = snapshot.liabilities.reduce((s, l) => s + l.monthlyPayment, 0)
  const totalDebt = snapshot.liabilities.reduce((s, l) => s + l.remainingPrincipal, 0)

  return {
    id: 'Q5',
    evidenceLevel: 'regulatory',
    name: T.name,
    description: T.description,
    layer: 'qualitative',
    framework: locale === 'en' ? 'Bank mortgage approval standards + leverage safety line' : '银行房贷审批标准 + 负债安全线',
    status,
    severity: 'critical',
    score: status === 'pass' ? 100 : status === 'warn' ? 50 : 0,
    measuredValue: dti,
    measuredLabel: T.measured(dti),
    threshold: T.threshold,
    detail: [
      T.lineDTI(dti, totalPay, snapshot.profile.annualIncome / 12, mark(dtiStatus)),
      T.lineLev(lev, totalDebt, mark(levStatus)),
    ].join('\n'),
    actionRefs: ['A5-1', 'A5-2'],
  }
}
