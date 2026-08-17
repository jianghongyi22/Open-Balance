// ============================================================
// Open-Balance: Core Type Definitions
// ============================================================

// --- Asset Categories ---

export type AssetCategory =
  | 'cash_deposit'
  | 'fixed_income'
  | 'equity'
  | 'real_estate'
  | 'insurance'
  | 'precious_metals_alternative'
  | 'forex'
  | 'other'

export const ASSET_CATEGORY_LABELS: Record<AssetCategory, string> = {
  cash_deposit: '现金及存款',
  fixed_income: '固收理财',
  equity: '权益类',
  real_estate: '房地产',
  insurance: '保险',
  precious_metals_alternative: '贵金属及另类',
  forex: '外汇',
  other: '其他',
}

export const ASSET_CATEGORY_ORDER: AssetCategory[] = [
  'cash_deposit',
  'fixed_income',
  'equity',
  'real_estate',
  'insurance',
  'precious_metals_alternative',
  'forex',
  'other',
]

export type SubCategoryMap = {
  cash_deposit: '活期存款' | '定期存款' | '大额存单' | '货币基金'
  fixed_income: '银行理财' | '国债/政金债' | '企业债/城投债' | '债券基金'
  equity: 'A股股票' | '港股' | '美股' | '指数/ETF基金' | '主动权益基金'
  real_estate: '自住房' | '投资房' | '商铺/写字楼'
  insurance: '重疾险' | '医疗险' | '定期寿险' | '意外险' | '年金险' | '增额终身寿'
  precious_metals_alternative: '黄金' | '加密货币' | '大宗商品'
  forex: '外币现金/存款' | '外汇理财'
  other: '借出款项' | '股权/期权' | '收藏品' | '其他'
}

export const SUB_CATEGORY_OPTIONS: Record<AssetCategory, string[]> = {
  cash_deposit: ['活期存款', '定期存款', '大额存单', '货币基金'],
  fixed_income: ['银行理财', '国债/政金债', '企业债/城投债', '债券基金'],
  equity: ['A股股票', '港股', '美股', '指数/ETF基金', '主动权益基金'],
  real_estate: ['自住房', '投资房', '商铺/写字楼'],
  insurance: ['重疾险', '医疗险', '定期寿险', '意外险', '年金险', '增额终身寿'],
  precious_metals_alternative: ['黄金', '加密货币', '大宗商品'],
  forex: ['外币现金/存款', '外汇理财'],
  other: ['借出款项', '股权/期权', '收藏品', '其他'],
}

// --- Liquidity & Risk ---

export type Liquidity = 'high' | 'medium' | 'low'
export type RiskLevel = 'low' | 'medium' | 'high'

export const LIQUIDITY_LABELS: Record<Liquidity, string> = {
  high: '高流动性',
  medium: '中流动性',
  low: '低流动性',
}

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
}

// --- Currency ---

export type Currency = 'CNY' | 'USD' | 'HKD' | 'EUR' | 'JPY' | 'CNY-equivalent-other'

export const CURRENCY_LABELS: Record<Currency, string> = {
  CNY: '人民币',
  USD: '美元',
  HKD: '港币',
  EUR: '欧元',
  JPY: '日元',
  'CNY-equivalent-other': '其他(按人民币计)',
}

// --- Asset ---

export interface Asset {
  id: string
  name: string
  category: AssetCategory
  subCategory?: string
  marketValue: number // 当前市值/现金价值 (CNY)
  originalCost?: number
  currency: Currency
  fxRate?: number // 汇率对人民币
  liquidity: Liquidity
  riskLevel: RiskLevel
  annualIncome?: number // 年收益(租金/分红/利息/年金)
  expectedReturnPct?: number // 预期年化收益率(%)
  heldAt?: string // 持有机构 (未来API对接)
  accountRef?: string // 账户标识 (未来API对接)
  purchaseDate?: string
  maturityDate?: string
  lockUpUntil?: string
  isPrimaryResidence?: boolean
  insuranceCoverage?: number // 保额
  insuranceAnnualPremium?: number // 年保费
  monthlyContribution?: number // 月定投额
  notes?: string
}

// --- Liability ---

export type LiabilityType = '房贷' | '车贷' | '消费贷' | '经营贷' | '其他'

