// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { useStore, migratePersistedState, daysBetween } from '../src/store'
import { assetStaleness } from '../src/utils/staleness'
import type { NetWorthSnapshot, Asset } from '../src/types'

// ============================================================
// Issue #14: 净值快照历史（store 层）
// ============================================================

function makeSnapshot(date: string, score: number, netWorth: number): Omit<NetWorthSnapshot, 'id'> {
  return {
    date,
    overallScore: score,
    grade: score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : 'D',
    gradeLabel: '',
    netWorth,
    totalAssets: netWorth + 100_000,
    totalLiabilities: 100_000,
    qualitativeScore: score,
    quantitativeScore: score,
  }
}

describe('净值快照历史 (Issue #14)', () => {
  beforeEach(() => {
    localStorage.clear()
    useStore.setState({ snapshots: [] })
  })

  it('同一天内重复保存应替换而非追加', () => {
    const { addSnapshot } = useStore.getState()
    addSnapshot(makeSnapshot('2026-10-04T09:00:00Z', 70, 1_000_000))
    addSnapshot(makeSnapshot('2026-10-04T12:00:00Z', 75, 1_050_000))
    const { snapshots } = useStore.getState()
    expect(snapshots).toHaveLength(1)
    expect(snapshots[0].overallScore).toBe(75) // 保留最新
  })

  it('跨天保存应追加且按日期排序', () => {
    const { addSnapshot } = useStore.getState()
    addSnapshot(makeSnapshot('2026-10-02T09:00:00Z', 70, 1_000_000))
    addSnapshot(makeSnapshot('2026-10-03T09:00:00Z', 72, 1_010_000))
    addSnapshot(makeSnapshot('2026-10-01T09:00:00Z', 68, 990_000))
    const { snapshots } = useStore.getState()
    expect(snapshots).toHaveLength(3)
    expect(snapshots[0].date.slice(0, 10)).toBe('2026-10-01')
    expect(snapshots[2].date.slice(0, 10)).toBe('2026-10-03')
  })

  it('超过 100 条时应淘汰最旧记录', () => {
    const { addSnapshot } = useStore.getState()
    for (let i = 0; i < 105; i++) {
      const date = new Date(Date.UTC(2026, 0, 1 + i)).toISOString()
      addSnapshot(makeSnapshot(date, 70, 1_000_000 + i))
    }
    const { snapshots } = useStore.getState()
    expect(snapshots).toHaveLength(100)
    // 105 条保留最新 100 条：最旧保留的是第 6 条（2026-01-06）
    expect(snapshots[0].date.slice(0, 10)).toBe('2026-01-06')
  })

  it('每条快照应有唯一 id', () => {
    const { addSnapshot } = useStore.getState()
    addSnapshot(makeSnapshot('2026-10-01T09:00:00Z', 70, 1_000_000))
    addSnapshot(makeSnapshot('2026-10-02T09:00:00Z', 72, 1_010_000))
    const { snapshots } = useStore.getState()
    const ids = new Set(snapshots.map((s) => s.id))
    expect(ids.size).toBe(2)
  })

  it('v2 → v3 迁移：旧数据无 snapshots 字段时应补空数组', () => {
    const migrated = migratePersistedState({ assets: [], liabilities: [], profile: null })
    expect(Array.isArray(migrated.snapshots)).toBe(true)
    expect(migrated.snapshots).toHaveLength(0)
  })

  it('v2 → v3 迁移：已有 snapshots 时应保留', () => {
    const existing = makeSnapshot('2026-10-01T09:00:00Z', 70, 1_000_000)
    const migrated = migratePersistedState({
      assets: [], liabilities: [], profile: null,
      snapshots: [{ ...existing, id: 's1' }],
    })
    expect(migrated.snapshots).toHaveLength(1)
    expect(migrated.snapshots[0].id).toBe('s1')
  })
})

// ============================================================
// Issue #23: 建议清单勾选状态持久化
// ============================================================

describe('建议勾选持久化 (Issue #23)', () => {
  beforeEach(() => {
    localStorage.clear()
    useStore.setState({ completedRecommendations: [] })
  })

  it('toggleRecommendation 应添加并保持勾选', () => {
    const { toggleRecommendation } = useStore.getState()
    toggleRecommendation('R-Q03')
    expect(useStore.getState().completedRecommendations).toContain('R-Q03')
  })

  it('重复 toggle 应取消勾选', () => {
    const { toggleRecommendation } = useStore.getState()
    toggleRecommendation('R-Q03')
    toggleRecommendation('R-Q03')
    expect(useStore.getState().completedRecommendations).not.toContain('R-Q03')
  })

  it('v4 → v5 迁移：旧数据无 completedRecommendations 字段时应补空数组', () => {
    const migrated = migratePersistedState({ assets: [], liabilities: [], profile: null })
    expect(Array.isArray(migrated.completedRecommendations)).toBe(true)
    expect(migrated.completedRecommendations).toHaveLength(0)
  })

  it('v4 → v5 迁移：已有勾选记录时应保留', () => {
    const migrated = migratePersistedState({
      assets: [], liabilities: [], profile: null,
      completedRecommendations: ['R-Q01', 'R-Q09'],
    })
    expect(migrated.completedRecommendations).toEqual(['R-Q01', 'R-Q09'])
  })
})

