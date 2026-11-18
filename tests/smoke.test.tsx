// @vitest-environment jsdom
// ============================================================
// Issue #25: UI 冒烟测试
// 关键用户路径：引导 → 示例数据 → 总览/报告 → 数据导入弹窗 → 语言切换
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HashRouter } from 'react-router-dom'
import { ConfigProvider, App as AntApp } from 'antd'
import { Buffer } from 'buffer'
import { I18nProvider } from '../src/i18n'
import App from '../src/App'
import { useStore } from '../src/store'

// --- jsdom 环境补丁 ---
// antd Grid.useBreakpoint 需要 matchMedia
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}
// antd Tabs/Table 组件使用 ResizeObserver
if (!globalThis.ResizeObserver) {
  ;(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
// exceljs 需要 Buffer（main.tsx 同款 polyfill）
;(globalThis as unknown as { Buffer?: unknown }).Buffer =
  (globalThis as unknown as { Buffer?: unknown }).Buffer ?? Buffer

// ECharts 需要 canvas，jsdom 无实现 → 渲染占位
vi.mock('echarts-for-react', () => ({
  default: () => null,
}))

function renderApp() {
  return render(
    <I18nProvider>
      <ConfigProvider>
        <AntApp>
          <HashRouter>
            <App />
          </HashRouter>
        </AntApp>
      </ConfigProvider>
    </I18nProvider>
  )
}

function resetStore() {
  useStore.setState({
    assets: [],
    liabilities: [],
    profile: null,
    onboardingComplete: false,
    onboardingStep: 0,
    snapshots: [],
    completedRecommendations: [],
    lastVisitAt: null,
  })
}

describe('UI 冒烟测试 (Issue #25)', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStore()
    window.location.hash = ''
  })

  afterEach(() => {
    cleanup()
  })

  it('引导页 → 载入示例数据 → 总览出现净资产与关键指标', async () => {
    const user = userEvent.setup()
    renderApp()

    // 引导页第一步
    expect(screen.getByText('第一步：家庭基本信息')).toBeTruthy()
    expect(screen.getByText('载入示例数据体验')).toBeTruthy()

    // 一键载入示例数据 → 总览
    await user.click(screen.getByText('载入示例数据体验'))

    expect(await screen.findByText('净资产')).toBeTruthy()
    expect(screen.getByText('应急备用金')).toBeTruthy()
    expect(screen.getByText('月供收入比')).toBeTruthy()
    expect(screen.getByText('需要关注')).toBeTruthy()
  })

  it('示例数据 → 诊断报告页可渲染 17 项检查清单', async () => {
    useStore.getState().loadSampleData()
    window.location.hash = '#/report'
    renderApp()

    // 检查卡片标题形如 "Q1 标准普尔四象限"，用正则匹配
    expect(await screen.findByText(/标准普尔四象限/)).toBeTruthy()
    expect(screen.getAllByText(/应急备用金/).length).toBeGreaterThan(0)
    expect(screen.getByText(/集中度风险/)).toBeTruthy()
    expect(screen.getAllByText(/教育金储备/).length).toBeGreaterThan(0)
  })

  it('数据管理 → 导入弹窗打开并显示拖拽区', async () => {
    const user = userEvent.setup()
    useStore.getState().loadSampleData()
    window.location.hash = '#/data'
    renderApp()

    await user.click(await screen.findByText('选择文件导入'))
    expect(await screen.findByText('点击或拖拽文件到这里')).toBeTruthy()
    expect(screen.getByText('选择文件')).toBeTruthy()
  })

  it('页头语言切换：中文 → English', async () => {
    const user = userEvent.setup()
    useStore.getState().loadSampleData()
    renderApp()

    await user.click(await screen.findByText('EN'))
    expect(await screen.findByText('Net Worth')).toBeTruthy()
    expect(screen.getByText(/Total Assets/)).toBeTruthy()
  })
})
