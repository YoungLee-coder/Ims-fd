"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon, CircleAlertIcon, CircleCheckIcon, PencilIcon, Trash2Icon, UndoIcon } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/page-header"
import { ApplicationStatusBadge } from "@/components/status-badges"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { errorMessage } from "@/lib/api/client"
import {
  APPLICATION_TYPE_LABELS,
  MARITAL_LABELS,
  SEX_LABELS,
  WITHDRAWABLE_STATUSES,
  countryName,
} from "@/lib/constants"
import { formatDate, formatDateTime } from "@/lib/format"
import { useApplication, useDeleteDraft, useWithdrawApplication } from "@/features/portal/api"
import { ApplicationTimeline } from "@/features/portal/application-timeline"
import { AttachmentList } from "@/features/portal/attachment-list"
import type { Application } from "@/types"
import { useT } from "@/lib/i18n/client"

export function ApplicationDetail({ id }: { id: string }) {
  const t = useT()
  const { data, isPending, isError, error } = useApplication(id)

  if (isPending) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true" aria-label={t("正在加载申请")}>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    )
  }

  if (isError) {
    return (
      <Empty className="min-h-[50vh]">
        <EmptyHeader>
          <EmptyTitle>{t("无法加载申请")}</EmptyTitle>
          <EmptyDescription>{errorMessage(error)}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" asChild>
            <Link href="/portal/applications">{t("返回我的申请")}</Link>
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4 self-start">
        <Link href="/portal/applications">
          <ArrowLeftIcon data-icon="inline-start" />
          {t("返回我的申请")}
        </Link>
      </Button>

      <PageHeader
        title={APPLICATION_TYPE_LABELS[data.type]}
        description={
          <span className="doc-number">
            {data.applicationNo ?? t("草稿 · 尚未提交")}
          </span>
        }
        actions={<ApplicationActions application={data} />}
        className="mb-8"
      >
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <ApplicationStatusBadge status={data.status} />
          {data.fileNo && (
            <span className="text-xs text-muted-foreground">
              {t("档案编号")} <span className="doc-number">{data.fileNo}</span>
            </span>
          )}
        </div>
      </PageHeader>

      <StatusNotice application={data} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="flex flex-col gap-6">
          <Section title={t("办理进度")}>
            <ApplicationTimeline timeline={data.timeline} />
          </Section>

          <Section title={t("申请材料（{count}）", { count: data.attachments.length })}>
            <AttachmentList
              attachments={data.attachments}
              emptyHint={t("本次申请尚未上传材料。")}
            />
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
              <Field label={t("性别")}>{SEX_LABELS[data.sex]}</Field>
              <Field label={t("出生日期")}>{formatDate(data.dateOfBirth)}</Field>
              <Field label={t("出生地")}>{data.placeOfBirth || "—"}</Field>
              <Field label={t("国籍")}>
                {data.nationality ? `${countryName(data.nationality, t)} (${data.nationality})` : "—"}
              </Field>
              <Field label={t("婚姻状况")}>
                {data.maritalStatus ? MARITAL_LABELS[data.maritalStatus] : "—"}
              </Field>
              <Field label={t("职业")}>{data.occupation || "—"}</Field>
              <Field label={t("联系电话")}>{data.phone || "—"}</Field>
              <Field label={t("电子邮箱")}>{data.email || "—"}</Field>
              <Field label={t("境内地址")} className="col-span-2">
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

          <Section title={t("记录")}>
            <dl className="grid grid-cols-1 gap-4">
              <Field label={t("创建时间")}>{formatDateTime(data.createdAt)}</Field>
              <Field label={t("提交时间")}>{formatDateTime(data.submittedAt)}</Field>
              <Field label={t("最近更新")}>{formatDateTime(data.updatedAt)}</Field>
            </dl>
          </Section>
        </div>
      </div>
    </>
  )
}

/** 按状态给出最关键的下一步提示 */
function StatusNotice({ application }: { application: Application }) {
  const t = useT()
  const { status, reviewNote, fileNo } = application

  if (status === "supplement_required" && reviewNote) {
    return (
      <Alert variant="destructive" className="mb-6">
        <CircleAlertIcon />
        <AlertTitle>{t("需要补交材料")}</AlertTitle>
        <AlertDescription>{reviewNote}</AlertDescription>
      </Alert>
    )
  }

  if (status === "rejected" && reviewNote) {
    return (
      <Alert variant="destructive" className="mb-6">
        <CircleAlertIcon />
        <AlertTitle>{t("申请未获批准")}</AlertTitle>
        <AlertDescription>{reviewNote}</AlertDescription>
      </Alert>
    )
  }

  if (status === "approved") {
    return (
      <Alert className="mb-6">
        <CircleCheckIcon className="text-success" />
        <AlertTitle>{t("申请已通过")}</AlertTitle>
        <AlertDescription>
          {t("受理机关已完成审核{fileNote}。如需办理后续业务，请携带护照原件到窗口办理。", {
            fileNote: fileNo ? t("，并建立档案 {fileNo}", { fileNo }) : "",
          })}
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

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm break-words">{children}</dd>
    </div>
  )
}

/** 详情页的操作区：草稿可继续填写 / 删除，已提交可撤回 */
export function ApplicationActions({ application }: { application: Application }) {
  const t = useT()
  const router = useRouter()
  const withdraw = useWithdrawApplication()
  const remove = useDeleteDraft()
  const isDraft = application.status === "draft"
  const canWithdraw = WITHDRAWABLE_STATUSES.includes(application.status)

  if (!isDraft && !canWithdraw) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isDraft && (
        <Button asChild>
          <Link href={`/portal/applications/new?draft=${application.id}`}>
            <PencilIcon data-icon="inline-start" />
            {t("继续填写")}
          </Link>
        </Button>
      )}

      {isDraft && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" disabled={remove.isPending}>
              {remove.isPending ? <Spinner data-icon="inline-start" /> : <Trash2Icon data-icon="inline-start" />}
              {t("删除草稿")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("删除这份草稿？")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("草稿及其已上传的材料将被永久删除，操作不可撤销。")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("取消")}</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() =>
                  remove.mutate(application.id, {
                    onSuccess: () => {
                      toast.success(t("草稿已删除"))
                      router.replace("/portal/applications")
                    },
                  })
                }
              >
                {t("删除")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {canWithdraw && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" disabled={withdraw.isPending}>
              {withdraw.isPending ? <Spinner data-icon="inline-start" /> : <UndoIcon data-icon="inline-start" />}
              {t("撤回申请")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("撤回这份申请？")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("撤回后本次申请将终止办理。如需继续办理，需要重新填写并提交申请。")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("取消")}</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() =>
                  withdraw.mutate(application.id, {
                    onSuccess: () => toast.success(t("申请已撤回")),
                  })
                }
              >
                {t("确认撤回")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
