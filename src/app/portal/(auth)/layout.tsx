import Link from "next/link"

import { AgencyMark } from "@/components/brand"
import { PortalFooter } from "@/components/portal/portal-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { appConfig } from "@/lib/config"

export default function PortalAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/portal/login"
            className="flex items-center gap-3 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <AgencyMark className="text-primary" />
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-sm font-semibold">{appConfig.agencyName}</span>
              <span className="truncate text-[0.7rem] text-muted-foreground">申请人服务门户</span>
            </span>
          </Link>
          <Button asChild variant="ghost" size="sm" className="ml-auto">
            <Link href="/login">工作人员登录</Link>
          </Button>
        </div>
      </header>

      <main id="main-content" className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <Card className="w-full max-w-lg">
          <CardContent className="pt-2">{children}</CardContent>
        </Card>
      </main>

      <PortalFooter />
    </div>
  )
}
