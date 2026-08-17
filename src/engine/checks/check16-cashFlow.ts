import type { CheckResult, Snapshot } from '../../types'
import { cashFlowCoverage } from '../metrics'
import { CASHFLOW_COVERAGE_PASS, CASHFLOW_COVERAGE_WARN } from '../../data/thresholds'

export function check16(snapshot: Snapshot): CheckResult {
  const coverage = cashFlowCoverage(snapshot)

  let status: CheckResult['status']
  if (coverage >= CASHFLOW_COVERAGE_PASS) status = 'pass'
  else if (coverage >= CASHFLOW_COVERAGE_WARN) status = 'warn'
  else status = 'fail'

  return {
    id: 'Q16',
    name: '被动现金流覆盖',
    description: '检查租金、分红、利息等被动收入能否覆盖月度刚性支出',
    layer: 'quantitative',
    status,
    severity: 'medium',
    score: status === 'pass' ? 100 : status === 'warn' ? 50 : 0,
    measuredValue: coverage,
    measuredLabel: `被动收入覆盖 ${coverage.toFixed(1)} 倍月支出`,
    threshold: `≥${CASHFLOW_COVERAGE_PASS}倍通过; ${CASHFLOW_COVERAGE_WARN}-${CASHFLOW_COVERAGE_PASS}倍警告; <${CASHFLOW_COVERAGE_WARN}倍未通过`,
    detail: `被动月收入约为月刚性支出的 ${coverage.toFixed(1)} 倍。${
      coverage >= CASHFLOW_COVERAGE_PASS
        ? '被动现金流较为健康，具备一定的财务独立性。'
        : coverage >= CASHFLOW_COVERAGE_WARN
          ? '被动现金流基本覆盖支出，但缓冲空间有限。'
          : '被动现金流严重不足，高度依赖主动劳动收入。'
    }`,
    actionRefs: ['A16-1'],
  }
}
