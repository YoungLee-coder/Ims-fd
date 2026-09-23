"use client"

import Link from "next/link"
import { ArrowRightIcon, FilePlusIcon } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { ValidityBadge } from "@/components/status-badges"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DOCUMENT_TYPE_LABELS } from "@/lib/constants"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useAuth } from "@/features/auth/auth-provider"
import { Can } from "@/features/auth/require-permission"
import { useDashboardSummary } from "@/features/dashboard/api"

function greeting() {
  const h = new Date().getHours()
  if (h < 6) return "夜间值班辛苦了"
  if (h < 12) return "早上好"
  if (h < 18) return "下午好"
  return "晚上好"
}

export function DashboardView() {
  const { user, can } = useAuth()
  const { data, isPending } = useDashboardSummary()

  const stats = [
    { label: "在档申请人", value: data?.applicantTotal, href: "/applicants", show: can("applicant.read") },
    {
      label: "审查中档案",
      value: data?.underReview,
      href: "/applicants?status=under_review",
      show: can("applicant.read"),
    },
    { label: "待核验证件", value: data?.pendingVerification, show: can("document.read") },
    { label: "即将到期或已过期", value: data?.expiringSoon, show: can("document.read"), tone: "warning" as const },
    {
      label: "待审核账号",
      value: data?.pendingAccounts,
      href: "/admin/users?status=pending",
      show: can(["user.read", "user.manage"]),
    },
  ].filter((s) => s.show)

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title={`${greeting()}，${user.fullName}`}
        description={`${user.department} · ${user.roles.map((r) => r.name).join("、") || "未分配角色"}`}
        actions={
          <Can anyOf="applicant.create">
            <Button asChild>
              <Link href="/applicants/new">
                <FilePlusIcon data-icon="inline-start" />
                新建档案
              </Link>
            </Button>
          </Can>
        }
        className="mb-0"
      />

      {stats.length > 0 && (
        <section aria-label="业务概况">
          <div className="grid grid-cols-2 overflow-hidden rounded-lg border bg-card sm:grid-cols-3 xl:grid-cols-5">
            {stats.map((stat) => {
              const content = (
                <>
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                  {isPending ? (
                    <Skeleton className="h-9 w-12" />
                  ) : (
                    <span
                      className={cn(
                        "text-3xl leading-9 font-semibold tabular-nums",
                        stat.tone === "warning" && !!stat.value && "text-[color-mix(in_oklch,var(--warning),black_25%)]"
                      )}
                    >
                      {stat.value}
                    </span>
                  )}
                </>
              )
              const cell = "flex flex-col gap-2 border-b border-r p-5 -mb-px -mr-px"
              return stat.href ? (
                <Link
                  key={stat.label}
                  href={stat.href}
                  className={cn(cell, "transition-colors outline-none hover:bg-muted/60 focus-visible:bg-muted")}
                >
                  {content}
                </Link>
              ) : (
                <div key={stat.label} className={cell}>
                  {content}
                </div>
              )
            })}
          </div>
        </section>
      )}

      <Can anyOf="document.read">
        <section aria-labelledby="expiring-title" className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h2 id="expiring-title" className="text-lg font-semibold">
                证件有效期提醒
              </h2>
              <p className="text-sm text-muted-foreground">180 天内到期或已过期的证件，按剩余天数排序。</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border bg-card">
            {isPending ? (
              <div className="flex flex-col gap-3 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : !data?.expiringDocuments.length ? (
              <Empty className="py-10">
                <EmptyHeader>
                  <EmptyTitle>暂无需要关注的证件</EmptyTitle>
                  <EmptyDescription>所有在档证件的剩余有效期均超过 180 天。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">申请人</TableHead>
                    <TableHead>证件</TableHead>
                    <TableHead>号码</TableHead>
                    <TableHead>到期日</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="w-10 pr-4">
                      <span className="sr-only">操作</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.expiringDocuments.map((doc) => (
                    <TableRow key={doc.documentId}>
                      <TableCell className="pl-4">
                        <div className="flex flex-col">
                          <span className="font-medium">{doc.applicantName}</span>
                          <span className="doc-number text-xs text-muted-foreground">{doc.fileNo}</span>
                        </div>
                      </TableCell>
                      <TableCell>{DOCUMENT_TYPE_LABELS[doc.type]}</TableCell>
                      <TableCell className="doc-number">{doc.number}</TableCell>
                      <TableCell className="tabular-nums">{formatDate(doc.expiryDate)}</TableCell>
                      <TableCell>
                        <ValidityBadge expiryDate={doc.expiryDate} />
                      </TableCell>
                      <TableCell className="pr-4">
                        <Button variant="ghost" size="icon-sm" asChild>
                          <Link href={`/applicants/${doc.applicantId}?tab=documents`} aria-label={`查看 ${doc.applicantName} 的证件`}>
                            <ArrowRightIcon />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </section>
      </Can>
    </div>
  )
}
