// ============================================================
// Open-Balance: 检查项文案辅助
//
// 每项检查在各自文件内维护 zh/en 双语文案，通过 pick() 按
// EngineContext.locale 选择。默认 zh（保持引擎测试兼容）。
// ============================================================

import type { Locale } from './types'

export function pickLocale(
  locale: Locale | undefined
): Locale {
  return locale === 'en' ? 'en' : 'zh'
}

/** 从 zh/en 字典中按 locale 取值 */
export function pick<T>(locale: Locale | undefined, zh: T, en: T): T {
  return locale === 'en' ? en : zh
}
