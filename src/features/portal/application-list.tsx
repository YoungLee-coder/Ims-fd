"use client"

import Link from "next/link"
import { ChevronRightIcon, FilePlusIcon, FileTextIcon, TriangleAlertIcon } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { ApplicationStatusBadge } from "@/components/status-badges"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { errorMessage } from "@/lib/api/client"
import { APPLICATION_TYPE_LABELS } from "@/lib/constants"
import { formatDateTime } from "@/lib/format"
import { useApplications } from "@/features/portal/api"
import type { Application } from "@/types"

export function ApplicationList() {
  const { data, isPending, isError, error } = useApplications()
  const supplements = data?.filter((a) => a.status === "supplement_required") ?? []

  return (
    <div className="flex flex-col">
      <PageHeader
        title="我的申请"
        description="查看每份申请的办理进度。草稿可继续填写，已提交的申请在受理前可以撤回。"
        actions={
          <Button asChild>
            <Link href="/portal/applications/new">
              <FilePlusIcon data-icon="inline-start" />
              新建申请
            </Link>
          </Button>
        }
      />

      {supplements.length > 0 && (
        <Alert className="mb-6">
          <TriangleAlertIcon className="text-warning" />
          <AlertTitle>有 {supplements.length} 份申请需要补交材料</AlertTitle>
          <AlertDescription>
            请查看申请详情中的受理意见，按要求补齐材料后重新提交，以免超过补件期限。
          </AlertDescription>
        </Alert>
      )}

      {isError ? (
        <Empty className="rounded-xl border bg-card py-16">
          <EmptyHeader>
            <EmptyTitle>加载失败</EmptyTitle>
            <EmptyDescription>{errorMessage(error)}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : isPending ? (
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="正在加载申请列表">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <Empty className="rounded-xl border bg-card py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileTextIcon />
            </EmptyMedia>
            <EmptyTitle>还没有提交过申请</EmptyTitle>
            <EmptyDescription>
              准备好护照等材料后，点击“新建申请”开始填写。填写过程中可以随时保存为草稿。
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/portal/applications/new">新建申请</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.map((application) => (
            <li key={application.id}>
              <ApplicationCard application={application} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ApplicationCard({ application }: { application: Application }) {
  const { id, applicationNo, type, status, attachments, submittedAt, updatedAt, fileNo } = application
  const isDraft = status === "draft"

  return (
    <Link
      href={`/portal/applications/${id}`}
      className="flex items-start gap-4 rounded-xl border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <ApplicationStatusBadge status={status} />
          <span className="font-medium">{APPLICATION_TYPE_LABELS[type]}</span>
          {applicationNo && <span className="doc-number text-xs text-muted-foreground">{applicationNo}</span>}
          {isDraft && <span className="text-xs text-muted-foreground">尚未提交</span>}
        </div>

        <dl className="flex flex-wrap gap-x-8 gap-y-1 text-xs text-muted-foreground">
          <div className="flex gap-1.5">
            <dt>材料</dt>
            <dd className="tabular-nums">{attachments.length} 份</dd>
          </div>
          {submittedAt && (
            <div className="flex gap-1.5">
              <dt>提交时间</dt>
              <dd className="tabular-nums">{formatDateTime(submittedAt)}</dd>
            </div>
          )}
          <div className="flex gap-1.5">
            <dt>最近更新</dt>
            <dd className="tabular-nums">{formatDateTime(updatedAt)}</dd>
          </div>
          {fileNo && (
            <div className="flex gap-1.5">
              <dt>档案编号</dt>
              <dd className="doc-number">{fileNo}</dd>
            </div>
          )}
        </dl>

        {status === "supplement_required" && application.reviewNote && (
          <p className="line-clamp-2 rounded-md bg-warning/12 px-3 py-2 text-xs text-foreground">
            受理意见：{application.reviewNote}
          </p>
        )}
      </div>

      <ChevronRightIcon aria-hidden className="mt-1 size-4 shrink-0 text-muted-foreground" />
    </Link>
  )
}
