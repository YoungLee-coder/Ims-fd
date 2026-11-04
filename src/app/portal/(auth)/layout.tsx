import Link from "next/link"

import { AgencyMark } from "@/components/brand"
import { PageTransition } from "@/components/page-transition"
import { Card, CardContent } from "@/components/ui/card"
import { LocaleSwitcher } from "@/components/locale-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
import { appConfig } from "@/lib/config"
import { getT } from "@/lib/i18n/server"

export default async function PortalAuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getT()
  return (
    <div className="flex min-h-svh flex-col bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/portal/login"
            className="flex items-center gap-3 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <AgencyMark className="text-primary" />
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-sm font-semibold">{t(appConfig.agencyName)}</span>
              <span className="truncate text-[0.7rem] text-muted-foreground">{t("申请人服务门户")}</span>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main id="main-content" className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <Card className="w-full max-w-lg has-data-[layout=wide]:max-w-4xl md:has-data-[layout=wide]:[--card-spacing:--spacing(7)]">
          <CardContent className="pt-2">
            <PageTransition>{children}</PageTransition>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
