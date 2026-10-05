import type { Locale } from "@/lib/i18n/config"
import { MESSAGES } from "@/lib/i18n/messages"

export type TranslateVars = Record<string, string | number>
export type TFunction = (key: string, vars?: TranslateVars) => string

/**
 * 以中文原文作为 key（gettext 风格）：简体中文直接返回原文，其他语言查词典；
 * 缺失时先回退英文，再回退原文，避免页面出现空白。
 */
export function translate(locale: Locale, key: string, vars?: TranslateVars): string {
  const template =
    locale === "zh-CN" ? key : (MESSAGES[locale][key] ?? MESSAGES.en[key] ?? key)
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match
  )
}

export function createT(locale: Locale): TFunction {
  return (key, vars) => translate(locale, key, vars)
}
