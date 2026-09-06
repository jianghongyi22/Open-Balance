# Open-Balance · 家庭资产配置诊断工具

> 输入家庭资产一次，获得一份量化的**财务体检报告**：17 项检查、A-D 综合评级、按紧急度排序的行动清单，以及应对市场冲击的情景模拟。
>
> 教育性质工具，不销售任何产品。**不构成投资建议。**

[![CI](https://github.com/jianghongyi22/Open-Balance/actions/workflows/ci.yml/badge.svg)](https://github.com/jianghongyi22/Open-Balance/actions/workflows/ci.yml)
[![Deploy Pages](https://github.com/jianghongyi22/Open-Balance/actions/workflows/deploy.yml/badge.svg)](https://github.com/jianghongyi22/Open-Balance/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Prototype](https://img.shields.io/badge/status-prototype-orange)](#项目状态)

## 为什么做这个

中国家庭财富普遍失衡：房地产占比 60-70%（央行《中国城镇居民家庭资产负债调查》）、大量资金躺在存款和理财里跑输通胀、资产分散在多家银行/券商/App 无从审视全局。专业的资产配置建议只服务于银行私行客户，普通家庭面对的是产品推销，不是规划。

Open-Balance 做的不是交易平台，而是**体检**：用公认的理财框架量化诊断家庭配置的健康度，告诉用户哪里有问题、该做什么。

## 核心特性

### 🔍 双重诊断引擎（17 项检查）

**定性层 · 经典理财框架（8 项）**

| 检查 | 框架依据 | 证据等级 |
|------|----------|----------|
| [标准普尔四象限](src/engine/checks/check01-spQuadrant.ts) | 要花的钱/保命的钱/生钱的钱/保本升值的钱 | 经验法则 |
| [生命周期适配度](src/engine/checks/check02-lifecycle.ts) | 110−年龄 法则 | 研究依据 |
| [应急备用金](src/engine/checks/check03-emergency.ts) | 3-6 个月刚性支出 | 研究依据 |
| [家庭保障充分性](src/engine/checks/check04-insurance.ts) | 寿险 5×年收入、重疾 30 万 | 研究依据 |
| [负债压力](src/engine/checks/check05-debt.ts) | 月供收入比 ≤40%、总负债率 ≤40% | 监管标准 |
| [4321 法则](src/engine/checks/check06-rule4321.ts) | 收入分配 40/30/20/10 | 经验法则 |
| [风险偏好匹配](src/engine/checks/check07-riskMatch.ts) | 测评结果 vs 组合实际风险（适当性检查） | 监管标准 |
| [养老储备测算](src/engine/checks/check08-retirement.ts) | DCF 折现现金流模型（三档情景，扣除社保） | 研究依据 |

**定量层 · 量化风险指标（9 项）**

| 检查 | 指标 | 证据等级 |
|------|------|----------|
| [集中度风险](src/engine/checks/check09-concentration.ts) | HHI、房地产占比、单只持仓占比 | 研究依据 |
| [流动性风险](src/engine/checks/check10-liquidity.ts) | 高流动性资产占比 | 研究依据 |
| [汇率风险](src/engine/checks/check11-fxRisk.ts) | 非人民币敞口 | 研究依据 |
| [信用与久期风险](src/engine/checks/check12-creditDuration.ts) | 到期日精确匹配、单一发行方集中度 | 研究依据 |
| [组合风险指标](src/engine/checks/check13-portfolioRisk.ts) | 波动率、VaR(95%)、夏普比率、最大回撤 | 研究依据 |
| [相关性分析](src/engine/checks/check14-correlation.ts) | 高相关大仓位的虚假分散化 | 研究依据 |
| [资金效率](src/engine/checks/check15-cashDrag.ts) | 现金拖累 | 研究依据 |
| [被动现金流覆盖](src/engine/checks/check16-cashFlow.ts) | 被动收入/月度刚性支出 | 研究依据 |
| [教育金储备](src/engine/checks/check17-education.ts) | 教育目标现值 vs 已定向教育金资产 | 研究依据 |

**评分机制**：加权评分（0-100）+ A-D 评级；**证据分级**（经验法则类检查只能提示不能否决，且降权）；**一票警告**（应急金/保障/负债/风险匹配任一未通过，评级封顶 C）；**定性×定量交叉验证**（同一维度两套结论差超一档自动降级）。

**退休测算（Q8）**：折现现金流模型——退休需求按通胀增长、按长期回报折现；社保/企业年金从需求中扣除（档案可填写，未填按收入 30% 估算）；自住房剔除出退休资产；输出悲观/中性/乐观三档区间。

**数据口径**：固收集中度按**发行方**（`issuer` 字段）而非持有机构计算；期限错配按到期日与诊断基准日精确比较。

### 📊 情景分析实验室

预设 6 种冲击（股灾、房价下跌、加息、汇率波动、收入中断、股房双杀）+ 自定义滑块，即时重跑诊断引擎，前后评分与逐项变化瀑布图。

### 📥 多格式账单导入

| 格式 | 来源 |
|------|------|
| 微信支付账单 | 微信 → 钱包 → 账单导出 (CSV) |
| 支付宝账单 | 支付宝 → 账单导出 (CSV/XLS) |
| 随手记 | 随手记 → 导出数据 (CSV/XLS) |
| 银行流水 | 招商/工商等网银导出 (CSV/XLS) |
| 通用 CSV/Excel | 任意资产清单，自动列名映射 |
| Open-Balance 备份 | 本工具导出 (JSON，含负债与家庭档案) |

自动识别格式 → 交易聚合为资产（余额宝/零钱通/理财通等已知机构自动归类）→ 预览确认后导入。数据模型预留 `heldAt`/`accountRef` 字段，为 Phase 3 对接券商/银行 API 做准备。

### 🔒 隐私设计

**零后端**：所有数据存储在浏览器 localStorage，账单文件仅在前端解析，不上传任何服务器。建议定期使用内置 JSON 导出备份。

## 快速开始

```bash
# 环境要求：Node.js ≥ 20（vite 8 要求）
git clone https://github.com/jianghongyi22/Open-Balance.git
cd Open-Balance
npm install

npm run dev      # 开发模式 → http://localhost:5173
npm run build    # 类型检查 + 生产构建 → dist/
npm run preview  # 本地预览生产构建
npm test         # 运行全部测试（82 个用例）
```

不想录入数据？引导页提供**「载入示例数据体验」**，一键载入一个二线城市中年家庭的完整资产配置（含房贷、股票、保险、存款）。

## 技术栈

| 层 | 选型 |
|----|------|
| 框架 | React 18 + TypeScript + Vite |
| UI | Ant Design 5 |
| 图表 | ECharts |
| 状态 | Zustand（localStorage 持久化） |
| 表格解析 | exceljs + 自实现 CSV 解析（UTF-8/GBK 自适应） |
| 测试 | Vitest 5（引擎 47 + 导入 35 用例） |

架构核心：诊断引擎是快照的**纯函数** `diagnose(snapshot) → DiagnosticReport`。17 项检查各一个模块（`src/engine/checks/`），全部阈值集中在 `src/data/thresholds.ts` 单源管理，市场参数（收益/波动/相关性矩阵）在 `src/data/marketParams.ts`——换数据不换逻辑。

```
src/
├── types/       # 数据模型（8 大类资产、负债、家庭档案、诊断报告）
├── store/       # Zustand 状态 + 持久化
├── data/        # 阈值、市场参数、风险问卷、示例数据
├── engine/      # 指标计算 → 17 项检查 → 加权聚合 → 建议生成
├── importer/    # 格式检测 → 6 种解析器 → 交易转资产
├── scenario/    # 情景冲击模拟
└── pages/       # 引导、总览、台账、报告、建议、情景分析、数据管理
```

贡献指南见 [CONTRIBUTING.md](CONTRIBUTING.md)，数据模型文档见 [docs/data-model.md](docs/data-model.md)。

## 测试

```bash
npm test
```

- `tests/engine.test.ts` — 诊断引擎：评分、评级、一票警告、临界检查、指标计算
- `tests/importer.test.ts` — 六种导入格式的完整用例（`test-data/` 目录存放样本文件）
- 兜底路径：空文件、无法识别的表格

## 项目状态

**Prototype / Proof-of-Concept**。当前为纯前端原型，规划中的后续阶段：

- **Phase 2**：后端（账户、多设备同步、净值历史）、真实市场数据回测、PDF 报告
- **Phase 3**：券商/银行/基金平台 API 适配层、主动预警、微信小程序

⚠️ 已知限制：组合风险指标基于静态市场参数估算（教育参考）；手动录入有漂移风险；账单流水推定余额为近似值（无期初余额），自动聚合的资产带「自动识别」标记。

## 免责声明

本工具仅用于家庭财务教育与自我诊断，输出结果**不构成**投资建议、税务建议或法律建议。市场参数为教育性假设，不代表对未来表现的预测。投资有风险，决策请咨询持牌专业顾问。

## License

[MIT](LICENSE) © 2026 Jiang Hongyi
