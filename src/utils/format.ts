// ============================================================
// Open-Balance: Formatting Utilities
// ============================================================

const CNY_FORMATTER = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const CNY_FORMATTER_PRECISE = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const PCT_FORMATTER = new Intl.NumberFormat('zh-CN', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

const NUM_FORMATTER = new Intl.NumberFormat('zh-CN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const NUM_FORMATTER_2DP = new Intl.NumberFormat('zh-CN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatCNY(value: number): string {
  return CNY_FORMATTER.format(value)
}

export function formatCNYPrecise(value: number): string {
  return CNY_FORMATTER_PRECISE.format(value)
}

export function formatPct(value: number): string {
  return PCT_FORMATTER.format(value)
}

export function formatNum(value: number): string {
  return NUM_FORMATTER.format(value)
}

export function formatNum2dp(value: number): string {
  return NUM_FORMATTER_2DP.format(value)
}

export function formatMonth(months: number): string {
  if (months >= 12) {
    const years = Math.floor(months / 12)
    const remaining = Math.round(months % 12)
    return remaining > 0 ? `${years}年${remaining}个月` : `${years}年`
  }
  return `${Math.round(months)}个月`
}

export function formatTenThousands(value: number): string {
  const wan = value / 10000
  if (wan >= 10000) {
    return `${(wan / 10000).toFixed(1)}亿`
  }
  return `${wan.toFixed(0)}万`
}
