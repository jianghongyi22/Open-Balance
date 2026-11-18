// ============================================================
// Open-Balance: 资产市值时效（Issue #24）
//
// 资产的 marketValue 是某个时点的手动快照；距今天数越久，
// 越可能偏离真实市值。按阈值分三档提示。
// ============================================================

import { STALE_VALUE_WARN_DAYS, STALE_VALUE_CRITICAL_DAYS } from '../data/thresholds'
import { daysBetween, todayISO } from './dates'

export type StalenessLevel = 'fresh' | 'warn' | 'critical'

export interface Staleness {
  /** 距今天数；无 valueDate 记录时为 null */
  days: number | null
  level: StalenessLevel | null
}

/**
 * 计算资产市值数据的时效。
 * @param valueDate 资产最近一次估值日期（ISO，可选）
 * @param nowISO 参考时间（默认今天，测试可注入）
 */
export function assetStaleness(valueDate: string | undefined, nowISO: string = todayISO()): Staleness {
  if (!valueDate) return { days: null, level: null }
  const days = daysBetween(valueDate, nowISO)
  if (days >= STALE_VALUE_CRITICAL_DAYS) return { days, level: 'critical' }
  if (days >= STALE_VALUE_WARN_DAYS) return { days, level: 'warn' }
  return { days, level: 'fresh' }
}
