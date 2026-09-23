"use client"

import Link from "next/link"
import { ShieldXIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { useAuth } from "@/features/auth/auth-provider"
import type { PermissionCode } from "@/types"

export function Forbidden() {
  return (
    <Empty className="min-h-[60vh]">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ShieldXIcon />
        </EmptyMedia>
        <EmptyTitle>没有访问权限</EmptyTitle>
        <EmptyDescription>当前账号的角色未包含此页面所需权限。如需开通，请联系系统管理员。</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" asChild>
          <Link href="/dashboard">返回工作台</Link>
        </Button>
      </EmptyContent>
    </Empty>
  )
}

export function RequirePermission({
  anyOf,
  children,
}: {
  anyOf: PermissionCode | PermissionCode[]
  children: React.ReactNode
}) {
  const { can } = useAuth()
  return can(anyOf) ? children : <Forbidden />
}

/** 按权限隐藏界面元素（按钮、菜单项等） */
export function Can({
  anyOf,
  children,
}: {
  anyOf: PermissionCode | PermissionCode[]
  children: React.ReactNode
}) {
  const { can } = useAuth()
  return can(anyOf) ? children : null
}
