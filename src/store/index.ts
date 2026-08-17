// ============================================================
// Open-Balance: Zustand Store
// Central state with localStorage persistence.
// ============================================================

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
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
      version: 1,
    }
  )
)
