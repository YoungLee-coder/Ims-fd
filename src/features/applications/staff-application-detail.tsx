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
import {
  APPLICATION_TYPE_LABELS,
  DECISION_ACTION_LABELS,
  MARITAL_LABELS,
  SEX_LABELS,
  countryName,
} from "@/lib/constants"
import { formatDate } from "@/lib/format"
import { Can } from "@/features/auth/require-permission"
import { useStaffApplication } from "@/features/applications/api"
import { DecisionDialog } from "@/features/applications/decision-dialog"
import { ApplicationTimeline } from "@/features/portal/application-timeline"
import { AttachmentList } from "@/features/portal/attachment-list"
import type { Application, ApplicationDecisionAction, ApplicationStatus } from "@/types"

const ACTIONS: Partial<Record<ApplicationStatus, ApplicationDecisionAction[]>> = {
  submitted: ["start_review"],
  supplement_required: ["start_review"],
  under_review: ["approve", "request_supplement", "reject"],
}

export function StaffApplicationDetail({ id }: { id: string }) {
  const { data, isPending, isError, error } = useStaffApplication(id)
  const [action, setAction] = useState<ApplicationDecisionAction | null>(null)

  if (isPending) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true" aria-label="正在加载申请">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <Empty className="min-h-[50vh]">
        <EmptyHeader>
          <EmptyTitle>无法加载申请</EmptyTitle>
          <EmptyDescription>{errorMessage(error)}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" asChild>
            <Link href="/applications">返回申请受理</Link>
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  const actions = ACTIONS[data.status] ?? []

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4 self-start">
        <Link href="/applications">
          <ArrowLeftIcon data-icon="inline-start" />
          返回申请受理
        </Link>
      </Button>

      <PageHeader
        title={APPLICATION_TYPE_LABELS[data.type]}
        description={<span className="doc-number">{data.applicationNo ?? "草稿 · 尚未提交"}</span>}
        actions={
          <Can anyOf="applicant.update">
            {actions.map((item) => (
              <Button
                key={item}
                variant={item === "reject" ? "outline" : item === "approve" ? "default" : "outline"}
                onClick={() => setAction(item)}
              >
                {DECISION_ACTION_LABELS[item]}
              </Button>
            ))}
          </Can>
        }
        className="mb-8"
      >
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <ApplicationStatusBadge status={data.status} />
          {data.fileNo && (
            <Link href={`/applicants?q=${encodeURIComponent(data.fileNo)}`} className="text-xs text-muted-foreground underline-offset-4 hover:underline">
              档案编号 <span className="doc-number">{data.fileNo}</span>
            </Link>
          )}
        </div>
      </PageHeader>

      <StatusNotice application={data} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="flex flex-col gap-6">
          <Section title="办理进度">
            <ApplicationTimeline timeline={data.timeline} />
          </Section>
          <Section title={`申请材料（${data.attachments.length}）`}>
            <AttachmentList attachments={data.attachments} emptyHint="本次申请尚未上传材料。" />
          </Section>
        </div>
        <div className="flex flex-col gap-6">
          <Section title="申请事项">
            <dl className="grid grid-cols-2 gap-4">
              <Field label="计划入境日期">{formatDate(data.intendedArrivalDate)}</Field>
              <Field label="拟停留天数">{data.intendedStayDays ? `${data.intendedStayDays} 天` : "—"}</Field>
              <Field label="申请事由" className="col-span-2">
                {data.purpose || "—"}
              </Field>
            </dl>
          </Section>
          <Section title="申请人信息">
            <dl className="grid grid-cols-2 gap-4">
              <Field label="姓名（拉丁）" className="col-span-2">
                {data.surname || data.givenNames ? `${data.surname} ${data.givenNames}` : "—"}
              </Field>
              {data.nativeName && (
                <Field label="原文姓名" className="col-span-2">
                  {data.nativeName}
                </Field>
              )}
              <Field label="性别">{data.sex ? SEX_LABELS[data.sex] : "—"}</Field>
              <Field label="出生日期">{formatDate(data.dateOfBirth)}</Field>
              <Field label="出生地">{data.placeOfBirth || "—"}</Field>
              <Field label="国籍">
                {data.nationality ? `${countryName(data.nationality)}（${data.nationality}）` : "—"}
              </Field>
              <Field label="婚姻状况">{data.maritalStatus ? MARITAL_LABELS[data.maritalStatus] : "—"}</Field>
              <Field label="职业">{data.occupation || "—"}</Field>
              <Field label="联系电话">{data.phone || "—"}</Field>
              <Field label="电子邮箱">{data.email || "—"}</Field>
              <Field label="地址" className="col-span-2">
                {data.address || "—"}
              </Field>
            </dl>
          </Section>
          <Section title="护照信息">
            <dl className="grid grid-cols-2 gap-4">
              <Field label="护照号码" className="col-span-2">
                <span className="doc-number">{data.passportNumber || "—"}</span>
              </Field>
              <Field label="签发国家">
                {data.passportIssuingCountry
                  ? `${countryName(data.passportIssuingCountry)}（${data.passportIssuingCountry}）`
                  : "—"}
              </Field>
              <Field label="签发机关">{data.passportIssuingAuthority || "—"}</Field>
              <Field label="签发日期">{formatDate(data.passportIssueDate)}</Field>
              <Field label="有效期至">{formatDate(data.passportExpiryDate)}</Field>
            </dl>
          </Section>
        </div>
      </div>

      <DecisionDialog applicationId={data.id} action={action} onOpenChange={(open) => !open && setAction(null)} />
    </>
  )
}

function StatusNotice({ application }: { application: Application }) {
  if (application.status === "supplement_required" && application.reviewNote) {
    return (
      <Alert className="mb-6">
        <CircleAlertIcon />
        <AlertTitle>已要求补件</AlertTitle>
        <AlertDescription>{application.reviewNote}</AlertDescription>
      </Alert>
    )
  }
  if (application.status === "rejected" && application.reviewNote) {
    return (
      <Alert variant="destructive" className="mb-6">
        <CircleAlertIcon />
        <AlertTitle>已驳回</AlertTitle>
        <AlertDescription>{application.reviewNote}</AlertDescription>
      </Alert>
    )
  }
  if (application.status === "approved") {
    return (
      <Alert className="mb-6">
        <CircleCheckIcon />
        <AlertTitle>已通过</AlertTitle>
        <AlertDescription>
          {application.fileNo ? `已建立档案 ${application.fileNo}。` : "审核已通过。"}
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
