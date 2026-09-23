import type { Metadata } from "next"
import { JetBrains_Mono, Public_Sans } from "next/font/google"

import { Providers } from "@/components/providers"
import { appConfig } from "@/lib/config"
import "./globals.css"

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin", "latin-ext"],
})

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: {
    default: `${appConfig.systemName} · ${appConfig.agencyName}`,
    template: `%s · ${appConfig.systemName}`,
  },
  description: `${appConfig.agencyName}内部业务系统，仅限授权工作人员使用。`,
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className={`${publicSans.variable} ${jetbrainsMono.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:shadow"
        >
          跳到主要内容
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
