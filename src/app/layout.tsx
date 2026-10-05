import type { Metadata } from "next"
import { JetBrains_Mono, Public_Sans } from "next/font/google"

import { Providers } from "@/components/providers"
import { appConfig } from "@/lib/config"
import { getLocale, getT } from "@/lib/i18n/server"
import "./globals.css"

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin", "latin-ext"],
})

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
})

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  const systemName = t(appConfig.systemName)
  const agencyName = t(appConfig.agencyName)
  return {
    title: {
      default: `${systemName} · ${agencyName}`,
      template: `%s · ${systemName}`,
    },
    description: t("{agency}内部业务系统，仅限授权工作人员使用。", { agency: agencyName }),
    robots: { index: false, follow: false },
  }
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale()
  const t = await getT()
  return (
    <html lang={locale} className={`${publicSans.variable} ${jetbrainsMono.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:shadow"
        >
          {t("跳到主要内容")}
        </a>
        <Providers locale={locale}>{children}</Providers>
      </body>
    </html>
  )
}
