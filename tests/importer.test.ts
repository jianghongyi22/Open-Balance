import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { processImport, parseSpreadsheetBytes, parseCSV, autoMapColumns } from '../src/importer/index'
import { classifyConsumption, estimateMonthlyConsumption, transactionsToAssets } from '../src/importer/converter'
import type { ImportResult, RawTransaction } from '../src/importer/types'

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
    // +20,000 转入；外卖/打车/星巴克等 4 笔消费（474.30）已剔除，不参与资产估值
    expect(lqt!.marketValue).toBe(20_000)
  })

  it('应聚合出微信零钱资产', () => {
    const lq = result.assets.find((a) => a.name === '微信零钱')
    expect(lq).toBeDefined()
    expect(lq!.category).toBe('cash_deposit')
    // 收入 42,300 − 非消费支出 6,300（支付宝红包 300 + 信用卡还款 6,000）= 36,000
    // 超市/加油/网购等消费 3,129.70 已剔除
    expect(lq!.marketValue).toBe(36_000)
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
    // 收入 4,200；麦当劳/天猫超市/滴滴/肯德基/优衣库 5 笔消费 762.20 已剔除
    expect(ye!.marketValue).toBe(4_200)
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
    // 工资 48,000 − 基金定投 4,000 = 44,000；餐饮/超市/物业消费 651.50 已剔除
    expect(icbc!.marketValue).toBe(44_000)
  })

  it('应按账户聚合出招商银行储蓄', () => {
    const cmb = result.assets.find((a) => a.name === '招商银行储蓄')
    expect(cmb).toBeDefined()
    // 稿费 2,500；超市消费 156 已剔除
    expect(cmb!.marketValue).toBe(2_500)
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

// ------------------------------------------------------------
// 8. 通用 CSV 自定义列映射（Issue #17）
// ------------------------------------------------------------

describe('自定义列映射 (Issue #17)', () => {

  it('自动匹配失败的非标准表头可用自定义映射纠正', () => {
    const rows = parseCSV('产品,金额,类别\n某某理财,12345,银行理财\n')
    const workbook = { sheets: [{ name: 'Sheet1', rows }] }
    // 非标准表头（产品/金额/类别）不在自动匹配候选列表中
    expect(autoMapColumns(['产品', '金额', '类别']).nameCol).toBeNull()

    const customMap = {
      nameCol: '产品', amountCol: '金额', categoryCol: '类别',
      subCategoryCol: null, currencyCol: null, institutionCol: null, notesCol: null,
    }
    const { format, result } = processImport({
      fileName: 'x.csv', rawText: '', workbook, columnMap: customMap,
    })
    expect(format).toBe('csv-generic')
    expect(result.assets).toHaveLength(1)
    expect(result.assets[0].name).toBe('某某理财')
    expect(result.assets[0].marketValue).toBe(12345)
    expect(result.assets[0].category).toBe('fixed_income')
  })

  it('自定义映射缺省时应回退到自动匹配', () => {
    const rows = parseCSV('名称,金额,大类\n活期,1000,现金及存款\n')
    const workbook = { sheets: [{ name: 'Sheet1', rows }] }
    const { result } = processImport({ fileName: 'x.csv', rawText: '', workbook, columnMap: null })
    expect(result.assets).toHaveLength(1)
    expect(result.assets[0].name).toBe('活期')
    expect(result.assets[0].category).toBe('cash_deposit')
  })
})

// ------------------------------------------------------------
// 7. 消费识别与月度支出估算（#22）
// ------------------------------------------------------------

describe('消费识别 (consumption classification)', () => {
  const tx = (overrides: Partial<RawTransaction>): RawTransaction => ({
    date: '2026-03-01',
    type: 'expense',
    amount: 100,
    originalCategory: '',
    description: '',
    counterparty: '',
    paymentMethod: '',
    source: 'test',
    ...overrides,
  })

  it('超市/外卖/加油/物业等关键词应判定为消费', () => {
    const samples = [
      { description: '永辉超市', counterparty: '永辉超市' },
      { description: '美团外卖订单' },
      { description: '中石化加油' },
      { description: '一季度物业费' },
      { originalCategory: '餐饮美食', description: '午餐' },
      { description: '滴滴出行打车' },
    ]
    for (const s of samples) {
      expect(classifyConsumption(tx(s))).toBe(true)
    }
  })

  it('理财申购/信用卡还款/工资收入不应判定为消费', () => {
    expect(classifyConsumption(tx({ description: '稳健理财申购' }))).toBe(false)
    expect(classifyConsumption(tx({ description: '信用卡还款' }))).toBe(false)
    expect(classifyConsumption(tx({ description: '沪深300定投' }))).toBe(false)
    expect(classifyConsumption(tx({ type: 'income', description: '工资入账' }))).toBe(false)
    expect(classifyConsumption(tx({ type: 'transfer', description: '朋友转账' }))).toBe(false)
  })

  it('按账单周期折算月均消费（微信账单：10 笔 3,604 元，约 4 个月 → 901/月）', () => {
    const { result } = wechat
    expect(result.stats.consumptionTxCount).toBe(10)
    expect(result.stats.consumptionTotal).toBe(3_604)
    expect(result.stats.consumptionMonths).toBe(4)
    expect(result.stats.consumptionMonthly).toBe(901)
  })

  it('支付宝账单消费统计（5 笔 762 元）', () => {
    const { result } = alipay
    expect(result.stats.consumptionTxCount).toBe(5)
    expect(result.stats.consumptionTotal).toBe(762)
    expect(result.stats.consumptionMonthly).toBe(191)
  })

  it('随手记账单消费统计（4 笔 808 元）', () => {
    const { result } = suishouji
    expect(result.stats.consumptionTxCount).toBe(4)
    expect(result.stats.consumptionTotal).toBe(808)
    expect(result.stats.consumptionMonthly).toBe(202)
  })

  it('纯消费账单：不产出资产，且不再给出「可能为理财申购」的误导警告', () => {
    const pure = Array.from({ length: 12 }, (_, i) =>
      tx({
        date: i < 6 ? `2026-01-0${i + 1}` : `2026-03-0${i - 5}`,
        description: i % 2 === 0 ? '永辉超市购物' : '美团外卖',
        amount: 100 + i * 10,
      })
    )
    const warnings: string[] = []
    const assets = transactionsToAssets(pure, '微信支付', warnings)
    expect(assets).toHaveLength(0)
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('全部为生活消费支出')
    expect(warnings[0]).not.toContain('理财申购')

    const est = estimateMonthlyConsumption(pure)
    expect(est.txCount).toBe(12)
    expect(est.total).toBe(1_860) // 100+110+...+210
    expect(est.months).toBe(2)
    expect(est.monthly).toBe(930)
  })

  it('单笔消费：至少按 1 个月折算', () => {
    const one = [tx({ description: '超市' })]
    const est = estimateMonthlyConsumption(one)
    expect(est.months).toBe(1)
    expect(est.monthly).toBe(100)
  })
})
