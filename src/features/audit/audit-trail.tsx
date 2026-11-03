"use client"

import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { errorMessage } from "@/lib/api/client"
import { formatDateTime } from "@/lib/format"
import { filtersIgnored, useAuditLogs } from "@/features/audit/api"
import { ACTOR_LABELS, actionLabel, humanizeDetail } from "@/features/audit/labels"
import type { AuditLogQuery, ID } from "@/types"
import { useT } from "@/lib/i18n/client"

/** 某个对象（档案、申请等）最近的操作记录，用于详情页追溯“谁改过它”。 */
export function AuditTrail({ resourceType, resourceId, limit = 8 }: { resourceType: string; resourceId: ID; limit?: number }) {
  const t = useT()
  const query: AuditLogQuery = { resourceType, resourceId, page: 1, pageSize: limit }
  const { data, isPending, isError, error } = useAuditLogs(query)

  if (isPending) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    )
  }
  if (isError) return <p className="text-sm text-muted-foreground">{errorMessage(error)}</p>
  if (filtersIgnored(data.items, query)) {
    return <p className="text-sm text-muted-foreground">{t("后端暂不支持按对象查询审计日志，请到审计日志页按关键词检索。")}</p>
  }
  if (!data.items.length) return <p className="text-sm text-muted-foreground">{t("还没有针对它的操作记录。")}</p>

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col divide-y">
        {data.items.map((log) => (
          <li key={log.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <Badge variant="outline">{actionLabel(log.action, t)}</Badge>
              <span>{log.actorName}</span>
              <span className="text-xs text-muted-foreground">{t(ACTOR_LABELS[log.actorType])}</span>
              <time dateTime={log.createdAt} className="ml-auto text-xs tabular-nums text-muted-foreground">
                {formatDateTime(log.createdAt)}
              </time>
            </div>
            {log.detail && <p className="text-sm text-muted-foreground">{humanizeDetail(log.detail, t)}</p>}
          </li>
        ))}
      </ol>
      {data.total > data.items.length && (
        <Button variant="link" size="sm" className="self-start px-0" asChild>
          <Link
            href={`/admin/audit?resourceType=${encodeURIComponent(resourceType)}&resourceId=${encodeURIComponent(resourceId)}`}
          >
            {t("查看全部 {total} 条记录", { total: data.total })}
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </Button>
      )}
    </div>
  )
}
