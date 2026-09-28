"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import {
  ChevronsUpDownIcon,
  ClipboardListIcon,
  FilePlusIcon,
  FolderOpenIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  RotateCcwIcon,
  ScrollTextIcon,
  ShieldCheckIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"

import { AgencyLockup } from "@/components/brand"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { appConfig } from "@/lib/config"
import { initials } from "@/lib/format"
import { useAuth } from "@/features/auth/auth-provider"
import { useDashboardSummary } from "@/features/dashboard/api"
import { useReports } from "@/features/reports/api"
import type { PermissionCode } from "@/types"

interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  anyOf?: PermissionCode[]
  exact?: boolean
  badge?: "pendingAccounts" | "submittedApplications"
}

const NAV: { label: string; items: NavItem[] }[] = [
  {
    label: "概览",
    items: [{ title: "工作台", href: "/dashboard", icon: LayoutDashboardIcon }],
  },
  {
    label: "档案管理",
    items: [
      { title: "申请受理", href: "/applications", icon: ClipboardListIcon, anyOf: ["applicant.read"], badge: "submittedApplications" },
      { title: "申请人档案", href: "/applicants", icon: FolderOpenIcon, anyOf: ["applicant.read"] },
      { title: "新建档案", href: "/applicants/new", icon: FilePlusIcon, anyOf: ["applicant.create"], exact: true },
    ],
  },
  {
    label: "系统管理",
    items: [
      {
        title: "用户管理",
        href: "/admin/users",
        icon: UsersIcon,
        anyOf: ["user.read", "user.manage"],
        badge: "pendingAccounts",
      },
      { title: "角色与权限", href: "/admin/roles", icon: ShieldCheckIcon, anyOf: ["role.read", "role.manage"] },
      { title: "审计日志", href: "/admin/audit", icon: ScrollTextIcon, anyOf: ["user.read", "role.read"] },
    ],
  },
]

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href
  if (item.href === "/applicants") return pathname.startsWith("/applicants") && pathname !== "/applicants/new"
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

export function AppSidebar() {
  const pathname = usePathname()
  const { can } = useAuth()
  const summary = useDashboardSummary()
  const reports = useReports(can("applicant.read"))

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-4">
        <Link href="/dashboard" className="rounded-md text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <AgencyLockup compact className="group-data-[collapsible=icon]:[&>div]:hidden" />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {NAV.map((group) => {
          const items = group.items.filter((item) => !item.anyOf || can(item.anyOf))
          if (!items.length) return null
          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => {
                    const count =
                      item.badge === "pendingAccounts"
                        ? summary.data?.pendingAccounts
                        : item.badge === "submittedApplications"
                          ? reports.data?.byStatus.submitted
                          : undefined
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild isActive={isActive(pathname, item)} tooltip={item.title}>
                          <Link href={item.href}>
                            <item.icon />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                        {!!count && (
                          <SidebarMenuBadge
                            aria-label={item.badge === "submittedApplications" ? `${count} 份待受理申请` : `${count} 个待审核账号`}
                          >
                            {count}
                          </SidebarMenuBadge>
                        )}
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )
        })}
      </SidebarContent>

      <SidebarFooter>
        <UserMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function UserMenu() {
  const { user, logout } = useAuth()
  const queryClient = useQueryClient()
  const roleNames = user.roles.map((r) => r.name).join("、") || "未分配角色"

  async function resetDemoData() {
    const { resetMockDb } = await import("@/lib/api/mock/db")
    resetMockDb()
    await queryClient.invalidateQueries()
    toast.success("演示数据已恢复为初始状态")
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
              <Avatar className="size-8 rounded-md">
                <AvatarFallback className="rounded-md bg-primary text-xs text-primary-foreground">
                  {initials(user.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate text-sm font-medium">{user.fullName}</span>
                <span className="truncate text-xs text-muted-foreground">{roleNames}</span>
              </div>
              <ChevronsUpDownIcon className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-(--radix-dropdown-menu-trigger-width) min-w-60">
            <DropdownMenuLabel className="flex flex-col gap-0.5 font-normal">
              <span className="text-sm font-medium text-foreground">{user.fullName}</span>
              <span className="text-xs text-muted-foreground">
                <span className="doc-number">{user.employeeId}</span> · {user.department}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {appConfig.useMock && (
                <DropdownMenuItem onSelect={resetDemoData}>
                  <RotateCcwIcon />
                  重置演示数据
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={logout}>
                <LogOutIcon />
                退出登录
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
