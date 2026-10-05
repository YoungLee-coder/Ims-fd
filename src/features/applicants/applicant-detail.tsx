"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ArchiveIcon, EllipsisIcon, PencilIcon, Trash2Icon, UserRoundIcon } from "lucide-react"
import { toast } from "sonner"

import { ApplicantStatusBadge } from "@/components/status-badges"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ApiError, errorMessage } from "@/lib/api/client"
import { countryName, MARITAL_LABELS, SEX_LABELS } from "@/lib/constants"
import { formatDate, formatDateTime, mrzLine } from "@/lib/format"
import { useAuth } from "@/features/auth/auth-provider"
import { Can } from "@/features/auth/require-permission"
import { useApplicant, useDeleteApplicant, useSaveApplicant } from "@/features/applicants/api"
import { toFormValues, toPayload, type ApplicantFormValues } from "@/features/applicants/schema"
import { DocumentList } from "@/features/documents/document-list"
import type { Applicant } from "@/types"
import { useT } from "@/lib/i18n/client"

type Tab = "profile" | "documents"

export function ApplicantDetail({ id }: { id: string }) {
  const t = useT()
  const { data: applicant, isPending, isError, error } = useApplicant(id)
  const { can } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tab: Tab = searchParams.get("tab") === "documents" && can("document.read") ? "documents" : "profile"

  if (isPending) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex gap-6">
          <Skeleton className="h-32 w-26 rounded-md" />
          <div className="flex flex-1 flex-col gap-3">
            <Skeleton className="h-8 w-72" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  if (isError) {
    const missing = error instanceof ApiError && error.status === 404
    return (
      <Empty className="min-h-[50vh]">
        <EmptyHeader>
          <EmptyTitle>{missing ? t("档案不存在") : t("加载失败")}</EmptyTitle>
          <EmptyDescription>{missing ? t("该档案可能已被删除，或链接有误。") : errorMessage(error)}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" asChild>
            <Link href="/applicants">{t("返回档案列表")}</Link>
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <DataPage applicant={applicant} />

      <Tabs
        value={tab}
        onValueChange={(value) => {
          const params = new URLSearchParams(searchParams)
          if (value === "profile") params.delete("tab")
          else params.set("tab", value)
          router.replace(`${pathname}${params.size ? `?${params}` : ""}`, { scroll: false })
        }}
        className="gap-6"
      >
        <div className="border-b">
          <TabsList variant="line">
            <TabsTrigger value="profile" className="px-3">
              {t("个人信息")}
            </TabsTrigger>
            <Can anyOf="document.read">
              <TabsTrigger value="documents" className="px-3">
                {t("证件")}
                <span className="tabular-nums text-muted-foreground">{applicant.documentCount}</span>
              </TabsTrigger>
            </Can>
          </TabsList>
        </div>
        <TabsContent value="profile">
          <ProfileView applicant={applicant} />
        </TabsContent>
        <Can anyOf="document.read">
          <TabsContent value="documents">
            <DocumentList applicant={applicant} />
          </TabsContent>
        </Can>
      </Tabs>
    </div>
  )
}

function DataPage({ applicant }: { applicant: Applicant }) {
  const t = useT()
  return (
    <section aria-label={t("档案概要")} className="overflow-hidden rounded-lg border bg-card">
      <div className="flex flex-col gap-6 p-5 sm:flex-row sm:p-6">
        <div
          role="img"
          aria-label={t("证件照占位")}
          className="flex h-32 w-26 shrink-0 flex-col items-center justify-center gap-1 rounded-md border border-dashed bg-muted text-muted-foreground"
        >
          <UserRoundIcon className="size-8" strokeWidth={1.5} />
          <span className="text-[0.65rem]">{t("证件照")}</span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl leading-tight font-semibold tracking-[-0.01em]" lang="en">
                  {applicant.surname} {applicant.givenNames}
                </h1>
                <ApplicantStatusBadge status={applicant.status} />
              </div>
              {applicant.nativeName && <p className="text-muted-foreground">{applicant.nativeName}</p>}
            </div>
            <ApplicantActions applicant={applicant} />
          </div>

          <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-4">
            {[
              [t("档案编号"), <span key="f" className="doc-number">{applicant.fileNo}</span>],
              [t("国籍"), `${countryName(applicant.nationality, t)} · ${applicant.nationality}`],
              [t("出生日期"), <span key="d" className="tabular-nums">{formatDate(applicant.dateOfBirth)}</span>],
              [t("性别"), SEX_LABELS[applicant.sex]],
            ].map(([label, value]) => (
              <div key={label as string} className="flex flex-col gap-0.5">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <div
        aria-hidden
        className="mrz overflow-hidden border-t border-dashed bg-muted/50 px-5 py-2.5 text-xs whitespace-nowrap text-muted-foreground sm:px-6"
      >
        {mrzLine(applicant, applicant.nationality)}
      </div>
    </section>
  )
}

function ApplicantActions({ applicant }: { applicant: Applicant }) {
  const t = useT()
  const router = useRouter()
  const { can } = useAuth()
  const save = useSaveApplicant()
  const remove = useDeleteApplicant()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const canUpdate = can("applicant.update")
  const canDelete = can("applicant.delete")
  if (!canUpdate && !canDelete) return null

  function archive() {
    const values = toFormValues(applicant) as ApplicantFormValues
    save.mutate(
      { id: applicant.id, payload: toPayload({ ...values, status: "archived" }) },
      {
        onSuccess: () => toast.success(t("档案已归档")),
        onError: (e) => toast.error(errorMessage(e)),
      }
    )
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      {canUpdate && (
        <Button variant="outline" asChild>
          <Link href={`/applicants/${applicant.id}/edit`}>
            <PencilIcon data-icon="inline-start" />
            {t("编辑")}
          </Link>
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label={t("更多操作")}>
            <EllipsisIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {canUpdate && (
            <DropdownMenuGroup>
              <DropdownMenuItem disabled={applicant.status === "archived" || save.isPending} onSelect={archive}>
                <ArchiveIcon />
                {t("归档")}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          )}
          {canUpdate && canDelete && <DropdownMenuSeparator />}
          {canDelete && (
            <DropdownMenuGroup>
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
                <Trash2Icon />
                {t("删除档案")}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("删除档案 {fileNo}？", { fileNo: applicant.fileNo })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("档案及其下 {documentCount} 份证件记录将被永久删除，且无法恢复。若申请人已离境，建议改为归档。", { documentCount: applicant.documentCount })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("取消")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() =>
                remove.mutate(applicant.id, {
                  onSuccess: () => {
                    toast.success(t("档案已删除"))
                    router.replace("/applicants")
                  },
                  onError: (e) => toast.error(errorMessage(e)),
                })
              }
            >
              {t("永久删除")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function InfoSection({ title, rows }: { title: string; rows: [string, React.ReactNode][] }) {
  const t = useT()
  return (
    <section className="grid gap-4 py-6 first:pt-0 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] md:gap-12">
      <h2 className="font-semibold">{title}</h2>
      <dl className="grid max-w-2xl gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="break-words">{value || <span className="text-muted-foreground">{t("未填写")}</span>}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function ProfileView({ applicant: a }: { applicant: Applicant }) {
  const t = useT()
  return (
    <div className="flex flex-col divide-y">
      <InfoSection
        title={t("身份信息")}
        rows={[
          [t("姓（Surname）"), a.surname],
          [t("名（Given names）"), a.givenNames],
          [t("原文姓名"), a.nativeName],
          [t("性别"), SEX_LABELS[a.sex]],
          [t("出生日期"), formatDate(a.dateOfBirth)],
          [t("出生地"), a.placeOfBirth],
          [t("国籍"), `${countryName(a.nationality, t)} (${a.nationality})`],
        ]}
      />
      <InfoSection
        title={t("联系方式")}
        rows={[
          [t("联系电话"), a.phone && <span className="tabular-nums">{a.phone}</span>],
          [t("电子邮箱"), a.email],
          [t("境内居住地址"), a.address],
        ]}
      />
      <InfoSection
        title={t("其他信息")}
        rows={[
          [t("婚姻状况"), MARITAL_LABELS[a.maritalStatus]],
          [t("职业"), a.occupation],
          [t("备注"), a.remarks],
        ]}
      />
      <InfoSection
        title={t("系统记录")}
        rows={[
          [t("建档时间"), <span key="c" className="tabular-nums">{formatDateTime(a.createdAt)}</span>],
          [t("最近更新"), <span key="u" className="tabular-nums">{formatDateTime(a.updatedAt)}</span>],
        ]}
      />
    </div>
  )
}
