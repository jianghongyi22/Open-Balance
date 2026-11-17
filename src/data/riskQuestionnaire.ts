// ============================================================
// Open-Balance: Risk Tolerance Questionnaire
// 10 questions scoring 0-100, mapping to 3 risk profiles.
// ============================================================

import type { RiskQuestion } from '../types'
import type { Locale } from '../i18n/types'

export const RISK_QUESTIONS_ZH: RiskQuestion[] = [
  {
    id: 1,
    question: '您的年龄是？',
    options: [
      { label: '55岁以上', score: 0 },
      { label: '45-55岁', score: 3 },
      { label: '35-45岁', score: 6 },
      { label: '25-35岁', score: 10 },
      { label: '25岁以下', score: 12 },
    ],
  },
  {
    id: 2,
    question: '您的家庭年收入稳定程度如何？',
    options: [
      { label: '非常不稳定（自由职业/创业初期）', score: 0 },
      { label: '比较稳定（企业职员，但行业波动大）', score: 4 },
      { label: '很稳定（公务员/事业单位/国企）', score: 10 },
      { label: '非常稳定且有持续增长预期', score: 12 },
    ],
  },
  {
    id: 3,
    question: '您的投资经验是？',
    options: [
      { label: '几乎没有，只存过定期和买过理财', score: 0 },
      { label: '有一定的基金投资经验', score: 4 },
      { label: '投资过股票/基金，了解市场波动', score: 8 },
      { label: '经验丰富，参与过多种投资品类', score: 12 },
    ],
  },
  {
    id: 4,
    question: '您的投资目标是？',
    options: [
      { label: '保本为主，能跑赢通胀就行', score: 0 },
      { label: '稳健增值，愿意承受小幅波动', score: 5 },
      { label: '追求较高收益，能承受一定回撤', score: 10 },
      { label: '追求高收益，能承受较大回撤', score: 12 },
    ],
  },
  {
    id: 5,
    question: '如果您的投资组合在一年内下跌了20%，您会？',
    options: [
      { label: '非常焦虑，全部赎回', score: 0 },
      { label: '比较担心，考虑减仓', score: 4 },
      { label: '可以接受，继续持有观望', score: 8 },
      { label: '认为是加仓机会', score: 12 },
    ],
  },
  {
    id: 6,
    question: '您的投资期限大概是？',
    options: [
      { label: '1年以内，随时可能需要用钱', score: 0 },
      { label: '1-3年', score: 4 },
      { label: '3-5年', score: 8 },
      { label: '5年以上，长期投资', score: 12 },
    ],
  },
  {
    id: 7,
    question: '您目前的负债情况（月还款占月收入比）？',
    options: [
      { label: '超过50%，压力较大', score: 0 },
      { label: '30%-50%，有一定压力', score: 3 },
      { label: '10%-30%，压力可控', score: 7 },
      { label: '10%以下或没有负债', score: 10 },
    ],
  },
  {
    id: 8,
    question: '您有多少个月的应急备用金？',
    options: [
      { label: '不到1个月', score: 0 },
      { label: '1-3个月', score: 3 },
      { label: '3-6个月', score: 6 },
      { label: '6个月以上', score: 10 },
    ],
  },
  {
    id: 9,
    question: '您对以下哪种投资品类的了解最多？',
    options: [
      { label: '银行存款/理财产品', score: 0 },
      { label: '基金/债券', score: 4 },
      { label: '股票', score: 8 },
      { label: '期货/期权/加密货币等衍生品', score: 10 },
    ],
  },
  {
    id: 10,
    question: '您的家庭主要收入来源人数是？',
    options: [
      { label: '1人（单一经济支柱）', score: 0 },
      { label: '2人，但一方占主导', score: 4 },
      { label: '2人，收入大致相当', score: 8 },
      { label: '3人及以上', score: 10 },
    ],
  },
]
export const RISK_QUESTIONS: RiskQuestion[] = RISK_QUESTIONS_ZH

