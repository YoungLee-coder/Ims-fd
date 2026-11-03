"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ChevronLeftIcon, ChevronRightIcon, CircleAlertIcon, DownloadIcon, SearchIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { errorMessage } from "@/lib/api/client"
import { downloadCsv } from "@/lib/csv"
import { formatDateTime } from "@/lib/format"
import { fetchAuditLogsForExport, filtersIgnored, useAuditLogs } from "@/features/audit/api"
import {
  ACTION_GROUPS,
  ACTOR_LABELS,
  actionLabel,
  humanizeDetail,
  resourceHref,
  resourceLabel,
} from "@/features/audit/labels"
import type { AuditActorType, AuditLog, AuditLogQuery } from "@/types"
import { useT } from "@/lib/i18n/client"
import type { TFunction } from "@/lib/i18n/translate"

const PAGE_SIZE = 12
const EXPORT_LIMIT = 5000
const ALL = "__all"

export function AuditLogList() {
  const t = useT()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const filters: Omit<AuditLogQuery, "page" | "pageSize"> = {
    keyword: searchParams.get("q") || undefined,
    actorType: (searchParams.get("actor") as AuditActorType | null) || undefined,
    action: searchParams.get("action") || undefined,
    resourceType: searchParams.get("resourceType") || undefined,
    resourceId: searchParams.get("resourceId") || undefined,
    from: searchParams.get("from") || undefined,
    to: searchParams.get("to") || undefined,
  }
  const page = Number(searchParams.get("page") ?? 1)
  const filtered = Object.values(filters).some(Boolean)

  const [keyword, setKeyword] = useState(filters.keyword ?? "")
  const debouncedKeyword = useDebouncedValue(keyword.trim())
  // 地址栏里的关键词被链接或“清除筛选”改掉时，同步回搜索框
  const urlKeyword = filters.keyword ?? ""
  const [trackedUrlKeyword, setTrackedUrlKeyword] = useState(urlKeyword)
  if (trackedUrlKeyword !== urlKeyword) {
    setTrackedUrlKeyword(urlKeyword)
    if (urlKeyword !== debouncedKeyword) setKeyword(urlKeyword)
  }
  const [selected, setSelected] = useState<AuditLog | null>(null)
  const [exporting, setExporting] = useState(false)

  function setParams(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    if (!("page" in next)) params.delete("page")
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  useEffect(() => {
    if ((searchParams.get("q") ?? "") !== debouncedKeyword) setParams({ q: debouncedKeyword || undefined })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedKeyword])

  const query: AuditLogQuery = { ...filters, page, pageSize: PAGE_SIZE }
  const { data, isPending, isError, error, isPlaceholderData } = useAuditLogs(query)

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
  const ignored = !!data && filtersIgnored(data.items, query)

  async function exportCsv() {
    setExporting(true)
    try {
      const { items, truncated } = await fetchAuditLogsForExport(filters, EXPORT_LIMIT)
      downloadCsv(
        [
          [t("时间"), t("操作人"), t("操作人类型"), t("操作人 ID"), t("动作"), t("动作代码"), t("对象类型"), t("对象 ID"), t("说明")],
          ...items.map((log) => [
            formatDateTime(log.createdAt),
            log.actorName,
            t(ACTOR_LABELS[log.actorType]),
            log.actorId,
            actionLabel(log.action, t),
            log.action,
            resourceLabel(log.resourceType, t),
            log.resourceId,
            humanizeDetail(log.detail, t),
          ]),
        ],
        `audit-log-${formatDateTime(new Date().toISOString()).replace(/\D/g, "")}.csv`
      )
      if (truncated) {
        toast.warning(t("记录较多，只导出了最近的 {count} 条，可缩小时间范围后分批导出。", { count: EXPORT_LIMIT }))
      }
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title={t("审计日志")}
        description={t("记录谁在何时做了什么操作，按时间倒序，便于追责与合规检查。")}
        actions={
          <Button variant="outline" disabled={!data?.total || exporting} onClick={exportCsv}>
            {exporting ? <Spinner data-icon="inline-start" /> : <DownloadIcon data-icon="inline-start" />}
            {t("导出 CSV")}
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <InputGroup className="sm:max-w-xs">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder={t("操作人 / 动作 / 说明")}
            aria-label={t("搜索审计日志")}
          />
        </InputGroup>
        <Select
          value={filters.actorType ?? ALL}
          onValueChange={(value) => setParams({ actor: value === ALL ? undefined : value })}
        >
          <SelectTrigger className="sm:w-32" aria-label={t("操作人类型")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={ALL}>{t("全部操作人")}</SelectItem>
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              {Object.entries(ACTOR_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {t(label)}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select
          value={filters.action ?? ALL}
          onValueChange={(value) => setParams({ action: value === ALL ? undefined : value })}
        >
          <SelectTrigger className="sm:w-40" aria-label={t("动作")}>
            <SelectValue>{filters.action ? actionLabel(filters.action, t) : t("全部动作")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={ALL}>{t("全部动作")}</SelectItem>
            </SelectGroup>
            {ACTION_GROUPS.map((group) => (
              <SelectGroup key={group.label}>
                <SelectSeparator />
                <SelectLabel>{t(group.label)}</SelectLabel>
                {Object.entries(group.actions).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {t(label)}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            aria-label={t("开始日期")}
            value={filters.from ?? ""}
            max={filters.to}
            onChange={(event) => setParams({ from: event.target.value || undefined })}
            className="w-full sm:w-38"
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="date"
            aria-label={t("结束日期")}
            value={filters.to ?? ""}
            min={filters.from}
            onChange={(event) => setParams({ to: event.target.value || undefined })}
            className="w-full sm:w-38"
          />
        </div>
        {filtered && (
          <Button variant="ghost" onClick={() => router.replace(pathname, { scroll: false })}>
            {t("清除筛选")}
          </Button>
        )}
      </div>

      {filters.resourceType && (
        <div className="mb-4 flex">
          <Badge variant="secondary" className="gap-1 pr-1">
            {t("对象：{resource}", {
              resource: `${resourceLabel(filters.resourceType, t)}${filters.resourceId ? ` #${filters.resourceId}` : ""}`,
            })}
            <button
              type="button"
              aria-label={t("移除对象筛选")}
              className="rounded-sm p-0.5 hover:bg-foreground/10"
              onClick={() => setParams({ resourceType: undefined, resourceId: undefined })}
            >
              <XIcon className="size-3" />
            </button>
          </Badge>
        </div>
      )}

      {ignored && (
        <Alert className="mb-4">
          <CircleAlertIcon />
          <AlertTitle>{t("部分筛选条件未生效")}</AlertTitle>
          <AlertDescription>{t("后端暂不支持按操作人类型、动作或对象筛选，下面列出的是未经这些条件过滤的记录。")}</AlertDescription>
        </Alert>
      )}

      <div className="overflow-hidden rounded-lg border bg-card" aria-busy={isPending || isPlaceholderData}>
        {isPending ? (
          <div className="flex flex-col gap-3 p-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-full" />
            ))}
          </div>
        ) : isError ? (
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyTitle>{t("无法加载审计日志")}</EmptyTitle>
              <EmptyDescription>{errorMessage(error)}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : !data.items.length ? (
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyTitle>{filtered ? t("没有符合条件的记录") : t("还没有审计记录")}</EmptyTitle>
              <EmptyDescription>{filtered ? t("调整关键词或筛选条件后重试。") : t("写操作发生后会出现在这里。")}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table className={isPlaceholderData ? "opacity-60 transition-opacity" : "transition-opacity"}>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">{t("时间")}</TableHead>
                <TableHead>{t("操作人")}</TableHead>
                <TableHead>{t("动作")}</TableHead>
                <TableHead>{t("对象")}</TableHead>
                <TableHead>{t("说明")}</TableHead>
                <TableHead className="w-0 pr-4">
                  <span className="sr-only">{t("详情")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((log) => (
                <TableRow key={log.id} className="cursor-pointer" onClick={() => setSelected(log)}>
                  <TableCell className="pl-4 tabular-nums text-muted-foreground">{formatDateTime(log.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{log.actorName}</span>
                      <span className="text-xs text-muted-foreground">{t(ACTOR_LABELS[log.actorType])}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{actionLabel(log.action, t)}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{resourceLabel(log.resourceType, t)}</TableCell>
                  <TableCell className="max-w-md truncate">{humanizeDetail(log.detail, t)}</TableCell>
                  <TableCell className="pr-4">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("查看详情")}
                      onClick={(event) => {
                        event.stopPropagation()
                        setSelected(log)
                      }}
                    >
                      <ChevronRightIcon />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {data && data.total > 0 && (
        <nav aria-label={t("分页")} className="mt-4 flex items-center justify-between gap-4 text-sm text-muted-foreground">
          <span className="tabular-nums">
            {t("共 {total} 条 · 第 {page} / {totalPages} 页", { total: data.total, page: data.page, totalPages })}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setParams({ page: String(page - 1) })}>
              <ChevronLeftIcon data-icon="inline-start" />
              {t("上一页")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setParams({ page: String(page + 1) })}
            >
              {t("下一页")}
              <ChevronRightIcon data-icon="inline-end" />
            </Button>
          </div>
        </nav>
      )}

      <AuditLogSheet log={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

function AuditLogSheet({ log, onClose }: { log: AuditLog | null; onClose: () => void }) {
  const t = useT()
  return (
    <Sheet open={!!log} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 overscroll-contain data-[side=right]:sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>{log ? actionLabel(log.action, t) : t("审计记录")}</SheetTitle>
          <SheetDescription>{log ? formatDateTime(log.createdAt) : null}</SheetDescription>
        </SheetHeader>
        {log && <AuditLogDetail log={log} t={t} onNavigate={onClose} />}
      </SheetContent>
    </Sheet>
  )
}

function AuditLogDetail({ log, t, onNavigate }: { log: AuditLog; t: TFunction; onNavigate: () => void }) {
  const href = resourceHref(log.resourceType, log.resourceId)
  const rows: [string, React.ReactNode][] = [
    [t("操作人"), log.actorName],
    [t("操作人类型"), t(ACTOR_LABELS[log.actorType])],
    [t("操作人 ID"), <span key="actor" className="font-mono text-xs">{log.actorId ?? "—"}</span>],
    [t("动作代码"), <span key="action" className="font-mono text-xs">{log.action}</span>],
    [t("对象类型"), resourceLabel(log.resourceType, t)],
    [
      t("对象 ID"),
      log.resourceId ? (
        href ? (
          <Link key="resource" href={href} className="font-mono text-xs underline-offset-4 hover:underline">
            {log.resourceId}
          </Link>
        ) : (
          <span key="resource" className="font-mono text-xs">{log.resourceId}</span>
        )
      ) : (
        "—"
      ),
    ],
    [t("记录编号"), <span key="id" className="font-mono text-xs">{log.id}</span>],
  ]
  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-6">
      <section className="flex flex-col gap-1.5">
        <h3 className="text-xs text-muted-foreground">{t("说明")}</h3>
        <p className="text-sm whitespace-pre-wrap">{humanizeDetail(log.detail, t) || "—"}</p>
      </section>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-3 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="break-all">{value}</dd>
          </div>
        ))}
      </dl>
      {log.resourceId && (
        <Button variant="outline" asChild>
          <Link
            href={`/admin/audit?resourceType=${encodeURIComponent(log.resourceType)}&resourceId=${encodeURIComponent(log.resourceId)}`}
            onClick={onNavigate}
          >
            {t("查看该对象的全部记录")}
          </Link>
        </Button>
      )}
    </div>
  )
}
