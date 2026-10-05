import type { Locale } from "@/lib/i18n/config"
import { MESSAGES, type MessageLocale } from "@/lib/i18n/messages"

export type TranslateVars = Record<string, string | number>
export type TFunction = (key: string, vars?: TranslateVars) => string

function applyVars(template: string, vars?: TranslateVars): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match
  )
}

/** 当前语言是否存在该文案的译文（简体中文以原文为 key，视为始终存在）。 */
export function hasMessage(locale: Locale, key: string): boolean {
  return locale === "zh-CN" || key in MESSAGES[locale as MessageLocale]
}

/**
 * 以简体中文原文为 key：各语言仅查本语言词典，不回退英文或简体原文。
 * 构建前运行 `pnpm i18n:check` 保证 UI 文案完整。
 */
export function translate(locale: Locale, key: string, vars?: TranslateVars): string {
  if (locale === "zh-CN") return applyVars(key, vars)
  const template = MESSAGES[locale as MessageLocale][key]
  if (template === undefined) {
    if (process.env.NODE_ENV !== "production") {
      console.error(`[i18n] missing translation (${locale}): ${key}`)
    }
    return ""
  }
  return applyVars(template, vars)
}

/**
 * 接口或第三方返回的短句：若为已知 key 则翻译；非中文界面遇到未收录的中文则展示通用本地化错误，避免混入简体。
 */
export function translateApiMessage(locale: Locale, message: string, vars?: TranslateVars): string {
  if (hasMessage(locale, message)) return translate(locale, message, vars)
  if (locale === "zh-CN") return applyVars(message, vars)
  if (/[一-鿿]/.test(message)) {
    return translate(locale, "发生未知错误，请稍后重试。", vars)
  }
  return applyVars(message, vars)
}

export function createT(locale: Locale): TFunction {
  return (key, vars) => translate(locale, key, vars)
}
