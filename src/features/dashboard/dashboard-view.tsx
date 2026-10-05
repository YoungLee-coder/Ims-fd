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
import { useReports } from "@/features/reports/api"
import { useT } from "@/lib/i18n/client"
import type { TFunction } from "@/lib/i18n/translate"

function ReportFigure({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex flex-col gap-2 border-b border-r p-5 -mb-px -mr-px">
      <span className="text-sm text-muted-foreground">{label}</span>
      {value === undefined ? <Skeleton className="h-9 w-16" /> : <span className="text-3xl leading-9 font-semibold tabular-nums">{value}</span>}
    </div>
  )
}

function greeting(t: TFunction) {
  const h = new Date().getHours()
  if (h < 6) return t("夜间值班辛苦了")
  if (h < 12) return t("早上好")
  if (h < 18) return t("下午好")
  return t("晚上好")
}

export function DashboardView() {
  const t = useT()
  const { user, can } = useAuth()
  const { data, isPending } = useDashboardSummary()
  const reports = useReports(can("applicant.read"))

  const stats = [
    {
      label: t("待受理申请"),
      value: reports.isPending ? undefined : (reports.data?.byStatus.submitted ?? 0),
      href: "/applications?status=submitted",
      show: can("applicant.read"),
    },
    { label: t("在档申请人"), value: data?.applicantTotal, href: "/applicants", show: can("applicant.read") },
    {
      label: t("审查中档案"),
      value: data?.underReview,
      href: "/applicants?status=under_review",
      show: can("applicant.read"),
    },
    { label: t("待核验证件"), value: data?.pendingVerification, show: can("document.read") },
    { label: t("即将到期或已过期"), value: data?.expiringSoon, show: can("document.read"), tone: "warning" as const },
    {
      label: t("待审核账号"),
      value: data?.pendingAccounts,
      href: "/admin/users?status=pending",
      show: can(["user.read", "user.manage"]),
    },
  ].filter((s) => s.show)

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title={t("{greeting}，{name}", { greeting: greeting(t), name: user.fullName })}
        description={t("{department} · {roles}", {
          department: t(user.department),
          roles: user.roles.map((r) => t(r.name)).join(t("、")) || t("未分配角色"),
        })}
        actions={
          <Can anyOf="applicant.create">
            <Button asChild>
              <Link href="/applicants/new">
                <FilePlusIcon data-icon="inline-start" />
                {t("新建档案")}
              </Link>
            </Button>
          </Can>
        }
        className="mb-0"
      />

      {stats.length > 0 && (
        <section aria-label={t("业务概况")}>
          <div className="grid grid-cols-2 overflow-hidden rounded-lg border bg-card sm:grid-cols-3 xl:grid-cols-6">
            {stats.map((stat) => {
              const content = (
                <>
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                  {isPending || stat.value === undefined ? (
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

      <Can anyOf="applicant.read">
        <section aria-labelledby="reports-title" className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h2 id="reports-title" className="text-lg font-semibold">
                {t("申请办理")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("通过率按已办结申请计算，平均处理天数从提交到通过或驳回。")}
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/applications">
                {t("前往受理")}
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 overflow-hidden rounded-lg border bg-card sm:grid-cols-3">
            <ReportFigure
              label={t("申请总量")}
              value={reports.isPending ? undefined : String(reports.data?.applicationTotal ?? 0)}
            />
            <ReportFigure
              label={t("通过率")}
              value={
                reports.isPending
                  ? undefined
                  : reports.data?.approvalRate == null
                    ? "—"
                    : `${Math.round(reports.data.approvalRate * 1000) / 10}%`
              }
            />
            <ReportFigure
              label={t("平均处理天数")}
              value={
                reports.isPending
                  ? undefined
                  : reports.data?.averageProcessingDays == null
                    ? "—"
                    : String(reports.data.averageProcessingDays)
              }
            />
          </div>
        </section>
      </Can>

      <Can anyOf="document.read">
        <section aria-labelledby="expiring-title" className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h2 id="expiring-title" className="text-lg font-semibold">
                {t("证件有效期提醒")}
              </h2>
              <p className="text-sm text-muted-foreground">{t("180 天内到期或已过期的证件，按剩余天数排序。")}</p>
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
                  <EmptyTitle>{t("暂无需要关注的证件")}</EmptyTitle>
                  <EmptyDescription>{t("所有在档证件的剩余有效期均超过 180 天。")}</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">{t("申请人")}</TableHead>
                    <TableHead>{t("证件")}</TableHead>
                    <TableHead>{t("号码")}</TableHead>
                    <TableHead>{t("到期日")}</TableHead>
                    <TableHead>{t("状态")}</TableHead>
                    <TableHead className="w-10 pr-4">
                      <span className="sr-only">{t("操作")}</span>
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
                          <Link href={`/applicants/${doc.applicantId}?tab=documents`} aria-label={t("查看 {applicantName} 的证件", { applicantName: doc.applicantName })}>
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
