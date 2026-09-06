import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { processImport, parseSpreadsheetBytes } from '../src/importer/index'
import type { ImportResult } from '../src/importer/types'

// ============================================================
// Import Format Test Cases
//
// Each fixture in test-data/ is run through the full pipeline:
//   file bytes → workbook → format detection → parser → assertions
// ============================================================

const TEST_DATA_DIR = join(process.cwd(), 'test-data')

async function loadFixture(fileName: string): Promise<{ fileName: string; rawText: string; workbook: any }> {
  const p = join(TEST_DATA_DIR, fileName)
  const buf = readFileSync(p)
  // Same decode path as the browser: UTF-8 first, GBK fallback
  const { rawText, workbook } = await parseSpreadsheetBytes(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
    fileName
  )
  return { fileName, rawText, workbook }
}

async function importFixture(fileName: string): Promise<{ format: string; result: ImportResult }> {
  const { fileName: name, rawText, workbook } = await loadFixture(fileName)
  return processImport({ fileName: name, rawText, workbook })
}

function sumAssets(result: ImportResult): number {
  return result.assets.reduce((s, a) => s + a.marketValue, 0)
}

// 顶置加载全部 fixture（ESM top-level await，vitest 支持）
const wechat = await importFixture('wechat-bill.csv')
const alipay = await importFixture('alipay-bill.csv')
const suishouji = await importFixture('suishouji.csv')
const cmb = await importFixture('cmb-bank-statement.csv')
const generic = await importFixture('generic-assets.csv')
const backup = await importFixture('open-balance-backup.json')
const empty = await importFixture('empty.csv')
const unknownTable = await importFixture('unknown-table.csv')

// ------------------------------------------------------------
// 1. 微信支付账单
// ------------------------------------------------------------

describe('微信支付账单 (wechat-bill.csv)', () => {
  const { format, result } = wechat

  it('应检测为 wechat 格式', () => {
    expect(format).toBe('wechat')
  })

  it('应解析全部 19 笔交易', () => {
    expect(result.transactions).toHaveLength(19)
  })

  it('收支统计正确', () => {
    expect(result.stats.totalIncome).toBe(62_300)
    expect(result.stats.totalExpense).toBe(14_904)
  })

  it('应聚合出零钱通资产（货币基金）', () => {
    const lqt = result.assets.find((a) => a.name === '零钱通')
    expect(lqt).toBeDefined()
    expect(lqt!.category).toBe('cash_deposit')
    expect(lqt!.subCategory).toBe('货币基金')
    // +20,000 转入 − 474.30 消费 = 19,525.70
    expect(lqt!.marketValue).toBe(19_526)
  })

  it('应聚合出微信零钱资产', () => {
    const lq = result.assets.find((a) => a.name === '微信零钱')
    expect(lq).toBeDefined()
    expect(lq!.category).toBe('cash_deposit')
    // 收入 42,300 − 零钱支出 9,429.70（含信用卡还款6,000）= 32,870.30
    expect(lq!.marketValue).toBe(32_870)
  })

  it('理财通申购应产生一条警告（无法推定持仓）', () => {
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain('5,000')
  })
})

// ------------------------------------------------------------
// 2. 支付宝账单
// ------------------------------------------------------------

describe('支付宝账单 (alipay-bill.csv)', () => {
  const { format, result } = alipay

  it('应检测为 alipay 格式', () => {
    expect(format).toBe('alipay')
  })

  it('应解析全部 15 笔交易', () => {
    expect(result.transactions).toHaveLength(15)
  })

  it('收支统计正确', () => {
    expect(result.stats.totalIncome).toBeCloseTo(24_256.8, 1)
    expect(result.stats.totalExpense).toBeCloseTo(6_762.2, 1)
  })

  it('应聚合出余额宝资产（货币基金，机构子类优先）', () => {
    const yeb = result.assets.find((a) => a.name === '余额宝')
    expect(yeb).toBeDefined()
    expect(yeb!.category).toBe('cash_deposit')
    expect(yeb!.subCategory).toBe('货币基金')
    // 自动转入 20,000 + 收益 56.80 = 20,056.80
    expect(yeb!.marketValue).toBe(20_057)
  })

  it('应聚合出支付宝余额资产', () => {
    const ye = result.assets.find((a) => a.name === '支付宝余额')
    expect(ye).toBeDefined()
    // 收入 4,200 − 支出 762.20 = 3,437.80
    expect(ye!.marketValue).toBe(3_438)
  })

  it('基金定投扣款应产生一条警告', () => {
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain('6,000')
  })
})

// ------------------------------------------------------------
// 3. 随手记
// ------------------------------------------------------------

