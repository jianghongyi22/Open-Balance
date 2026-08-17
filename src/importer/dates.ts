// ============================================================
// Open-Balance Importer: Date Parsing Helpers
//
// Handles the many date representations found in exported bills:
// - String dates: "2026-01-15", "2026/01/15", "20260115",
//   "2026-01-15 10:30:00"
// - Excel serial numbers (real .xls/.xlsx exports store dates
//   as numbers; epoch 1899-12-30)
// ============================================================

const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30)

export function toDateStr(value: unknown): string {
  if (value === null || value === undefined) return ''

  // Excel serial date (number)
  if (typeof value === 'number') {
    if (value < 1 || value > 60000) return '' // not a plausible date serial
    const ms = EXCEL_EPOCH_MS + value * 86_400_000
    const d = new Date(ms)
    if (isNaN(d.getTime())) return ''
    return d.toISOString().slice(0, 10)
  }

  const str = String(value).trim()
  if (!str) return ''

  // ISO / Chinese datetime
  const d = new Date(str)
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)

  // YYYYMMDD compact
  if (str.length === 8 && /^\d{8}$/.test(str)) {
    return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`
  }

  // YYYY/MM/DD or YYYY-MM-DD or YYYY.MM.DD
  const m = str.match(/(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/)
  if (m) {
    return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`
  }

  return str.slice(0, 10)
}

/**
 * Parse a money string to a float.
 * Tolerates: "¥286.50", "1,299.00", "45", "", undefined, NaN.
 * Empty / non-numeric → 0.
 */
export function toAmount(value: unknown): number {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return isFinite(value) ? value : 0
  const cleaned = String(value).replace(/[¥$,，\s]/g, '')
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : n
}
