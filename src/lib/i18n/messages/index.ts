import type { Locale } from "@/lib/i18n/config"
import { de } from "@/lib/i18n/messages/de"
import { en } from "@/lib/i18n/messages/en"
import { es } from "@/lib/i18n/messages/es"
import { fr } from "@/lib/i18n/messages/fr"
import { ja } from "@/lib/i18n/messages/ja"
import { ko } from "@/lib/i18n/messages/ko"
import { ru } from "@/lib/i18n/messages/ru"
import { zhTW } from "@/lib/i18n/messages/zh-TW"

/** 除 zh-CN 外，界面文案均以简体中文原文为 key。 */
export type MessageLocale = Exclude<Locale, "zh-CN">

export const MESSAGES: Record<MessageLocale, Record<string, string>> = {
  en,
  "zh-TW": zhTW,
  ja,
  ko,
  fr,
  de,
  es,
  ru,
}
