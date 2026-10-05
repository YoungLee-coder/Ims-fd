import { en } from "@/lib/i18n/messages/en"
import type { Locale } from "@/lib/i18n/config"

export type TranslateVars = Record<string, string | number>
export type TFunction = (key: string, vars?: TranslateVars) => string

/**
 * 以中文原文作为 key（gettext 风格）：中文界面直接返回原文，其他语言查词典，
 * 词典缺失时回退为原文，不会让页面出现空白。
 */
export function translate(locale: Locale, key: string, vars?: TranslateVars): string {
  const template = locale === "en" ? (en[key] ?? key) : key
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match
  )
}

export function createT(locale: Locale): TFunction {
  return (key, vars) => translate(locale, key, vars)
}
