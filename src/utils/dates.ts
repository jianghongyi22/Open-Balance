// ============================================================
// Open-Balance: Date & Amount Parsing Helpers
//
// Shared by the diagnostic engine (maturity checks) and the
// importer (bill exports). Handles the many representations
// found in real-world data:
// - String dates: "2026-01-15", "2026/01/15", "20260115",
//   "2026-01-15 10:30:00"
// - Excel serial numbers (real .xls/.xlsx exports store dates
//   as numbers; epoch 1899-12-30)
// ============================================================

const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30)
const DAY_MS = 86_400_000

/**
 * Parse a date-like value to an epoch-millisecond timestamp.
 * Returns null when the value is empty or unparseable.
 */
export function parseDateToMs(value: unknown): number | null {
  if (value === null || value === undefined) return null

  // JS Date 对象（exceljs 的日期单元格返回 Date）
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value.getTime()
  }

  // Excel serial date (number)
  if (typeof value === 'number') {
    if (value < 1 || value > 60000) return null // not a plausible date serial
    const ms = EXCEL_EPOCH_MS + value * DAY_MS
    return isNaN(ms) ? null : ms
  }

  const str = String(value).trim()
  if (!str) return null

  // YYYY/MM/DD or YYYY-MM-DD or YYYY.MM.DD
  const m = str.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})/)
  if (m) {
    const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    return isNaN(ms) ? null : ms
  }

  // YYYYMMDD compact
  if (str.length === 8 && /^\d{8}$/.test(str)) {
    const ms = Date.UTC(
      Number(str.slice(0, 4)),
      Number(str.slice(4, 6)) - 1,
      Number(str.slice(6, 8))
    )
    return isNaN(ms) ? null : ms
  }

  // ISO / Chinese datetime ("2026-01-15 10:30:00")
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d.getTime()
}

/** Normalize any date-like value to a "YYYY-MM-DD" string ('' if unparseable). */
export function toDateStr(value: unknown): string {
  const ms = parseDateToMs(value)
  if (ms === null) return ''
  const d = new Date(ms)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

/**
 * Parse a money value to a float.
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
