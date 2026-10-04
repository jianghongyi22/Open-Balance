// ============================================================
// Open-Balance: 市场参数回测脚本
//
// 用自定义指数数据（CSV）计算年化收益/年化波动率/两两相关性，
// 输出可直接替换 src/data/marketParams.ts 中参数的 JSON。
//
// 用法：
//   node scripts/backtest-market-params.mjs <数据目录>
//
// 数据目录下每个资产一个 CSV 文件（文件名 = 资产名，如 equity.csv）：
//   日期列、价格列（全收益口径最佳），如：
//     date,close
//     2015-01-05,3857.62
//
// 输出：控制台打印年化统计 + 相关性矩阵 JSON。
// ============================================================

import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '')
  return lines.map((l) => l.split(',').map((c) => c.trim().replace(/^"|"$/g, '')))
}

function loadPrices(filePath) {
  const rows = parseCsv(readFileSync(filePath, 'utf-8'))
  // 找日期与价格列（date/close/price/收盘）
  const header = rows[0].map((h) => h.toLowerCase())
  const dateCol = header.findIndex((h) => h.includes('date') || h.includes('日期'))
  const priceCol = header.findIndex(
    (h, i) => i !== dateCol && (h.includes('close') || h.includes('price') || h.includes('收盘'))
  )
  if (dateCol < 0 || priceCol < 0) {
    throw new Error(`${filePath}: 需要 date 与 close 两列`)
  }
  const series = rows
    .slice(1)
    .map((r) => ({ date: r[dateCol], price: parseFloat(r[priceCol]) }))
    .filter((p) => !isNaN(p.price))
    .sort((a, b) => a.date.localeCompare(b.date))
  return series
}

/** 年化收益率（几何） */
function annualizedReturn(series) {
  const n = series.length
  if (n < 2) return 0
  const years = n / 252 // 交易日近似
  return Math.pow(series[n - 1].price / series[0].price, 1 / years) - 1
}

/** 年化波动率（日收益率标准差 × √252） */
function annualizedVol(series) {
  const rets = []
  for (let i = 1; i < series.length; i++) {
    rets.push(Math.log(series[i].price / series[i - 1].price))
  }
  if (rets.length < 2) return 0
  const mean = rets.reduce((s, r) => s + r, 0) / rets.length
  const variance = rets.reduce((s, r) => s + (r - mean) ** 2, 0) / (rets.length - 1)
  return Math.sqrt(variance) * Math.sqrt(252)
}

/** 两序列日收益率相关系数 */
function correlation(seriesA, seriesB) {
  // 按日期对齐
  const aligned = seriesA
    .map((p) => ({ a: p, b: seriesB.find((q) => q.date === p.date) }))
    .filter((x) => x.b)
  const rets = (s) => {
    const r = []
    for (let i = 1; i < s.length; i++) r.push(Math.log(s[i].price / s[i - 1].price))
    return r
  }
  const seqA = aligned.map((x) => x.a)
  const seqB = aligned.map((x) => x.b)
  const ra = rets(seqA)
  const rb = rets(seqB)
  const n = Math.min(ra.length, rb.length)
  if (n < 2) return 0
  const meanA = ra.slice(0, n).reduce((s, v) => s + v, 0) / n
  const meanB = rb.slice(0, n).reduce((s, v) => s + v, 0) / n
  let cov = 0, varA = 0, varB = 0
  for (let i = 0; i < n; i++) {
    cov += (ra[i] - meanA) * (rb[i] - meanB)
    varA += (ra[i] - meanA) ** 2
    varB += (rb[i] - meanB) ** 2
  }
  if (varA === 0 || varB === 0) return 0
  return cov / Math.sqrt(varA * varB)
}

const dir = resolve(process.argv[2] ?? '.')
const files = readdirSync(dir).filter((f) => f.endsWith('.csv'))

const seriesByName = {}
for (const f of files) {
  const name = f.replace(/\.csv$/i, '')
  seriesByName[name] = loadPrices(join(dir, f))
}

const names = Object.keys(seriesByName)
if (names.length < 2) {
  console.error('至少需要两个 CSV 文件（每个资产一个，含 date/close 列）')
  process.exit(1)
}

const stats = {}
for (const name of names) {
  stats[name] = {
    annualizedReturn: +annualizedReturn(seriesByName[name]).toFixed(4),
    annualizedVol: +annualizedVol(seriesByName[name]).toFixed(4),
    start: seriesByName[name][0].date,
    end: seriesByName[name][seriesByName[name].length - 1].date,
  }
}

const corr = {}
for (const a of names) {
  corr[a] = {}
  for (const b of names) {
    corr[a][b] = a === b ? 1 : +correlation(seriesByName[a], seriesByName[b]).toFixed(4)
  }
}

console.log('=== 年化统计 ===')
for (const [name, s] of Object.entries(stats)) {
  console.log(`${name}: 收益 ${(s.annualizedReturn * 100).toFixed(2)}% | 波动 ${(s.annualizedVol * 100).toFixed(2)}% | ${s.start} ~ ${s.end}`)
}
console.log('\n=== 相关性矩阵 ===')
console.log(JSON.stringify(corr, null, 2))
