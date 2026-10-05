import { cookies, headers } from "next/headers"

import { isLocale, LOCALE_COOKIE, negotiateLocale, type Locale } from "@/lib/i18n/config"
import { createT } from "@/lib/i18n/translate"

export async function getLocale(): Promise<Locale> {
  const stored = (await cookies()).get(LOCALE_COOKIE)?.value
  if (isLocale(stored)) return stored
  return negotiateLocale((await headers()).get("accept-language"))
}

/** 服务端组件、generateMetadata 使用。 */
export async function getT() {
  return createT(await getLocale())
}
