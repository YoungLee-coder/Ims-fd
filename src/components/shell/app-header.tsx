"use client"

import { Fragment } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useApplicant } from "@/features/applicants/api"
import { useStaffApplication } from "@/features/applications/api"
import { LocaleSwitcher } from "@/components/locale-switcher"
import { useT } from "@/lib/i18n/client"
import { NotificationBell } from "@/features/notifications/notification-bell"

const LABELS: Record<string, string> = {
  dashboard: "工作台",
  applications: "申请受理",
  applicants: "申请人档案",
  new: "新建档案",
  edit: "编辑",
  admin: "系统管理",
  users: "用户管理",
  roles: "角色与权限",
  audit: "审计日志",
}

function ApplicantCrumb({ id }: { id: string }) {
  const t = useT()
  const { data } = useApplicant(id)
  return <span className="doc-number">{data?.fileNo ?? t("档案详情")}</span>
}

function ApplicationCrumb({ id }: { id: string }) {
  const t = useT()
  const { data } = useStaffApplication(id)
  return <span className="doc-number">{data?.applicationNo ?? t("申请详情")}</span>
}

export function AppHeader() {
  const t = useT()
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)

  const crumbs = segments.map((segment, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/")
    const isApplicantId = segments[i - 1] === "applicants" && !(segment in LABELS)
    const isApplicationId = segments[i - 1] === "applications" && !(segment in LABELS)
    const label = isApplicantId ? (
      <ApplicantCrumb id={segment} />
    ) : isApplicationId ? (
      <ApplicationCrumb id={segment} />
    ) : (
      (LABELS[segment] ? t(LABELS[segment]) : segment)
    )
    // "系统管理" 仅是分组，没有对应页面
    const linkable = segment !== "admin"
    return { href, label, linkable }
  })

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="data-[orientation=vertical]:h-4" />
      <Breadcrumb className="min-w-0 flex-1">
        <BreadcrumbList>
          {crumbs.map((crumb, i) => (
            <Fragment key={crumb.href}>
              {i > 0 && <BreadcrumbSeparator className="max-sm:hidden" />}
              <BreadcrumbItem className={i < crumbs.length - 1 ? "max-sm:hidden" : undefined}>
                {i === crumbs.length - 1 ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : crumb.linkable ? (
                  <BreadcrumbLink asChild>
                    <Link href={crumb.href}>{crumb.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <span>{crumb.label}</span>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <LocaleSwitcher />
      <NotificationBell realm="staff" />
    </header>
  )
}
