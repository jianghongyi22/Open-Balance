# 贡献指南

感谢你对 Open-Balance 的关注！这是一个家庭资产配置诊断工具的原型项目，欢迎通过 Issue 讨论、Bug 修复和功能 PR 参与。

## 本地运行

```bash
# 环境要求：Node.js ≥ 20（vite 8 要求）
git clone https://github.com/jianghongyi22/Open-Balance.git
cd Open-Balance
npm install
npm run dev        # 开发模式 → http://localhost:5173
```

引导页可点「载入示例数据体验」快速体验全流程。

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发服务器 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm test` | 运行全部测试（引擎 + 导入） |
| `npm run build` | 类型检查 + 生产构建 |
| `npm run preview` | 预览生产构建 |

## 代码结构

```
src/
├── types/       # 数据模型（见 docs/data-model.md）
├── data/        # 阈值、市场参数、风险问卷、示例数据（单一事实来源）
├── engine/      # 诊断引擎：metrics → checks/（17项）→ aggregate → recommendations
├── importer/    # 多格式导入：spreadsheet 抽象层 → 6 种解析器 → 交易转资产
├── scenario/    # 情景冲击模拟
├── store/       # Zustand 状态 + localStorage 持久化
└── pages/       # 7 个页面 + components/
```

**核心设计约束**：

1. 诊断引擎是快照的**纯函数** `diagnose(snapshot) → DiagnosticReport`。
   日期类逻辑（如 Q12 期限错配）必须通过 `referenceDate` 参数注入，禁止直接调 `Date.now()`（否则测试随时间漂移）。
2. 所有阈值集中在 `src/data/thresholds.ts`，市场参数在 `src/data/marketParams.ts`——换数据不换逻辑。
3. 导入解析器只依赖统一的行结构 `workbook.sheets[].rows`（见 `src/importer/spreadsheet.ts`），不要直接依赖具体表格库。
4. 新增检查项时需同时：注册 `ALL_CHECKS`、加权重、标注 `evidenceLevel`、补建议模板、补测试。

## 提交流程

1. Fork 仓库并创建分支：`git checkout -b fix/xxx` 或 `feat/xxx`
2. 实现时同步更新/新增测试（`npm test` 必须全绿）
3. 提交信息遵循 Conventional Commits（中文说明亦可）：
   - `fix(engine): ...` / `feat(importer): ...` / `docs: ...`
4. 关联 Issue：提交信息或 PR 描述中写 `Closes #N`（合入默认分支后自动关闭）
5. 推送分支并发起 Pull Request

CI（GitHub Actions）会在每个 PR 上运行 typecheck + test + build，全部通过后才能合并。

## 测试约定

- 引擎测试在 `tests/engine.test.ts`：构造快照 → 断言检查结果
- 导入测试在 `tests/importer.test.ts` + `test-data/` 样本文件：新格式必须提供 fixture 与预期解析结果（见 `test-data/README.md`）
- 涉及日期比较的用例必须注入固定 `referenceDate`

## 合规提醒

本项目为**教育性质**工具：输出不构成投资建议。所有面向用户的诊断结论页面需保留免责声明（`src/components/DisclaimerBanner.tsx`）。
