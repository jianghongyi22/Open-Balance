// ============================================================
// Open-Balance: Recommendation Engine
//
// Maps failing/warning checks to actionable recommendations
// grouped by urgency.
// ============================================================

import type { CheckResult, Recommendation } from '../types'

// Map of check ID → recommendation templates
const RECOMMENDATION_MAP: Record<string, Omit<Recommendation, 'id' | 'checkRef'>> = {
  Q1: {
    title: '调整四大账户配置比例',
    description: '当前标准普尔四象限配置比例偏离目标区间，建议调整各类资产的分配。',
    urgency: 'this_month',
    effort: '1-2小时',
    expectedEffect: '改善账户结构，各账户职责更清晰',
    steps: [
      '计算当前四大象限各占多少',
      '对比标准普尔建议比例（10%/20%/30%/40%）',
      '制定调整计划，逐步将偏离的账户拉回目标区间',
    ],
  },
  Q2: {
    title: '调整权益仓位匹配年龄阶段',
    description: '当前成长类资产比例与生命周期的建议值存在偏差。',
    urgency: 'this_quarter',
    effort: '1-2小时',
    expectedEffect: '风险水平与人生阶段匹配，退休前不过度冒险或保守',
    steps: [
      '确认家庭最大年龄成员的年龄',
      '计算目标权益仓位 = (110 - 年龄)%',
      '通过增减基金定投或赎回逐步调整',
    ],
  },
  Q3: {
    title: '建立应急备用金',
    description: '当前应急储备不足，无法应对突发失业或大额支出。',
    urgency: 'immediate',
    effort: '视缺口而定',
    expectedEffect: '获得3-6个月的财务安全垫，降低意外冲击风险',
    steps: [
      '计算3-6个月刚性支出的总额',
      '每月从收入中预留固定比例存入货币基金',
      '优先使用年终奖等一次性收入加速补充',
      '应急金存入独立账户，不与其他资金混用',
    ],
  },
  Q4: {
    title: '补足家庭保障缺口',
    description: '当前保险保障存在缺口，家庭面临风险敞口。',
    urgency: 'immediate',
    effort: '需咨询保险顾问',
    expectedEffect: '消除家庭重大风险敞口，避免因病/意外返贫',
    steps: [
      '优先补充家庭经济支柱的定期寿险（保额≥5倍年收入）',
      '检查重疾险保额是否达到30-50万',
      '确认全家有百万医疗险覆盖',
      '保费总支出控制在年收入10-20%',
    ],
  },
  Q5: {
    title: '优化负债结构，降低月供压力',
    description: '当前负债率或月供收入比超出安全线。',
    urgency: 'this_month',
    effort: '半天',
    expectedEffect: '降低月供压力，释放现金流用于储蓄和投资',
    steps: [
      '计算当前DTI（月供/月收入）和总负债率',
      '考虑提前偿还高息贷款（消费贷>车贷>房贷）',
      '评估是否有转按揭/置换低息贷款的可能',
      '制定3-5年去杠杆计划',
    ],
  },
  Q6: {
    title: '按照4321法则优化支出结构',
    description: '当前家庭收入分配偏离4321法则。',
    urgency: 'this_quarter',
    effort: '1小时',
    expectedEffect: '收入分配更科学，避免消费过度挤占储蓄投资',
    steps: [
      '记录一个月家庭支出明细',
      '按生活40%/投资30%/储蓄20%/保险10%对照',
      '找出超标项并制定削减计划',
    ],
  },
  Q7: {
    title: '调整投资组合匹配风险偏好',
    description: '当前组合的风险水平与您的风险测评结果不匹配。',
    urgency: 'this_month',
    effort: '1-2小时',
    expectedEffect: '风险和收益预期与个人承受能力一致，避免因恐慌而错误操作',
    steps: [
      '重新审视风险测评结果',
      '如组合风险过高，减仓高波动产品转投稳健品种',
      '如组合风险过低，适度增加权益配置以提升长期收益',
    ],
  },
  Q8: {
    title: '加大养老储蓄力度',
    description: '当前养老储备不足以支持退休后的生活水平。',
    urgency: 'this_quarter',
    effort: '视缺口而定',
    expectedEffect: '确保退休后维持目标生活水平',
    steps: [
      '测算退休所需总金额（年支出×退休年限）',
      '充分利用个人养老金账户的税收优惠',
      '增加养老目标基金或年金险的定期投入',
    ],
  },
  Q9: {
    title: '分散资产降低集中度风险',
    description: '当前资产过度集中于某一类别或单只产品。',
    urgency: 'this_month',
    effort: '1-3小时',
    expectedEffect: '降低单一资产暴跌对家庭财富的冲击',
    steps: [
      '识别集中度最高的资产类别或单品',
      '制定分批减持计划（避免一次性抛售的市场冲击）',
      '将释放的资金分散配置到低相关性的资产类别',
      '房地产占比过高的家庭可考虑不新增房产投资',
    ],
  },
  Q10: {
    title: '提升资产流动性',
    description: '当前高流动性资产占比偏低，紧急情况下面临变现困难。',
    urgency: 'this_month',
    effort: '1-2小时',
    expectedEffect: '确保紧急情况下有足够的现金缓冲',
    steps: [
      '盘点所有资产的变现周期',
      '将部分到期理财/存款转为货币基金或短期理财',
      '避免新增房产等低流动性大额投资',
    ],
  },
  Q11: {
    title: '管理汇率风险敞口',
    description: '当前非人民币资产占比较高，面临汇率波动风险。',
    urgency: 'this_quarter',
    effort: '1小时',
    expectedEffect: '降低汇率波动对资产的冲击',
    steps: [
      '评估外币资产的真实需求（留学/海外置业等）',
      '非必需的外币敞口可适度结汇',
      '通过多币种分散降低单一币种风险',
    ],
  },
  Q12: {
    title: '优化固收产品的期限和发行方分布',
    description: '固收类产品存在期限错配或发行方集中风险。',
    urgency: 'this_quarter',
    effort: '1-2小时',
    expectedEffect: '确保到期资金衔接顺畅，降低单一机构违约风险',
    steps: [
      '建立固收产品到期时间表',
      '确保每季度都有到期资金覆盖日常支出',
      '单一银行/平台的理财产品不超过固收总规模的50%',
    ],
  },
  Q13: {
    title: '优化组合风险收益特征',
    description: '当前组合的风险指标（波动率/VaR/Sharpe/回撤）偏离健康区间。',
    urgency: 'this_month',
    effort: '2-3小时',
    expectedEffect: '在可接受的风险水平下获得更好的收益',
    steps: [
      '如波动率过高：增加债券/货币基金比例',
      '如夏普比率过低：检查是否有大量低效资产',
      '如最大回撤过大：降低权益类集中度',
    ],
  },
  Q14: {
    title: '打破虚假分散化',
    description: '持仓中存在高度正相关的大类资产对，表面分散实则同涨同跌。',
    urgency: 'this_quarter',
    effort: '1-2小时',
    expectedEffect: '实现真正的风险分散，降低组合整体波动',
    steps: [
      '识别相关性>0.8的资产对',
      '减持其中一类，增配低相关性的资产（如黄金、债券）',
      '中国家庭特别注意：房产+权益同时重仓的回撤共振风险',
    ],
  },
  Q15: {
    title: '减少闲置资金，提升资金效率',
    description: '活期存款等低效资金占比过高，长期跑输通胀。',
    urgency: 'this_month',
    effort: '10分钟',
    expectedEffect: '提升整体收益率，跑赢通胀',
    steps: [
      '将超过应急金部分的活期资金转入货币基金',
      '设置工资到账自动转入货基',
      '大额闲置考虑短期理财或大额存单',
    ],
  },
  Q16: {
    title: '培养被动收入来源',
    description: '当前被动现金流覆盖不足，高度依赖主动劳动收入。',
    urgency: 'this_quarter',
    effort: '长期规划',
    expectedEffect: '逐步建立财务独立性，降低对工资收入的依赖',
    steps: [
      '评估当前可产生现金流的资产（收租房、分红基金、年金等）',
      '逐步增配能产生持续现金流的资产',
      '关注股息率较高的红利类ETF或REITs产品',
    ],
  },
  Q17: {
    title: '建立教育金储备计划',
    description: '当前教育金储备不足，难以覆盖子女高等教育目标。',
    urgency: 'this_month',
    effort: '1-2小时',
    expectedEffect: '子女教育资金有保障，避免未来临时举债',
    steps: [
      '确认教育目标档位（国内/海外本科）与距入学年数',
      '测算目标金额现值与当前缺口',
      '选择储蓄型保险或教育定投计划，按月定额投入',
      '教育金单独账户管理，不与其他资金混用',
    ],
  },
}

// --- Generate recommendations from check results ---

export function generateRecommendations(checks: CheckResult[]): Recommendation[] {
  const recs: Recommendation[] = []
  let counter = 0

  // Only generate for warn/fail checks
  for (const check of checks) {
    if (check.status === 'pass') continue

    const template = RECOMMENDATION_MAP[check.id]
    if (!template) continue

    counter++
    recs.push({
      ...template,
      id: `R-${check.id}`,
      checkRef: check.id,
    })
  }

  // Sort by urgency
  const urgencyOrder = { immediate: 0, this_month: 1, this_quarter: 2 }
  recs.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency])

  return recs
}
