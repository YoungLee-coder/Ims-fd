"use client"

import { useEffect } from "react"
import { CloudOffIcon } from "lucide-react"

import { AppHeader } from "@/components/shell/app-header"
import { AppSidebar } from "@/components/shell/app-sidebar"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { useT } from "@/lib/i18n/client"
import { errorMessage, leaveToLogin } from "@/lib/api/client"
import { getToken } from "@/lib/api/session"
import { AuthProvider, useCurrentUserQuery } from "@/features/auth/auth-provider"

export function AppShell({ children }: { children: React.ReactNode }) {
  const t = useT()
  const hasToken = getToken() !== null
  const me = useCurrentUserQuery(hasToken)

  useEffect(() => {
    if (getToken()) return
    leaveToLogin("staff")
  }, [])

  if (me.isPending) {
    return (
      <div className="flex min-h-svh" aria-busy="true" aria-label={t("正在加载")}>
        <div className="hidden w-64 flex-col gap-3 bg-sidebar p-4 md:flex">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="mt-6 h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-3/4" />
        </div>
        <div className="flex flex-1 flex-col gap-4 p-6">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  if (me.isError) {
    return (
      <Empty className="min-h-svh">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CloudOffIcon />
          </EmptyMedia>
          <EmptyTitle>{t("无法连接服务器")}</EmptyTitle>
          <EmptyDescription>{errorMessage(me.error)}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={() => me.refetch()}>{t("重试")}</Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <AuthProvider user={me.data}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <AppHeader />
          <main id="main-content" className="flex flex-1 flex-col px-4 py-6 md:px-8 md:py-8">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </AuthProvider>
  )
}
