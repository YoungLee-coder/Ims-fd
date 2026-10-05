export const LOCALES = ["zh-CN", "zh-TW", "en", "ja", "ko", "fr", "de", "es", "ru"] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = "zh-CN"
export const LOCALE_COOKIE = "ims_locale"

export const LOCALE_LABELS: Record<Locale, string> = {
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  en: "English",
  ja: "日本語",
  ko: "한국어",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
  ru: "Русский",
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
    if (tag === "zh-tw" || tag === "zh-hk" || tag === "zh-hant" || tag.startsWith("zh-hant")) return "zh-TW"
    if (tag.startsWith("zh")) return "zh-CN"
    if (tag.startsWith("ja")) return "ja"
    if (tag.startsWith("ko")) return "ko"
    if (tag.startsWith("fr")) return "fr"
    if (tag.startsWith("de")) return "de"
    if (tag.startsWith("es")) return "es"
    if (tag.startsWith("ru")) return "ru"
    if (tag.startsWith("en")) return "en"
  }
  return DEFAULT_LOCALE
}