// ============================================================
// Issue #26: 定期重新评估提醒（lastVisitAt + daysBetween）
// ============================================================

describe('定期重新评估提醒 (Issue #26)', () => {
  beforeEach(() => {
    localStorage.clear()
    useStore.setState({ lastVisitAt: null })
  })

  it('setLastVisitAt 应记录访问时间', () => {
    useStore.getState().setLastVisitAt('2026-11-01T08:00:00Z')
    expect(useStore.getState().lastVisitAt).toBe('2026-11-01T08:00:00Z')
  })

  it('daysBetween 应计算相隔天数（向下取整）', () => {
    expect(daysBetween('2026-11-01T08:00:00Z', '2026-11-16T08:00:00Z')).toBe(15)
    expect(daysBetween('2026-11-01T23:00:00Z', '2026-11-02T01:00:00Z')).toBe(0)
  })

  it('daysBetween 对非法或倒序时间应返回 0', () => {
    expect(daysBetween('bad-date', '2026-11-16T08:00:00Z')).toBe(0)
    expect(daysBetween('2026-11-16T08:00:00Z', '2026-11-01T08:00:00Z')).toBe(0)
  })

  it('v4 → v5 迁移：旧数据无 lastVisitAt 字段时应补 null', () => {
    const migrated = migratePersistedState({ assets: [], liabilities: [], profile: null })
    expect(migrated.lastVisitAt).toBeNull()
  })

  it('v4 → v5 迁移：已有 lastVisitAt 时应保留', () => {
    const migrated = migratePersistedState({
      assets: [], liabilities: [], profile: null,
      lastVisitAt: '2026-10-01T08:00:00Z',
    })
    expect(migrated.lastVisitAt).toBe('2026-10-01T08:00:00Z')
  })
})

// ============================================================
// Issue #24: 资产市值过期提醒（valueDate + 时效分档）
// ============================================================

const baseAsset: Omit<Asset, 'id'> = {
  name: '测试存款',
  category: 'cash_deposit',
  marketValue: 10_000,
  currency: 'CNY',
  liquidity: 'high',
  riskLevel: 'low',
}

describe('资产市值时效 (Issue #24)', () => {
  const NOW = '2026-11-18'

  beforeEach(() => {
    localStorage.clear()
    useStore.setState({ assets: [], liabilities: [], profile: null })
  })

  it('assetStaleness 分档：30 天内 fresh，30-90 天 warn，90 天及以上 critical', () => {
    expect(assetStaleness('2026-11-18', NOW).level).toBe('fresh')
    expect(assetStaleness('2026-10-19', NOW)).toEqual({ days: 30, level: 'warn' })
    expect(assetStaleness('2026-08-20', NOW)).toEqual({ days: 90, level: 'critical' })
  })

  it('无 valueDate 记录时 level 为 null', () => {
    expect(assetStaleness(undefined, NOW)).toEqual({ days: null, level: null })
  })

  it('addAsset 应自动记录 valueDate', () => {
    useStore.getState().addAsset(baseAsset)
    const saved = useStore.getState().assets[0]
    expect(saved.valueDate).toBeTruthy()
  })

  it('updateAsset 应刷新 valueDate', () => {
    useStore.getState().addAsset({ ...baseAsset, valueDate: '2026-01-01' })
    const id = useStore.getState().assets[0].id
    useStore.getState().updateAsset(id, { marketValue: 20_000 })
    expect(useStore.getState().assets[0].valueDate).not.toBe('2026-01-01')
    expect(useStore.getState().assets[0].marketValue).toBe(20_000)
  })

  it('importAssets 应为无 valueDate 的导入资产补记录', () => {
    useStore.getState().importAssets([baseAsset])
    expect(useStore.getState().assets[0].valueDate).toBeTruthy()
  })

  it('loadSampleData 应为示例资产记录 valueDate', () => {
    useStore.getState().loadSampleData()
    const assets = useStore.getState().assets
    expect(assets.length).toBeGreaterThan(0)
    expect(assets.every((a) => a.valueDate)).toBe(true)
  })
})
