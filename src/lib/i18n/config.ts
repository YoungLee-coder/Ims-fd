export const LOCALES = ["zh-CN", "en"] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = "zh-CN"
export const LOCALE_COOKIE = "ims_locale"

export const LOCALE_LABELS: Record<Locale, string> = {
  "zh-CN": "简体中文",
  en: "English",
}

export function isLocale(value: string | null | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value)
}

/** 根据 Accept-Language 头挑选语言，匹配不到时使用默认语言。 */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE
  const tags = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=")
      return { tag: tag.toLowerCase(), q: q ? Number(q) : 1 }
    })
    .sort((a, b) => b.q - a.q)
  for (const { tag } of tags) {
    if (tag.startsWith("zh")) return "zh-CN"
    if (tag.startsWith("en")) return "en"
  }
  return DEFAULT_LOCALE
}
