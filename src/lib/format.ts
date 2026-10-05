import { differenceInCalendarDays, format, formatDistanceToNowStrict, parseISO } from "date-fns"
import { de, enUS, es, fr, ja, ko, ru, zhCN, zhTW } from "date-fns/locale"

import { EXPIRY_WARNING_DAYS } from "@/lib/constants"
import type { Locale } from "@/lib/i18n/config"
import { MESSAGES } from "@/lib/i18n/messages"

const DATE_FNS_LOCALE: Record<Locale, typeof enUS> = {
  "zh-CN": zhCN,
  "zh-TW": zhTW,
  en: enUS,
  ja,
  ko,
  fr,
  de,
  es,
  ru,
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—"
  return format(parseISO(value), "yyyy-MM-dd")
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—"
  return format(parseISO(value), "yyyy-MM-dd HH:mm")
}

export function formatRelative(value: string | null | undefined, locale: Locale) {
  if (!value) {
    return locale === "zh-CN" ? "从未" : (MESSAGES[locale]["从未"] ?? MESSAGES.en["从未"] ?? "从未")
  }
  const date = parseISO(value)
  const dfLocale = DATE_FNS_LOCALE[locale]
  if (locale === "zh-CN" || locale === "zh-TW") {
    return `${formatDistanceToNowStrict(date, { locale: dfLocale })}前`
  }
  return formatDistanceToNowStrict(date, { locale: dfLocale, addSuffix: true })
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export type Validity = "valid" | "expiring" | "expired" | "permanent"

export function getValidity(expiryDate: string | null, today = new Date()): {
  state: Validity
  daysLeft: number | null
} {
  if (!expiryDate) return { state: "permanent", daysLeft: null }
  const daysLeft = differenceInCalendarDays(parseISO(expiryDate), today)
  if (daysLeft < 0) return { state: "expired", daysLeft }
  if (daysLeft <= EXPIRY_WARNING_DAYS) return { state: "expiring", daysLeft }
  return { state: "valid", daysLeft }
}

export function fullName(p: { surname: string; givenNames: string }) {
  return `${p.surname} ${p.givenNames}`.trim()
}

export function initials(name: string) {
  const trimmed = name.trim()
  if (/^[\u4e00-\u9fa5]/.test(trimmed)) return trimmed.slice(-2)
  return trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

/** 生成机读区（MRZ）首行样式文本，仅用于界面展示。 */
export function mrzLine(p: { surname: string; givenNames: string }, country: string) {
  const clean = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z ]/g, "")
      .trim()
      .replace(/\s+/g, "<")
  return `P<${country}${clean(p.surname)}<<${clean(p.givenNames)}`.padEnd(44, "<").slice(0, 44)
}