export interface Liability {
  id: string
  name: string
  type: LiabilityType
  remainingPrincipal: number
  annualRatePct: number
  monthlyPayment: number
  remainingMonths: number
  collateralAssetId?: string
  notes?: string
}

// --- Household Profile ---

export type IncomeStability = 'stable' | 'variable' | 'self-employed-risky'

export const INCOME_STABILITY_LABELS: Record<IncomeStability, string> = {
  stable: '稳定(工资/固定收入)',
  variable: '波动(绩效/提成)',
  'self-employed-risky': '自雇/创业(不确定性高)',
}

export interface HouseholdProfile {
  memberAges: number[]
  dependentCount: number
  dependentAges: number[]
  annualIncome: number
  monthlyEssentialExpense: number // 刚性月支出
  incomeStability: IncomeStability
  riskToleranceScore: number // 0-100, from questionnaire
  province?: string
  retirementAge?: number // 默认 60
  goals?: {
    retirementReplacementRate?: number // 默认 0.7
    educationFundYears?: number
  }
}

// --- Diagnostic Check ---

export type CheckStatus = 'pass' | 'warn' | 'fail'
export type CheckSeverity = 'critical' | 'high' | 'medium' | 'low'
export type CheckLayer = 'qualitative' | 'quantitative'

export const CHECK_STATUS_LABELS: Record<CheckStatus, string> = {
  pass: '通过',
  warn: '警告',
  fail: '未通过',
}

export const CHECK_SEVERITY_LABELS: Record<CheckSeverity, string> = {
  critical: '临界',
  high: '高',
  medium: '中',
  low: '低',
}

export interface CheckResult {
  id: string
  name: string
  description: string
  layer: CheckLayer
  framework?: string // 框架依据
  status: CheckStatus
  severity: CheckSeverity
  score: number // 0-100
  measuredValue: number
  measuredLabel: string
  threshold: string // 通过/警告/未通过的阈值说明
  detail: string // 详细解释
  actionRefs: string[] // 关联的建议ID
}

// --- Diagnostic Report ---

export type Grade = 'A' | 'B' | 'C' | 'D'

export const GRADE_LABELS: Record<Grade, string> = {
  A: '健康',
  B: '良好',
  C: '关注',
  D: '风险',
}

export interface DiagnosticReport {
  overallScore: number // 0-100
  grade: Grade
  gradeLabel: string
  qualitativeScore: number
  quantitativeScore: number
  checks: CheckResult[]
  criticalFlag: boolean // 是否触发一票警告
  criticalChecks: string[] // 触发一票警告的检查项
  crossValidationOverrides: string[] // 定性定量交叉验证覆盖的检查项
  generatedAt: string
}

// --- Recommendation ---

export type Urgency = 'immediate' | 'this_month' | 'this_quarter'

export const URGENCY_LABELS: Record<Urgency, string> = {
  immediate: '立即处理',
  this_month: '本月内',
  this_quarter: '本季度内',
}

export interface Recommendation {
  id: string
  checkRef: string
  title: string
  description: string
  urgency: Urgency
  effort: string // e.g., "10分钟", "半天", "需咨询"
  expectedEffect: string
  steps: string[]
}

// --- Scenario ---

export interface ScenarioShocks {
  stockMarketPct: number // e.g., -30 to +30
  propertyMarketPct: number // e.g., -20 to +10
  interestRateBps: number // e.g., -200 to +200
  fxRatePct: number // e.g., -10 to +10
  incomeInterruptionMonths: number // 0-12
}

export interface ScenarioResult {
  name: string
  shocks: ScenarioShocks
  baselineReport: DiagnosticReport
  shockedReport: DiagnosticReport
  scoreDiff: number
  gradeChange: string | null // "B→C" or null
  checkDiffs: {
    checkId: string
    checkName: string
    baselineStatus: CheckStatus
    shockedStatus: CheckStatus
    scoreDiff: number
  }[]
}

// --- Snapshot (engine input) ---

export interface Snapshot {
  assets: Asset[]
  liabilities: Liability[]
  profile: HouseholdProfile
}

// --- Risk Questionnaire ---

export interface RiskQuestion {
  id: number
  question: string
  options: { label: string; score: number }[]
}

// --- Page / UI types ---

export type PageRoute =
  | '/'
  | '/onboarding'
  | '/dashboard'
  | '/assets'
  | '/report'
  | '/recommendations'
  | '/scenario-lab'
  | '/data'
