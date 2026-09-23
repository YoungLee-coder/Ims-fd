"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronsUpDownIcon, FilePlusIcon, LogOutIcon } from "lucide-react"

import { AgencyMark } from "@/components/brand"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { appConfig } from "@/lib/config"
import { initials } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { ApplicantAccount } from "@/types"

export function PortalLink({
  href,
  children,
  className,
}: {
  href: string
  children: React.ReactNode
  className?: string
}) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(`${href}/`)
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        active && "bg-muted text-foreground",
        className
      )}
    >
      {children}
    </Link>
  )
}

export function PortalHeader({
  account,
  onLogout,
}: {
  account: ApplicantAccount | null
  onLogout?: () => Promise<void>
}) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/portal/applications"
          className="flex items-center gap-3 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <AgencyMark className="text-primary" />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-semibold">{appConfig.agencyName}</span>
            <span className="truncate text-[0.7rem] text-muted-foreground">申请人服务门户</span>
          </span>
        </Link>

        {account && (
          <nav aria-label="门户导航" className="ml-2 hidden items-center gap-1 sm:flex">
            <PortalLink href="/portal/applications">我的申请</PortalLink>
          </nav>
        )}

        <div className="ml-auto flex items-center gap-2">
          {account ? (
            <>
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link href="/portal/applications/new">
                  <FilePlusIcon data-icon="inline-start" />
                  新建申请
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Avatar className="size-6 rounded-full">
                      <AvatarFallback className="bg-primary text-[0.65rem] text-primary-foreground">
                        {initials(account.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="max-w-32 truncate">{account.fullName}</span>
                    <ChevronsUpDownIcon className="size-3.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel className="flex flex-col gap-0.5 font-normal">
                    <span className="text-sm font-medium text-foreground">{account.fullName}</span>
                    <span className="truncate text-xs text-muted-foreground">{account.email}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => void onLogout?.()}>
                    <LogOutIcon />
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link href="/portal/login">登录</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}

export function PortalFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>本门户仅供申请人本人办理出入境与居留业务，请如实填写并上传真实材料。</p>
        <p className="shrink-0">
          工作人员请
          <Link href="/login" className="ml-1 font-medium text-primary underline-offset-4 hover:underline">
            从内部系统登录
          </Link>
        </p>
      </div>
    </footer>
  )
}
