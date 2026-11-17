// ============================================================
// Open-Balance: 类型标签双语映射
//
// 引擎内部逻辑（关键词匹配等）仍使用中文字符串，本模块只负责
// 展示层标签。新增子类/标签时需在 zh 与 en 两份中同步。
// ============================================================

import type { Locale } from './types'
import type {
  AssetCategory,
  CheckStatus,
  CheckSeverity,
  CheckLayer,
  EvidenceLevel,
  Currency,
  Liquidity,
  RiskLevel,
  Grade,
  Urgency,
  LiabilityType,
  IncomeStability,
} from '../types'

export interface LabelGroups {
  category: Record<AssetCategory, string>
  subCategory: Record<string, string>
  liquidity: Record<Liquidity, string>
  riskLevel: Record<RiskLevel, string>
  currency: Record<Currency, string>
  status: Record<CheckStatus, string>
  severity: Record<CheckSeverity, string>
  layer: Record<CheckLayer, string>
  evidence: Record<EvidenceLevel, string>
  grade: Record<Grade, string>
  urgency: Record<Urgency, string>
  liabilityType: Record<LiabilityType, string>
  incomeStability: Record<IncomeStability, string>
}

const zh: LabelGroups = {
  category: {
    cash_deposit: '现金及存款',
    fixed_income: '固收理财',
    equity: '权益类',
    real_estate: '房地产',
    insurance: '保险',
    precious_metals_alternative: '贵金属及另类',
    forex: '外汇',
    other: '其他',
  },
  subCategory: {
    活期存款: '活期存款',
    定期存款: '定期存款',
    大额存单: '大额存单',
    货币基金: '货币基金',
    银行理财: '银行理财',
    '国债/政金债': '国债/政金债',
    '企业债/城投债': '企业债/城投债',
    债券基金: '债券基金',
    A股股票: 'A股股票',
    港股: '港股',
    美股: '美股',
    '指数/ETF基金': '指数/ETF基金',
    主动权益基金: '主动权益基金',
    自住房: '自住房',
    投资房: '投资房',
    '商铺/写字楼': '商铺/写字楼',
    重疾险: '重疾险',
    医疗险: '医疗险',
    定期寿险: '定期寿险',
    意外险: '意外险',
    年金险: '年金险',
    增额终身寿: '增额终身寿',
    黄金: '黄金',
    加密货币: '加密货币',
    大宗商品: '大宗商品',
    '外币现金/存款': '外币现金/存款',
    外汇理财: '外汇理财',
    借出款项: '借出款项',
    '股权/期权': '股权/期权',
    收藏品: '收藏品',
    其他: '其他',
  },
  liquidity: { high: '高流动性', medium: '中流动性', low: '低流动性' },
  riskLevel: { low: '低风险', medium: '中风险', high: '高风险' },
  currency: {
    CNY: '人民币',
    USD: '美元',
    HKD: '港币',
    EUR: '欧元',
    JPY: '日元',
    'CNY-equivalent-other': '其他(按人民币计)',
  },
  status: { pass: '通过', warn: '警告', fail: '未通过' },
  severity: { critical: '临界', high: '高', medium: '中', low: '低' },
  layer: { qualitative: '定性', quantitative: '定量' },
  evidence: { heuristic: '经验法则', research: '研究依据', regulatory: '监管标准' },
  grade: { A: '健康', B: '良好', C: '关注', D: '风险' },
  urgency: { immediate: '立即处理', this_month: '本月内', this_quarter: '本季度内' },
  liabilityType: { 房贷: '房贷', 车贷: '车贷', 消费贷: '消费贷', 经营贷: '经营贷', 其他: '其他' },
  incomeStability: {
    stable: '稳定(工资/固定收入)',
    variable: '波动(绩效/提成)',
    'self-employed-risky': '自雇/创业(不确定性高)',
  },
}

const en: LabelGroups = {
  category: {
    cash_deposit: 'Cash & Deposits',
    fixed_income: 'Fixed Income',
    equity: 'Equities',
    real_estate: 'Real Estate',
    insurance: 'Insurance',
    precious_metals_alternative: 'Precious Metals & Alternatives',
    forex: 'Foreign Exchange',
    other: 'Other',
  },
  subCategory: {
    活期存款: 'Demand Deposit',
    定期存款: 'Time Deposit',
    大额存单: 'Certificate of Deposit',
    货币基金: 'Money Market Fund',
    银行理财: 'Bank Wealth Management',
    '国债/政金债': 'Government / Policy Bonds',
    '企业债/城投债': 'Corporate / LGFV Bonds',
    债券基金: 'Bond Fund',
    A股股票: 'A-Shares',
    港股: 'HK Stocks',
    美股: 'US Stocks',
    '指数/ETF基金': 'Index / ETF Fund',
    主动权益基金: 'Active Equity Fund',
    自住房: 'Primary Residence',
    投资房: 'Investment Property',
    '商铺/写字楼': 'Commercial Property',
    重疾险: 'Critical Illness Insurance',
    医疗险: 'Medical Insurance',
    定期寿险: 'Term Life Insurance',
    意外险: 'Accident Insurance',
    年金险: 'Annuity Insurance',
    增额终身寿: 'Whole Life Insurance',
    黄金: 'Gold',
    加密货币: 'Cryptocurrency',
    大宗商品: 'Commodities',
    '外币现金/存款': 'Foreign Currency Cash / Deposits',
    外汇理财: 'FX Wealth Management',
    借出款项: 'Loans Receivable',
    '股权/期权': 'Equity / Options',
    收藏品: 'Collectibles',
    其他: 'Other',
  },
  liquidity: { high: 'High Liquidity', medium: 'Medium Liquidity', low: 'Low Liquidity' },
  riskLevel: { low: 'Low Risk', medium: 'Medium Risk', high: 'High Risk' },
  currency: {
    CNY: 'CNY',
    USD: 'USD',
    HKD: 'HKD',
    EUR: 'EUR',
    JPY: 'JPY',
    'CNY-equivalent-other': 'Other (in CNY)',
  },
  status: { pass: 'Pass', warn: 'Warning', fail: 'Fail' },
  severity: { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' },
  layer: { qualitative: 'Qualitative', quantitative: 'Quantitative' },
  evidence: { heuristic: 'Heuristic', research: 'Research-based', regulatory: 'Regulatory' },
  grade: { A: 'Healthy', B: 'Good', C: 'Attention', D: 'At Risk' },
  urgency: { immediate: 'Immediate', this_month: 'This Month', this_quarter: 'This Quarter' },
  liabilityType: {
    房贷: 'Mortgage',
    车贷: 'Auto Loan',
    消费贷: 'Consumer Loan',
    经营贷: 'Business Loan',
    其他: 'Other',
  },
  incomeStability: {
    stable: 'Stable (salary / fixed income)',
    variable: 'Variable (performance / commission)',
    'self-employed-risky': 'Self-employed / startup (high uncertainty)',
  },
}

export const LABELS: Record<Locale, LabelGroups> = { zh, en }
