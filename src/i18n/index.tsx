// ============================================================
// Open-Balance: i18n (zh-CN / en-US)
//
// 语言状态持久化在 localStorage（open-balance-locale），
// 默认中文。UI 侧用 useI18n()；引擎侧通过 EngineContext.locale。
// 新增文案时必须在 zh 与 en 两份字典中同步添加（见 memory:
// open-balance-bilingual）。
// ============================================================

import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { UI_ZH, UI_EN } from './dictionaries'
import { LABELS, LabelGroups } from './labels'
import type { Locale } from './types'

const LOCALE_STORAGE_KEY = 'open-balance-locale'

export interface I18n {
  locale: Locale
  setLocale: (l: Locale) => void
  /** UI 文案查询（缺键时回退中文，再回退键名） */
  t: (key: string, params?: Record<string, string | number>) => string
  /** 类型标签查询（类别/状态/等级等） */
  L: LabelGroups
}

const I18nContext = createContext<I18n | null>(null)

function readStoredLocale(): Locale {
  try {
    const v = localStorage.getItem(LOCALE_STORAGE_KEY)
    return v === 'en' ? 'en' : 'zh'
  } catch {
    return 'zh'
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale)

  const setLocale = (l: Locale) => {
    setLocaleState(l)
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, l)
    } catch {
      // 存储失败不阻塞
    }
  }

  // antd 组件 locale 同步
  useEffect(() => {
    document.documentElement.lang = locale === 'en' ? 'en' : 'zh-CN'
  }, [locale])

  const t = (key: string, params?: Record<string, string | number>): string => {
    let text = locale === 'en' ? UI_EN[key] : UI_ZH[key]
    if (text === undefined) text = UI_ZH[key]
    if (text === undefined) return key
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.split(`{${k}}`).join(String(v))
      }
    }
    return text
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, L: LABELS[locale] }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
