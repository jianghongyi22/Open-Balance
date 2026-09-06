# 数据模型

本文档描述 Open-Balance 的核心数据模型（对应 [src/types/index.ts](../src/types/index.ts)），供贡献者与 API 对接方参考。

## 资产 Asset

8 大类资产，全品类覆盖：

| 大类 `category` | 子类 `subCategory` | 典型流动性 | 风险 |
|-----------------|-------------------|-----------|------|
| `cash_deposit` 现金及存款 | 活期存款 / 定期存款 / 大额存单 / 货币基金 | 高 | 低 |
| `fixed_income` 固收理财 | 银行理财 / 国债/政金债 / 企业债/城投债 / 债券基金 | 中-高 | 低-中 |
| `equity` 权益类 | A股股票 / 港股 / 美股 / 指数/ETF基金 / 主动权益基金 | 高 | 高 |
| `real_estate` 房地产 | 自住房 / 投资房 / 商铺/写字楼 | 低 | 中-高 |
| `insurance` 保险 | 重疾险 / 医疗险 / 定期寿险 / 意外险（保障型）；年金险 / 增额终身寿（储蓄型） | 低 | 低 |
| `precious_metals_alternative` 贵金属及另类 | 黄金 / 加密货币 / 大宗商品 | 中 | 中-高 |
| `forex` 外汇 | 外币现金/存款 / 外汇理财 | 中 | 中 |
| `other` 其他 | 借出款项 / 股权/期权 / 收藏品 / 其他 | 低 | 中 |

### 字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string (uuid) | ✓ | 唯一标识 |
| `name` | string | ✓ | 资产名称 |
| `category` | AssetCategory | ✓ | 8 大类之一 |
| `subCategory` | string | | 子类（见上表） |
| `marketValue` | number | ✓ | 当前市值（统一折为人民币） |
| `originalCost` | number | | 原始成本，用于收益估算 |
| `currency` | Currency | ✓ | CNY / USD / HKD / EUR / JPY / CNY-equivalent-other |
| `fxRate` | number | | 对人民币汇率（外币资产） |
| `liquidity` | 'high'\|'medium'\|'low' | ✓ | 流动性 |
| `riskLevel` | 'low'\|'medium'\|'high' | ✓ | 风险等级 |
| `annualIncome` | number | | 年被动收入（租金/分红/利息/年金）→ 供 Q16 |
| `expectedReturnPct` | number | | 预期年化收益率（%），缺省用大类默认值 |
| `heldAt` | string | | **持有机构**（银行/券商），Phase 3 API 对接键 |
| `issuer` | string | | **发行方/产品管理人**（区别于持有机构）→ 供 Q12 固收集中度 |
| `accountRef` | string | | 账户标识，Phase 3 API 对接键 |
| `purchaseDate` / `maturityDate` / `lockUpUntil` | string | | 日期 → 供 Q12 期限错配（与诊断基准日精确比较） |
| `isPrimaryResidence` | boolean | | 自住房标记 → Q8 退休测算剔除 |
| `insuranceCoverage` / `insuranceAnnualPremium` | number | | 保额/年保费（保险类）→ 供 Q4 |
| `monthlyContribution` | number | | 月定投额 |
| `notes` | string | | 备注 |

> **口径说明**：固收集中度（Q12）按 `issuer` 计算，**不按** `heldAt` —— 同一银行代销的不同发行方理财是不同信用主体。未标注 `issuer` 的固收资产不参与集中度分子，但 Q12 会以"覆盖率"形式提示数据缺口。

## 负债 Liability

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | ✓ | |
| `name` | string | ✓ | 如"自住房按揭贷款" |
| `type` | '房贷'\|'车贷'\|'消费贷'\|'经营贷'\|'其他' | ✓ | |
| `remainingPrincipal` | number | ✓ | 剩余本金 |
| `annualRatePct` | number | ✓ | 年利率（%） |
| `monthlyPayment` | number | ✓ | 月供 → 供 Q5 DTI |
| `remainingMonths` | number | ✓ | 剩余期数 |
| `collateralAssetId` | string | | 关联抵押资产（房产） |
| `notes` | string | | |

## 家庭档案 HouseholdProfile

| 字段 | 类型 | 说明 |
|------|------|------|
| `memberAges` | number[] | 全部成年成员年龄 |
| `breadwinnerAge` | number | **经济支柱年龄**（Q2 生命周期检查用）；未填时取 60 岁以下成员最大年龄 |
| `dependentCount` / `dependentAges` | number / number[] | 抚养对象（子女/老人）→ 供 Q17 |
| `annualIncome` | number | 家庭年收入（税后） |
| `monthlyEssentialExpense` | number | 月度刚性支出 → 供 Q3/Q12/Q16 |
| `incomeStability` | 'stable'\|'variable'\|'self-employed-risky' | 收入稳定性 |
| `riskToleranceScore` | 0-100 | 风险测评得分（10 题问卷归一化）→ 供 Q7/Q13 |
| `monthlySocialPension` | number | 预计退休后社保/年金月领额 → Q8；未填按年收入 30% 估算 |
| `retirementAge` | number | 默认 60 |
| `goals.retirementReplacementRate` | number | 退休收入替代率，默认 0.7 |
| `goals.educationFundYears` | number | 距子女入学年数，默认按 18−子女年龄 |
| `goals.educationTier` | 'domestic'\|'overseas' | 教育目标档位（国内/海外本科）→ 供 Q17 |

## 诊断结果

- **CheckResult**：`id`（Q1-Q17）、`evidenceLevel`（heuristic/research/regulatory）、`status`（pass/warn/fail）、`severity`、`score`（0-100）、`measuredValue`、`threshold`、`detail`、`rangeValue`（区间估计，如退休测算悲观~乐观）
- **DiagnosticReport**：`overallScore`、`grade`（A-D）、`qualitativeScore`/`quantitativeScore`、`checks[17]`、`criticalFlag`（一票警告）、`crossValidationOverrides`

## 评分机制

- 加权总分 = Σ(权重×单项分)/Σ权重；单项 pass=100 / warn=50 / fail=0
- **证据分级**：经验法则类检查（Q1/Q6）只能提示不能否决（fail 自动降 warn）且降权
- **一票警告**：Q3/Q4/Q5/Q7 任一 fail → 评级封顶 C
- **定性×定量交叉验证**：配对检查（Q1-Q9、Q2-Q13、Q3-Q10、Q4-Q16、Q6-Q15）结论差超一档时降为警告
