// ============================================================
// Open-Balance Importer: Open-Balance JSON Parser
// ============================================================

import type { ImportResult, FormatParser } from '../types'
import type { Asset, Liability, HouseholdProfile } from '../../types'

/** Liabilities & profile extracted from an Open-Balance backup.
 *  Assets flow through the normal preview; these are applied at import. */
export interface OpenBalanceExtras {
  liabilities: Liability[]
  profile: HouseholdProfile | null
}

export const openBalanceJsonParser: FormatParser = {
  format: 'open-balance-json',

  parseWorkbook(_workbook: any, _fileName: string): ImportResult | null {
    return null // JSON doesn't come through xlsx
  },

  parseText(text: string, _fileName: string): ImportResult | null {
    try {
      const data = JSON.parse(text)

      // Must have at least assets or profile
      if (!data.assets && !data.profile) return null

      const assets: Asset[] = Array.isArray(data.assets) ? data.assets : []
      const liabilities: Liability[] = Array.isArray(data.liabilities) ? data.liabilities : []
      const profile: HouseholdProfile | null = data.profile ?? null

      const extras: OpenBalanceExtras = { liabilities, profile }

      return {
        format: 'open-balance-json',
        assets,
        transactions: [],
        warnings: [],
        stats: {
          totalTransactions: assets.length,
          totalIncome: 0,
          totalExpense: 0,
          periodStart: null,
          periodEnd: null,
          detectedInstitutions: [...new Set(assets.map((a) => a.heldAt).filter(Boolean))] as string[],
        },
        // Custom payload so ImportModal can restore liabilities/profile
        extras,
      } as ImportResult & { extras: OpenBalanceExtras }
    } catch {
      return null
    }
  },
}