export const RISK_QUESTIONS_EN: RiskQuestion[] = [
  {
    id: 1,
    question: 'How old are you?',
    options: [
      { label: 'Over 55', score: 0 },
      { label: '45-55', score: 3 },
      { label: '35-45', score: 6 },
      { label: '25-35', score: 10 },
      { label: 'Under 25', score: 12 },
    ],
  },
  {
    id: 2,
    question: 'How stable is your household income?',
    options: [
      { label: 'Very unstable (freelance / early-stage startup)', score: 0 },
      { label: 'Fairly stable (corporate job in a volatile industry)', score: 4 },
      { label: 'Very stable (civil service / SOE)', score: 10 },
      { label: 'Very stable with expected growth', score: 12 },
    ],
  },
  {
    id: 3,
    question: 'What is your investment experience?',
    options: [
      { label: 'Almost none — deposits and wealth products only', score: 0 },
      { label: 'Some fund investing experience', score: 4 },
      { label: 'Invested in stocks/funds and understand volatility', score: 8 },
      { label: 'Extensive, across multiple asset types', score: 12 },
    ],
  },
  {
    id: 4,
    question: 'What is your investment goal?',
    options: [
      { label: 'Capital preservation; just beat inflation', score: 0 },
      { label: 'Steady growth; tolerate small swings', score: 5 },
      { label: 'Higher returns; tolerate some drawdown', score: 10 },
      { label: 'High returns; tolerate large drawdowns', score: 12 },
    ],
  },
  {
    id: 5,
    question: 'If your portfolio fell 20% in a year, you would...',
    options: [
      { label: 'Panic and sell everything', score: 0 },
      { label: 'Get worried and consider trimming', score: 4 },
      { label: 'Accept it and keep holding', score: 8 },
      { label: 'See it as a buying opportunity', score: 12 },
    ],
  },
  {
    id: 6,
    question: 'What is your investment horizon?',
    options: [
      { label: 'Under 1 year — may need the money anytime', score: 0 },
      { label: '1-3 years', score: 4 },
      { label: '3-5 years', score: 8 },
      { label: '5+ years, long-term investing', score: 12 },
    ],
  },
  {
    id: 7,
    question: 'Your debt level (monthly payments / monthly income)?',
    options: [
      { label: 'Over 50% — heavy burden', score: 0 },
      { label: '30-50% — some pressure', score: 3 },
      { label: '10-30% — manageable', score: 7 },
      { label: 'Under 10% or none', score: 10 },
    ],
  },
  {
    id: 8,
    question: 'How many months of emergency reserve do you have?',
    options: [
      { label: 'Under 1 month', score: 0 },
      { label: '1-3 months', score: 3 },
      { label: '3-6 months', score: 6 },
      { label: 'Over 6 months', score: 10 },
    ],
  },
  {
    id: 9,
    question: 'Which asset type do you know best?',
    options: [
      { label: 'Bank deposits / wealth products', score: 0 },
      { label: 'Funds / bonds', score: 4 },
      { label: 'Stocks', score: 8 },
      { label: 'Futures / options / crypto', score: 10 },
    ],
  },
  {
    id: 10,
    question: 'How many income earners does your household have?',
    options: [
      { label: '1 (single breadwinner)', score: 0 },
      { label: '2, one dominant', score: 4 },
      { label: '2, roughly equal', score: 8 },
      { label: '3 or more', score: 10 },
    ],
  },
]

export function getRiskQuestions(locale: Locale): RiskQuestion[] {
  return locale === 'en' ? RISK_QUESTIONS_EN : RISK_QUESTIONS_ZH
}



// Maximum possible score from the questionnaire
export const MAX_RISK_SCORE = RISK_QUESTIONS_ZH.reduce(
  (max, q) => max + Math.max(...q.options.map(o => o.score)),
  0
) // = 112

// Convert raw score to 0-100 scale
export function normalizeRiskScore(rawScore: number): number {
  return Math.round((rawScore / MAX_RISK_SCORE) * 100)
}

// Risk profile labels (bilingual)
const RISK_PROFILES = {
  conservative: {
    zh: { level: '保守型', description: '以资产保值为首要目标，适合低风险配置' },
    en: { level: 'Conservative', description: 'Capital preservation first; suited to low-risk allocations' },
  },
  moderate: {
    zh: { level: '稳健型', description: '在风险可控前提下追求适度增值' },
    en: { level: 'Moderate', description: 'Moderate growth within a controlled risk envelope' },
  },
  aggressive: {
    zh: { level: '进取型', description: '愿意承受较高风险以换取更高收益' },
    en: { level: 'Aggressive', description: 'Willing to take higher risk for higher returns' },
  },
} as const

export function getRiskProfile(score: number, locale: Locale = 'zh'): { level: string; description: string } {
  const key: 'conservative' | 'moderate' | 'aggressive' = getRiskProfileKey(score)
  return locale === 'en' ? { ...RISK_PROFILES[key].en } : { ...RISK_PROFILES[key].zh }
}

// Risk profile key for engine thresholds
export function getRiskProfileKey(score: number): 'conservative' | 'moderate' | 'aggressive' {
  if (score <= 30) return 'conservative'
  if (score <= 60) return 'moderate'
  return 'aggressive'
}
