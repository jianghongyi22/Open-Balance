// ============================================================
// Open-Balance: Zustand Store
// Central state with localStorage persistence.
// 带版本迁移（migrate）与损坏恢复（损坏数据备份后重置）。
// ============================================================

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import type {
  Asset,
  AssetCategory,
  Liability,
  LiabilityType,
  HouseholdProfile,
  IncomeStability,
  ScenarioShocks,
} from '../types'
import {
  SAMPLE_ASSETS,
  SAMPLE_LIABILITIES,
  SAMPLE_PROFILE,
} from '../data/sampleData'

// --- Store Shape ---

export interface AppStore {
  // Data
  assets: Asset[]
  liabilities: Liability[]
  profile: HouseholdProfile | null

  // Onboarding state
  onboardingComplete: boolean
  onboardingStep: number

  // Scenario Lab
  activeShocks: ScenarioShocks
  setActiveShocks: (shocks: ScenarioShocks) => void

  // Actions: Assets
  addAsset: (asset: Omit<Asset, 'id'>) => void
  updateAsset: (id: string, updates: Partial<Asset>) => void
  removeAsset: (id: string) => void
  loadSampleData: () => void
  importAssets: (assets: Asset[]) => void

  // Actions: Liabilities
  addLiability: (liability: Omit<Liability, 'id'>) => void
  updateLiability: (id: string, updates: Partial<Liability>) => void
  removeLiability: (id: string) => void
  importLiabilities: (liabilities: Liability[]) => void

  // Actions: Profile
  setProfile: (profile: HouseholdProfile) => void
  updateProfile: (updates: Partial<HouseholdProfile>) => void

  // Actions: Onboarding
  setOnboardingStep: (step: number) => void
  completeOnboarding: () => void

  // Actions: Data
  clearAllData: () => void
  exportData: () => { assets: Asset[]; liabilities: Liability[]; profile: HouseholdProfile | null }
}

// --- Default shocks ---
const DEFAULT_SHOCKS: ScenarioShocks = {
  stockMarketPct: -10,
  propertyMarketPct: -5,
  interestRateBps: 0,
  fxRatePct: 0,
  incomeInterruptionMonths: 0,
}

// --- Store ---

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Initial state
      assets: [],
      liabilities: [],
      profile: null,
      onboardingComplete: false,
      onboardingStep: 0,
      activeShocks: DEFAULT_SHOCKS,

      setActiveShocks: (shocks) => set({ activeShocks: shocks }),

      // --- Assets ---
      addAsset: (asset) =>
        set((state) => ({
          assets: [...state.assets, { ...asset, id: uuidv4() }],
        })),

      updateAsset: (id, updates) =>
        set((state) => ({
          assets: state.assets.map((a) =>
            a.id === id ? { ...a, ...updates } : a
          ),
        })),

      removeAsset: (id) =>
        set((state) => ({
          assets: state.assets.filter((a) => a.id !== id),
        })),

      loadSampleData: () =>
        set({
          assets: SAMPLE_ASSETS,
          liabilities: SAMPLE_LIABILITIES,
          profile: SAMPLE_PROFILE,
          onboardingComplete: true,
          onboardingStep: 3,
        }),

      importAssets: (assets) =>
        set((state) => ({
          assets: [...state.assets, ...assets],
        })),

      // --- Liabilities ---
      addLiability: (liability) =>
        set((state) => ({
          liabilities: [...state.liabilities, { ...liability, id: uuidv4() }],
        })),

      updateLiability: (id, updates) =>
        set((state) => ({
          liabilities: state.liabilities.map((l) =>
            l.id === id ? { ...l, ...updates } : l
          ),
        })),

      removeLiability: (id) =>
        set((state) => ({
          liabilities: state.liabilities.filter((l) => l.id !== id),
        })),

      importLiabilities: (liabilities) =>
        set((state) => ({
          liabilities: [...state.liabilities, ...liabilities],
        })),

      // --- Profile ---
      setProfile: (profile) =>
        set({ profile, onboardingStep: Math.max(get().onboardingStep, 1) }),

      updateProfile: (updates) =>
        set((state) => ({
          profile: state.profile ? { ...state.profile, ...updates } : null,
        })),

      // --- Onboarding ---
      setOnboardingStep: (step) => set({ onboardingStep: step }),

      completeOnboarding: () =>
        set({ onboardingComplete: true, onboardingStep: 3 }),

      // --- Data ---
      clearAllData: () =>
        set({
          assets: [],
          liabilities: [],
          profile: null,
          onboardingComplete: false,
          onboardingStep: 0,
          activeShocks: DEFAULT_SHOCKS,
        }),

      exportData: () => {
        const state = get()
        return {
          assets: state.assets,
          liabilities: state.liabilities,
          profile: state.profile,
        }
      },
    }),
    {
      name: 'open-balance-store',
      version: 2,
      // 版本迁移链：未来数据模型变更在此逐级升级
      migrate: (persistedState: unknown) => {
        // v1 → v2：暂无字段变更，透传
        return persistedState as AppStore
      },
      storage: createJSONStorage(() => ({
        getItem: (name: string) => {
          const raw = localStorage.getItem(name)
          if (raw === null) return null
          try {
            JSON.parse(raw) // 校验完整性
            return raw
          } catch {
            // 损坏数据：备份后重置，避免静默损坏
            try {
              localStorage.setItem(
                `${name}-corrupted-${Date.now()}`,
                raw
              )
            } catch {
              // 备份失败也不阻塞启动
            }
            localStorage.removeItem(name)
            setStorageRecovered()
            return null
          }
        },
        setItem: (name: string, value: string) =>
          localStorage.setItem(name, value),
        removeItem: (name: string) => localStorage.removeItem(name),
      })),
    }
  )
)

// --- 损坏恢复标志（Data 页用于提示用户） ---

let recoveredFlag = false

function setStorageRecovered() {
  recoveredFlag = true
}

/** 本次会话是否发生过本地存储损坏恢复（会话级只读标志，不重置） */
export function wasStorageRecovered(): boolean {
  return recoveredFlag
}
