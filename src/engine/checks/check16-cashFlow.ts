import type { CheckResult, Snapshot, EngineContext } from '../../types'
import { cashFlowCoverage } from '../metrics'
import { CASHFLOW_COVERAGE_PASS, CASHFLOW_COVERAGE_WARN } from '../../data/thresholds'
import { pick, pickLocale } from '../../i18n/checkHelpers'

const T_ZH = {
  name: '被动现金流覆盖',
  description: '检查租金、分红、利息等被动收入能否覆盖月度刚性支出',
  threshold: `≥${CASHFLOW_COVERAGE_PASS}倍通过; ${CASHFLOW_COVERAGE_WARN}-${CASHFLOW_COVERAGE_PASS}倍警告; <${CASHFLOW_COVERAGE_WARN}倍未通过`,
  measured: (c: number) => `被动收入覆盖 ${c.toFixed(1)} 倍月支出`,
  verdict: {
    pass: '被动现金流较为健康，具备一定的财务独立性。',
    warn: '被动现金流基本覆盖支出，但缓冲空间有限。',
    fail: '被动现金流严重不足，高度依赖主动劳动收入。',
  },
}

const T_EN = {
  name: 'Passive Cash-Flow Coverage',
  description: 'Checks whether passive income (rent, dividends, interest) covers monthly essential spending',
  threshold: `≥${CASHFLOW_COVERAGE_PASS}× pass; ${CASHFLOW_COVERAGE_WARN}-${CASHFLOW_COVERAGE_PASS}× warning; <${CASHFLOW_COVERAGE_WARN}× fail`,
  measured: (c: number) => `passive income covers ${c.toFixed(1)}× monthly spending`,
  verdict: {
    pass: 'Passive cash flow is healthy — a decent level of financial independence.',
    warn: 'Passive cash flow roughly covers spending, with little buffer.',
    fail: 'Passive cash flow is critically low — heavy reliance on active labor income.',
  },
}

export function check16(snapshot: Snapshot, ctx?: EngineContext): CheckResult {
  const locale = pickLocale(ctx?.locale)
  const T = pick(locale, T_ZH, T_EN)
  const coverage = cashFlowCoverage(snapshot)

  let status: CheckResult['status']
  if (coverage >= CASHFLOW_COVERAGE_PASS) status = 'pass'
  else if (coverage >= CASHFLOW_COVERAGE_WARN) status = 'warn'
  else status = 'fail'

  return {
    id: 'Q16',
    evidenceLevel: 'research',
    name: T.name,
    description: T.description,
    layer: 'quantitative',
    status,
    severity: 'medium',
    score: status === 'pass' ? 100 : status === 'warn' ? 50 : 0,
    measuredValue: coverage,
    measuredLabel: T.measured(coverage),
    threshold: T.threshold,
    detail: `${locale === 'en' ? 'Passive monthly income covers' : '被动月收入约为月刚性支出的'} ${coverage.toFixed(1)} ${locale === 'en' ? '× essential spending.' : '倍。'}${T.verdict[status]}`,
    actionRefs: ['A16-1'],
  }
}
