"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeftIcon, CircleAlertIcon, CircleCheckIcon } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { ApplicationStatusBadge } from "@/components/status-badges"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { errorMessage } from "@/lib/api/client"
import { Badge } from "@/components/ui/badge"
import {
  APPLICATION_TYPE_LABELS,
  APPROVAL_LEVEL_LABELS,
  DECISION_ACTION_LABELS,
  MARITAL_LABELS,
  SEX_LABELS,
  countryName,
} from "@/lib/constants"
import { formatDate } from "@/lib/format"
import { useAuth } from "@/features/auth/auth-provider"
import { Can } from "@/features/auth/require-permission"
import { useStaffApplication } from "@/features/applications/api"
import { ApprovalHistory, ApprovalProgress } from "@/features/applications/approval-history"
import { DecisionDialog } from "@/features/applications/decision-dialog"
import { firstReviewer, isMultiLevel, workflowStep } from "@/features/applications/workflow"
import { ApplicationTimeline } from "@/features/portal/application-timeline"
import { AttachmentList } from "@/features/portal/attachment-list"
import type { Application, ApplicationDecisionAction } from "@/types"
import { useT } from "@/lib/i18n/client"

export function StaffApplicationDetail({ id }: { id: string }) {
  const t = useT()
  const { user } = useAuth()
  const { data, isPending, isError, error } = useStaffApplication(id)
  const [action, setAction] = useState<ApplicationDecisionAction | null>(null)

  if (isPending) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true" aria-label={t("正在加载申请")}>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <Empty className="min-h-[50vh]">
        <EmptyHeader>
          <EmptyTitle>{t("无法加载申请")}</EmptyTitle>
          <EmptyDescription>{errorMessage(error)}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" asChild>
            <Link href="/applications">{t("返回申请受理")}</Link>
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  const multiLevel = isMultiLevel(data)
  const step = workflowStep(data)
  const reviewer = step.level === "final_review" ? firstReviewer(data) : null
  // 初审人不能终审自己初审过的申请
  const selfReview = !!reviewer && !!user && reviewer.id === user.id

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4 self-start">
        <Link href="/applications">
          <ArrowLeftIcon data-icon="inline-start" />
          {t("返回申请受理")}
        </Link>
      </Button>

      <PageHeader
        title={APPLICATION_TYPE_LABELS[data.type]}
        description={<span className="doc-number">{data.applicationNo ?? t("草稿 · 尚未提交")}</span>}
        actions={
          <Can anyOf={step.permission}>
            {step.actions.map((item) => (
              <Button
                key={item}
                variant={item === "approve" || item === "pass_first_review" ? "default" : "outline"}
                disabled={selfReview}
                onClick={() => setAction(item)}
              >
                {t(DECISION_ACTION_LABELS[item])}
              </Button>
            ))}
          </Can>
        }
        className="mb-8"
      >
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <ApplicationStatusBadge status={data.status} />
          {step.level && <Badge variant="outline">{t("当前：{level}", { level: t(APPROVAL_LEVEL_LABELS[step.level]) })}</Badge>}
          {data.fileNo && (
            <Link href={`/applicants?q=${encodeURIComponent(data.fileNo)}`} className="text-xs text-muted-foreground underline-offset-4 hover:underline">
              {t("档案编号")} <span className="doc-number">{data.fileNo}</span>
            </Link>
          )}
        </div>
      </PageHeader>

      <StatusNotice application={data} />
      {selfReview && (
        <Alert className="mb-6">
          <CircleAlertIcon />
          <AlertTitle>{t("需由其他工作人员终审")}</AlertTitle>
          <AlertDescription>{t("这份申请的初审由你完成，按双人复核要求，终审须交给另一位有终审权限的工作人员。")}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="flex flex-col gap-6">
          {multiLevel && (
            <Section title={t("审批流程")}>
              <div className="flex flex-col gap-6">
                <ApprovalProgress application={data} />
                <ApprovalHistory records={data.approvals ?? []} />
              </div>
            </Section>
          )}
          <Section title={t("办理进度")}>
            <ApplicationTimeline timeline={data.timeline} />
          </Section>
          <Section title={t("申请材料（{count}）", { count: data.attachments.length })}>
            <AttachmentList attachments={data.attachments} emptyHint={t("本次申请尚未上传材料。")} />
          </Section>
        </div>
        <div className="flex flex-col gap-6">
          <Section title={t("申请事项")}>
            <dl className="grid grid-cols-2 gap-4">
              <Field label={t("计划入境日期")}>{formatDate(data.intendedArrivalDate)}</Field>
              <Field label={t("拟停留天数")}>{data.intendedStayDays ? t("{days} 天", { days: data.intendedStayDays }) : "—"}</Field>
              <Field label={t("申请事由")} className="col-span-2">
                {data.purpose || "—"}
              </Field>
            </dl>
          </Section>
          <Section title={t("申请人信息")}>
            <dl className="grid grid-cols-2 gap-4">
              <Field label={t("姓名（拉丁）")} className="col-span-2">
                {data.surname || data.givenNames ? `${data.surname} ${data.givenNames}` : "—"}
              </Field>
              {data.nativeName && (
                <Field label={t("原文姓名")} className="col-span-2">
                  {data.nativeName}
                </Field>
              )}
              <Field label={t("性别")}>{data.sex ? SEX_LABELS[data.sex] : "—"}</Field>
              <Field label={t("出生日期")}>{formatDate(data.dateOfBirth)}</Field>
              <Field label={t("出生地")}>{data.placeOfBirth || "—"}</Field>
              <Field label={t("国籍")}>
                {data.nationality ? `${countryName(data.nationality, t)} (${data.nationality})` : "—"}
              </Field>
              <Field label={t("婚姻状况")}>{data.maritalStatus ? MARITAL_LABELS[data.maritalStatus] : "—"}</Field>
              <Field label={t("职业")}>{data.occupation || "—"}</Field>
              <Field label={t("联系电话")}>{data.phone || "—"}</Field>
              <Field label={t("电子邮箱")}>{data.email || "—"}</Field>
              <Field label={t("地址")} className="col-span-2">
                {data.address || "—"}
              </Field>
            </dl>
          </Section>
          <Section title={t("护照信息")}>
            <dl className="grid grid-cols-2 gap-4">
              <Field label={t("护照号码")} className="col-span-2">
                <span className="doc-number">{data.passportNumber || "—"}</span>
              </Field>
              <Field label={t("签发国家")}>
                {data.passportIssuingCountry
                  ? `${countryName(data.passportIssuingCountry, t)} (${data.passportIssuingCountry})`
                  : "—"}
              </Field>
              <Field label={t("签发机关")}>{data.passportIssuingAuthority || "—"}</Field>
              <Field label={t("签发日期")}>{formatDate(data.passportIssueDate)}</Field>
              <Field label={t("有效期至")}>{formatDate(data.passportExpiryDate)}</Field>
            </dl>
          </Section>
        </div>
      </div>

      <DecisionDialog applicationId={data.id} action={action} onOpenChange={(open) => !open && setAction(null)} />
    </>
  )
}

function StatusNotice({ application }: { application: Application }) {
  const t = useT()
  if (application.status === "supplement_required" && application.reviewNote) {
    return (
      <Alert className="mb-6">
        <CircleAlertIcon />
        <AlertTitle>{t("已要求补件")}</AlertTitle>
        <AlertDescription>{application.reviewNote}</AlertDescription>
      </Alert>
    )
  }
  if (application.status === "rejected" && application.reviewNote) {
    return (
      <Alert variant="destructive" className="mb-6">
        <CircleAlertIcon />
        <AlertTitle>{t("已驳回")}</AlertTitle>
        <AlertDescription>{application.reviewNote}</AlertDescription>
      </Alert>
    )
  }
  if (application.status === "approved") {
    return (
      <Alert className="mb-6">
        <CircleCheckIcon />
        <AlertTitle>{t("已通过")}</AlertTitle>
        <AlertDescription>
          {application.fileNo ? t("已建立档案 {fileNo}。", { fileNo: application.fileNo }) : t("审核已通过。")}
          {application.reviewNote ? ` ${application.reviewNote}` : ""}
        </AlertDescription>
      </Alert>
    )
  }
  return null
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <Separator />
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm break-words">{children}</dd>
    </div>
  )
}
