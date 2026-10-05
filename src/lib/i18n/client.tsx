"use client"

import { createContext, useCallback, useContext, useMemo } from "react"
import { useRouter } from "next/navigation"

import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/config"
import { createT, type TFunction } from "@/lib/i18n/translate"

type LocaleContextValue = { locale: Locale; t: TFunction }

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const value = useMemo(() => ({ locale, t: createT(locale) }), [locale])
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

function useLocaleContext() {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error("useT / useLocale 必须在 LocaleProvider 内使用")
  return ctx
}

export function useT(): TFunction {
  return useLocaleContext().t
}

export function useLocale(): Locale {
  return useLocaleContext().locale
}

export function useSetLocale() {
  const router = useRouter()
  return useCallback(
    (next: Locale) => {
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`
      router.refresh()
    },
    [router]
  )
}
