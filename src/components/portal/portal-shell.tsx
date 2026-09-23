"use client"

import { useEffect } from "react"
import { CloudOffIcon } from "lucide-react"

import { PortalFooter, PortalHeader } from "@/components/portal/portal-header"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { errorMessage, leaveToLogin } from "@/lib/api/client"
import { getPortalToken } from "@/lib/api/session"
import { PortalAuthProvider, usePortalAuth } from "@/features/portal/portal-auth-provider"
import { useCurrentAccountQuery } from "@/features/portal/api"

/**
 * 申请人门户外壳：加载当前门户账号后渲染页头与内容区。
 * 账号无效（401）时 client 层已整页跳转到门户登录页，这里只需处理加载与网络错误。
 */
export function PortalShell({ children }: { children: React.ReactNode }) {
  const hasToken = getPortalToken() !== null
  const me = useCurrentAccountQuery(hasToken)

  useEffect(() => {
    if (getPortalToken()) return
    leaveToLogin("portal")
  }, [])

  if (me.isPending) {
    return (
      <div className="flex min-h-svh flex-col bg-muted/30" aria-busy="true" aria-label="正在加载">
        <PortalHeader account={null} />
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 py-8 sm:px-6 lg:py-12">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    )
  }

  if (me.isError) {
    return (
      <div className="flex min-h-svh flex-col bg-muted/30">
        <PortalHeader account={null} />
        <Empty className="flex-1">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CloudOffIcon />
            </EmptyMedia>
            <EmptyTitle>无法连接服务器</EmptyTitle>
            <EmptyDescription>{errorMessage(me.error)}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => me.refetch()}>重试</Button>
          </EmptyContent>
        </Empty>
      </div>
    )
  }

  return (
    <PortalAuthProvider account={me.data}>
      <PortalFrame>{children}</PortalFrame>
    </PortalAuthProvider>
  )
}

function PortalFrame({ children }: { children: React.ReactNode }) {
  const { account, logout } = usePortalAuth()
  return (
    <div className="flex min-h-svh flex-col bg-muted/30">
      <PortalHeader account={account} onLogout={logout} />
      <main id="main-content" className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6 sm:px-6 lg:py-10">
        {children}
      </main>
      <PortalFooter />
    </div>
  )
}
