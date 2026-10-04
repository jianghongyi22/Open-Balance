// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { useStore, migratePersistedState } from '../src/store'
import type { NetWorthSnapshot } from '../src/types'

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
