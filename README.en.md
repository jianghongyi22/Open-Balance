# Open-Balance · Household Asset Allocation Diagnostics

> Enter your household assets once, and get a quantified **financial health check**: 17 checks, an A-D overall grade, a priority-ranked action list, and scenario simulations for market shocks.
>
> An educational tool. It sells nothing. **Not investment advice.**

[中文文档](README.md) · [![CI](https://github.com/jianghongyi22/Open-Balance/actions/workflows/ci.yml/badge.svg)](https://github.com/jianghongyi22/Open-Balance/actions/workflows/ci.yml)
[![Deploy Pages](https://github.com/jianghongyi22/Open-Balance/actions/workflows/deploy.yml/badge.svg)](https://github.com/jianghongyi22/Open-Balance/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Prototype](https://img.shields.io/badge/status-prototype-orange)](#project-status)

The UI is fully bilingual (中文 / English) — switch languages from the header button.

## Why

Chinese household wealth is systematically lopsided: 60-70% in real estate (PBoC Urban Household Survey), large balances sitting in deposits and wealth products losing to inflation, and assets scattered across banks, brokers and apps with no single view. Professional allocation advice serves private-banking clients; ordinary families get product salesmanship, not planning.

Open-Balance is a **health check, not a trading platform**: it quantifies your household allocation against recognized frameworks and tells you what is wrong and what to do about it.

## Core Features

### 🔍 Dual-layer diagnostic engine (17 checks)

**Qualitative · classic financial frameworks (8 checks)**

| Check | Framework | Evidence |
|-------|-----------|----------|
| [S&P Family Quadrants](src/engine/checks/check01-spQuadrant.ts) | spending / protection / growth / stability buckets | heuristic |
| [Lifecycle Fit](src/engine/checks/check02-lifecycle.ts) | 110−age rule | research |
| [Emergency Fund](src/engine/checks/check03-emergency.ts) | 3-6 months of essential spending | research |
| [Insurance Adequacy](src/engine/checks/check04-insurance.ts) | life 5× income, CI ¥300k | research |
| [Debt Stress Test](src/engine/checks/check05-debt.ts) | DTI ≤40%, leverage ≤40% | regulatory |
| [4-3-2-1 Income Split](src/engine/checks/check06-rule4321.ts) | 40/30/20/10 income split | heuristic |
| [Risk Profile Match](src/engine/checks/check07-riskMatch.ts) | assessment vs. actual portfolio risk | regulatory |
| [Retirement Readiness](src/engine/checks/check08-retirement.ts) | DCF, three scenarios, social security deducted | research |

**Quantitative · risk metrics (9 checks)**

| Check | Metric | Evidence |
|-------|--------|----------|
| [Concentration](src/engine/checks/check09-concentration.ts) | HHI, real-estate share, single-position share | research |
| [Liquidity](src/engine/checks/check10-liquidity.ts) | liquid-asset share | research |
| [FX Risk](src/engine/checks/check11-fxRisk.ts) | non-CNY exposure | research |
| [Credit & Duration](src/engine/checks/check12-creditDuration.ts) | exact maturity matching, issuer concentration | research |
| [Portfolio Metrics](src/engine/checks/check13-portfolioRisk.ts) | volatility, VaR(95%), Sharpe, drawdown | research |
| [Correlation](src/engine/checks/check14-correlation.ts) | false diversification among large positions | research |
| [Capital Efficiency](src/engine/checks/check15-cashDrag.ts) | cash drag | research |
| [Passive Cash Flow](src/engine/checks/check16-cashFlow.ts) | passive income / essential spending | research |
| [Education Fund](src/engine/checks/check17-education.ts) | goal PV vs. earmarked assets | research |

**Scoring**: weighted 0-100 score + A-D grade; **evidence tiers** (heuristics can warn but never fail, and carry lower weights); **critical-check cap** (failing emergency/insurance/debt/risk-match caps the grade at C); **qualitative × quantitative cross-validation** (conclusions more than one notch apart are downgraded).

**Retirement (Q8)**: discounted-cash-flow model — needs grow with inflation and discount at a long-term return; social security / annuity is deducted (or defaults to 30% of income); the primary residence is excluded; outputs pessimistic/neutral/optimistic ranges.

**Data conventions**: fixed-income concentration uses the **issuer** (`issuer` field), not the holding institution; maturity matching compares due dates against a reference date exactly. Market parameters come from published 2015-2024 statistics (sources documented in [marketParams.ts](src/data/marketParams.ts); recompute with [backtest-market-params.mjs](scripts/backtest-market-params.mjs)).

### 📊 Scenario Lab

Six presets (stocks -20%, property -10%, rates +100bp, CNY +5%, 6-month income gap, stocks & property crash) plus custom sliders, with instant re-diagnosis and a per-check waterfall.

### 📥 Multi-format bill import

| Format | Source |
|--------|--------|
| WeChat Pay bills | WeChat → Wallet → Bills → Export (CSV) |
| Alipay bills | Alipay → My → Bills → Export (CSV/XLS) |
| Suishouji | Suishouji → More → Export Data (CSV/XLS) |
| Bank statements | CMB/ICBC etc. online banking (CSV/XLS) |
| Generic CSV/Excel | any asset list, auto column mapping (editable) |
| Open-Balance backup | native export (JSON, incl. liabilities & profile) |

Auto-detect → aggregate transactions into assets (known institutions like Yu'ebao / WeChat Money are classified automatically) → preview & confirm. The data model reserves `heldAt`/`accountRef` for Phase-3 broker/bank API integrations.

### 🔒 Privacy

**Zero backend**: everything lives in browser localStorage, bill files are parsed locally and never uploaded. Regular JSON export is recommended. See the in-app Privacy page.

## Quick Start

```bash
# Requires Node.js ≥ 20 (vite 8)
git clone https://github.com/jianghongyi22/Open-Balance.git
cd Open-Balance
npm install

npm run dev      # dev server → http://localhost:5173
npm run build    # typecheck + production build → dist/
npm run preview  # preview the production build
npm test         # run all tests (93 cases)
```

Don't want to type data? The onboarding offers **"Load sample data"** — a realistic mid-life family in a tier-2 city (mortgage, stocks, insurance, deposits).

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | React 18 + TypeScript + Vite |
| UI | Ant Design 5 (bilingual zh-CN / en-US) |
| Charts | ECharts |
| State | Zustand (localStorage persistence, versioned migration) |
| Spreadsheets | exceljs + custom RFC4180 CSV parser (UTF-8/GBK) |
| Tests | Vitest 5 (engine 50 + importer 37 + store 6) |

The engine is a pure function of the snapshot: `diagnose(snapshot) → DiagnosticReport`. Each of the 17 checks is one module under `src/engine/checks/`, all thresholds live in `src/data/thresholds.ts`, and i18n dictionaries live in `src/i18n/` (any new user-facing text must be added in both zh and en).

```
src/
├── types/       # data model (8 asset classes, liabilities, profile, report)
├── store/       # Zustand state + persistence (versioned migration)
├── data/        # thresholds, market params, risk questionnaire, sample data
├── engine/      # metrics → 17 checks → weighted aggregation → recommendations
├── importer/    # format detection → 6 parsers → transactions-to-assets
├── scenario/    # shock simulation
├── i18n/        # zh/en dictionaries and label maps
└── pages/       # onboarding, dashboard, assets, report, recommendations, scenario lab, data, privacy
```

## Testing

```bash
npm test
```

- `tests/engine.test.ts` — engine: scoring, grades, critical-cap, evidence tiers, boundaries
- `tests/importer.test.ts` — six import formats with fixtures under `test-data/`
- `tests/store.test.ts` — snapshot history and persistence migration (jsdom)

Contributing guide: [CONTRIBUTING.md](CONTRIBUTING.md) · Data model: [docs/data-model.md](docs/data-model.md) · Calibration: [docs/calibration.md](docs/calibration.md)

## Project Status

**Prototype / Proof-of-Concept**. Planned next phases:

- **Phase 2**: backend (accounts, multi-device sync, net-worth history), real-market backtesting, PDF reports
- **Phase 3**: broker/bank/fund API adapters, proactive alerts, WeChat mini-program

⚠️ Known limits: portfolio metrics rest on static class-level parameter estimates (educational); manual entry drifts; bill-derived balances are approximations without an opening balance — auto-aggregated assets are flagged as such.

## Disclaimer

This tool is for household financial education and self-diagnosis only. Its output is **not** investment, tax or legal advice. Market parameters are educational assumptions, not predictions of future performance. Investing involves risk — consult a licensed professional before making decisions.

## License

[MIT](LICENSE) © 2026 Jiang Hongyi