describe('随手记 (suishouji.csv)', () => {
  const { format, result } = suishouji

  it('应检测为 suishouji 格式', () => {
    expect(format).toBe('suishouji')
  })

  it('应解析全部 11 笔交易', () => {
    expect(result.transactions).toHaveLength(11)
  })

  it('收支统计正确', () => {
    expect(result.stats.totalIncome).toBe(50_500)
    expect(result.stats.totalExpense).toBeCloseTo(4_807.5, 1)
  })

  it('应按账户聚合出工商银行储蓄', () => {
    const icbc = result.assets.find((a) => a.name === '工商银行储蓄')
    expect(icbc).toBeDefined()
    // 工资 48,000 − (45+286.50+320+2,000×2) = 43,348.50
    expect(icbc!.marketValue).toBe(43_349)
  })

  it('应按账户聚合出招商银行储蓄', () => {
    const cmb = result.assets.find((a) => a.name === '招商银行储蓄')
    expect(cmb).toBeDefined()
    // 稿费 2,500 − 超市 156 = 2,344
    expect(cmb!.marketValue).toBe(2_344)
  })

  it('无警告', () => {
    expect(result.warnings).toHaveLength(0)
  })
})

// ------------------------------------------------------------
// 4. 银行流水（招商银行）
// ------------------------------------------------------------

describe('银行流水 (cmb-bank-statement.csv)', () => {
  const { format, result } = cmb

  it('应检测为 bank-generic 格式', () => {
    expect(format).toBe('bank-generic')
  })

  it('应解析全部 11 笔流水', () => {
    expect(result.transactions).toHaveLength(11)
  })

  it('收支统计正确', () => {
    expect(result.stats.totalIncome).toBe(108_000)
    expect(result.stats.totalExpense).toBeCloseTo(26_286.5, 1)
  })

  it('期末余额应覆盖流水推算值（以流水最后一行为准）', () => {
    const cmb = result.assets.find((a) => a.category === 'cash_deposit')
    expect(cmb).toBeDefined()
    expect(cmb!.marketValue).toBe(249_714) // round(249,713.50)
    expect(cmb!.name).toContain('249,714')
  })

  it('房贷还款应产生一条警告', () => {
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain('26,000')
  })
})

// ------------------------------------------------------------
// 5. 通用 CSV（资产清单）
// ------------------------------------------------------------

describe('通用 CSV (generic-assets.csv)', () => {
  const { format, result } = generic

  it('应检测为 csv-generic 格式', () => {
    expect(format).toBe('csv-generic')
  })

  it('应解析全部 6 行资产', () => {
    expect(result.assets).toHaveLength(6)
    expect(result.stats.totalTransactions).toBe(6)
  })

  it('大类列应直接映射到正确分类', () => {
    const byName = new Map(result.assets.map((a) => [a.name, a]))
    expect(byName.get('工商银行活期')!.category).toBe('cash_deposit')
    expect(byName.get('招商银行理财')!.category).toBe('fixed_income')
    expect(byName.get('沪深300ETF')!.category).toBe('equity')
    expect(byName.get('自住房')!.category).toBe('real_estate')
    expect(byName.get('重疾险现金价值')!.category).toBe('insurance')
  })

  it('无大类映射时可由名称关键词推断子类', () => {
    const etf = result.assets.find((a) => a.name === '沪深300ETF')
    expect(etf!.subCategory).toBe('指数/ETF基金')
    const lc = result.assets.find((a) => a.name === '工商银行活期')
    expect(lc!.subCategory).toBe('活期存款')
  })

  it('金额合计正确', () => {
    expect(sumAssets(result)).toBe(3_382_000)
  })

  it('持有机构列应被读取', () => {
    const cmb = result.assets.find((a) => a.name === '招商银行理财')
    expect(cmb!.heldAt).toBe('招商银行')
    const house = result.assets.find((a) => a.name === '自住房')
    expect(house!.heldAt).toBeUndefined()
  })

  it('无警告', () => {
    expect(result.warnings).toHaveLength(0)
  })
})

// ------------------------------------------------------------
// 6. Open-Balance JSON 备份
// ------------------------------------------------------------

describe('Open-Balance 备份 (open-balance-backup.json)', () => {
  const { format, result } = backup

  it('应检测为 open-balance-json 格式', () => {
    expect(format).toBe('open-balance-json')
  })

  it('应保留全部 3 项资产原样', () => {
    expect(result.assets).toHaveLength(3)
    expect(result.assets.find((a) => a.id === 'j3')!.isPrimaryResidence).toBe(true)
  })

  it('应额外携带负债与家庭档案（extras）', () => {
    const extras = result.extras as { liabilities: unknown[]; profile: unknown }
    expect(extras).toBeDefined()
    expect(extras.liabilities).toHaveLength(1)
    expect((extras.profile as { annualIncome: number }).annualIncome).toBe(320_000)
  })
})

// ------------------------------------------------------------
// 7. 兜底路径：无法识别的表格 → csv-generic + 警告
// ------------------------------------------------------------

describe('兜底路径', () => {
  it('空 CSV 应返回空结果 + 警告，不抛异常', () => {
    const { format, result } = empty
    expect(format).toBe('csv-generic')
    expect(result.assets).toHaveLength(0)
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it('无法识别的表格应落到 csv-generic', () => {
    const { format } = unknownTable
    expect(format).toBe('csv-generic')
  })
})
