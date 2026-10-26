"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { format, startOfYear, subDays } from "date-fns"
import { AlertTriangleIcon, DownloadIcon } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { errorMessage } from "@/lib/api/client"
import { APPLICATION_STATUS_LABELS, APPLICATION_TYPE_LABELS } from "@/lib/constants"
import { formatDateTime } from "@/lib/format"
import { useT } from "@/lib/i18n/client"
import type { TFunction } from "@/lib/i18n/translate"
import { cn } from "@/lib/utils"
import { useReports } from "@/features/reports/api"
import type { ApplicationStatus, ReportQuery, ReportSummary, ReportTrendPoint } from "@/types"

type Preset = "7d" | "30d" | "90d" | "year" | "all" | "custom"

const PRESETS: { value: Preset; label: string }[] = [
  { value: "7d", label: "近 7 天" },
  { value: "30d", label: "近 30 天" },
  { value: "90d", label: "近 90 天" },
  { value: "year", label: "今年" },
  { value: "all", label: "全部" },
  { value: "custom", label: "自定义" },
]

/** 状态分布按办理流程排序，而不是按数量 */
const STATUS_ORDER: ApplicationStatus[] = [
  "draft",
  "submitted",
  "under_review",
  "supplement_required",
  "approved",
  "rejected",
  "withdrawn",
]

function day(date: Date) {
  return format(date, "yyyy-MM-dd")
}

function presetQuery(preset: Preset, custom: ReportQuery): ReportQuery {
  const today = new Date()
  switch (preset) {
    case "7d":
      return { from: day(subDays(today, 6)), to: day(today) }
    case "30d":
      return { from: day(subDays(today, 29)), to: day(today) }
    case "90d":
      return { from: day(subDays(today, 89)), to: day(today) }
    case "year":
      return { from: day(startOfYear(today)), to: day(today) }
    case "all":
      return {}
    case "custom":
      return custom
  }
}

function percent(rate: number | null) {
  return rate == null ? "—" : `${Math.round(rate * 1000) / 10}%`
}

function daysText(days: number | null, t: TFunction) {
  return days == null ? "—" : t("{days} 天", { days })
}

export function ReportView() {
  const t = useT()
  const [preset, setPreset] = useState<Preset>("30d")
  const [custom, setCustom] = useState<ReportQuery>(() => presetQuery("30d", {}))
  const customInvalid = preset === "custom" && (!custom.from || !custom.to || custom.from > custom.to)
  const query = useMemo(() => presetQuery(preset, custom), [preset, custom])
  const { data, isPending, isError, error, isPlaceholderData } = useReports(!customInvalid, query)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={t("报表与统计")}
        description={t("按申请日期统计申请量、通过率和平均处理时长；在办与超期为当前实时数据。")}
        actions={
          <Button variant="outline" disabled={!data} onClick={() => data && downloadCsv(data, t)}>
            <DownloadIcon data-icon="inline-start" />
            {t("导出 CSV")}
          </Button>
        }
        className="mb-0"
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <ToggleGroup
          type="single"
          variant="outline"
          value={preset}
          onValueChange={(value) => value && setPreset(value as Preset)}
          aria-label={t("统计范围")}
          className="flex-wrap"
        >
          {PRESETS.map((item) => (
            <ToggleGroupItem key={item.value} value={item.value}>
              {t(item.label)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {preset === "custom" && (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              aria-label={t("开始日期")}
              value={custom.from ?? ""}
              max={custom.to}
              onChange={(e) => setCustom((prev) => ({ ...prev, from: e.target.value || undefined }))}
              className="w-40"
            />
            <span className="text-muted-foreground">–</span>
            <Input
              type="date"
              aria-label={t("结束日期")}
              value={custom.to ?? ""}
              min={custom.from}
              onChange={(e) => setCustom((prev) => ({ ...prev, to: e.target.value || undefined }))}
              className="w-40"
            />
          </div>
        )}
        {data && (
          <p className="text-sm text-muted-foreground sm:ml-auto">
            {t("{from} 至 {to}", { from: data.range.from, to: data.range.to })}
            {" · "}
            {t("更新于 {time}", { time: formatDateTime(data.generatedAt) })}
          </p>
        )}
      </div>

      {customInvalid ? (
        <Alert>
          <AlertTitle>{t("请选择有效的统计范围")}</AlertTitle>
          <AlertDescription>{t("开始日期不能晚于结束日期。")}</AlertDescription>
        </Alert>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertTitle>{t("报表加载失败")}</AlertTitle>
          <AlertDescription>{errorMessage(error)}</AlertDescription>
        </Alert>
      ) : (
        <div className={cn("flex flex-col gap-8 transition-opacity", isPlaceholderData && "opacity-60")}>
          <KeyFigures data={isPending ? undefined : data} />
          <TrendSection data={isPending ? undefined : data} />
          <div className="grid gap-8 xl:grid-cols-2">
            <StatusSection data={isPending ? undefined : data} />
            <ReviewerSection data={isPending ? undefined : data} />
          </div>
          <TypeSection data={isPending ? undefined : data} />
        </div>
      )}
    </div>
  )
}

/* ---------- 关键指标 ---------- */

function Figure({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value?: string
  hint?: React.ReactNode
  tone?: "warning"
}) {
  return (
    <div className="-mr-px -mb-px flex flex-col gap-2 border-r border-b p-5">
      <span className="text-sm text-muted-foreground">{label}</span>
      {value === undefined ? (
        <Skeleton className="h-9 w-20" />
      ) : (
        <span
          className={cn(
            "text-3xl leading-9 font-semibold tabular-nums",
            tone === "warning" && "text-[color-mix(in_oklch,var(--warning),black_25%)]"
          )}
        >
          {value}
        </span>
      )}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  )
}

function KeyFigures({ data }: { data?: ReportSummary }) {
  const t = useT()
  return (
    <section aria-label={t("关键指标")}>
      <div className="grid grid-cols-2 overflow-hidden rounded-lg border bg-card lg:grid-cols-4">
        <Figure
          label={t("申请量")}
          value={data && String(data.applicationTotal)}
          hint={data && t("其中已提交 {count} 份", { count: data.submittedTotal })}
        />
        <Figure
          label={t("通过率")}
          value={data && percent(data.approvalRate)}
          hint={data && t("通过 {approved} · 驳回 {rejected}", { approved: data.approvedTotal, rejected: data.rejectedTotal })}
        />
        <Figure
          label={t("平均处理时长")}
          value={data && daysText(data.averageProcessingDays, t)}
          hint={t("从提交到通过或驳回")}
        />
        <Figure
          label={t("在办申请")}
          value={data && String(data.backlog.total)}
          tone={data?.backlog.overdue ? "warning" : undefined}
          hint={
            data &&
            (data.backlog.overdue ? (
              <Link href="/applications?status=under_review" className="inline-flex items-center gap-1 text-[color-mix(in_oklch,var(--warning),black_25%)] underline-offset-4 hover:underline">
                <AlertTriangleIcon className="size-3.5" />
                {t("{count} 份超过 {days} 天未办结", { count: data.backlog.overdue, days: data.backlog.slaDays })}
              </Link>
            ) : (
              t("无超过 {days} 天未办结的申请", { days: data.backlog.slaDays })
            ))
          }
        />
      </div>
    </section>
  )
}

/* ---------- 趋势 ---------- */

function niceMax(value: number) {
  if (value <= 4) return 4
  const step = 10 ** Math.floor(Math.log10(value))
  for (const m of [1, 2, 2.5, 5, 10]) if (m * step >= value) return m * step
  return value
}

function periodLabel(period: string, granularity: ReportSummary["granularity"]) {
  return granularity === "day" ? period.slice(5) : period
}

function SectionTitle({ id, title, description }: { id: string; title: string; description?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 id={id} className="text-lg font-semibold">
        {title}
      </h2>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  )
}

function TrendSection({ data }: { data?: ReportSummary }) {
  const t = useT()
  return (
    <section aria-labelledby="trend-title" className="flex flex-col gap-4">
      <SectionTitle
        id="trend-title"
        title={t("办理趋势")}
        description={t("提交量按提交日、办结量按通过或驳回的日期归入各{unit}。", {
          unit: data?.granularity === "month" ? t("月") : t("日"),
        })}
      />
      <div className="rounded-lg border bg-card p-4 sm:p-5">
        {!data ? <Skeleton className="h-56 w-full" /> : <TrendChart data={data} />}
      </div>
    </section>
  )
}

function TrendChart({ data }: { data: ReportSummary }) {
  const t = useT()
  const [active, setActive] = useState<number | null>(null)
  const points = data.trend
  const decided = (p: ReportTrendPoint) => p.approved + p.rejected
  const max = niceMax(Math.max(0, ...points.map((p) => Math.max(p.submitted, decided(p)))))
  const ticks = [max, max / 2, 0]
  const empty = points.every((p) => p.submitted === 0 && decided(p) === 0)
  // 标签太密时只隔几个显示一次
  const labelEvery = Math.max(1, Math.ceil(points.length / 10))
  const n = points.length
  const linePath = points
    .map((p, i) => `${i ? "L" : "M"}${((i + 0.5) / n) * 100},${100 - (decided(p) / max) * 100}`)
    .join(" ")
  const current = active === null ? null : points[active]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-sm bg-chart-1" aria-hidden />
          {t("提交量")}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-0.5 w-4 rounded-full bg-chart-3" aria-hidden />
          {t("办结量（通过 + 驳回）")}
        </span>
      </div>

      <div className="flex gap-3">
        <div className="flex h-56 flex-col justify-between text-right text-xs text-muted-foreground tabular-nums" aria-hidden>
          {ticks.map((tick) => (
            <span key={tick} className="-my-2 leading-4">
              {Number.isInteger(tick) ? tick : tick.toFixed(1)}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="relative h-56">
            {ticks.map((tick) => (
              <div
                key={tick}
                className={cn("absolute inset-x-0 border-t", tick === 0 ? "border-border" : "border-dashed border-border/60")}
                style={{ top: `${100 - (tick / max) * 100}%` }}
                aria-hidden
              />
            ))}
            <div className="absolute inset-0 flex" role="list" aria-label={t("办理趋势")}>
              {points.map((p, i) => (
                <div
                  key={p.period}
                  role="listitem"
                  tabIndex={0}
                  aria-label={t("{period}：提交 {submitted}，通过 {approved}，驳回 {rejected}", {
                    period: p.period,
                    submitted: p.submitted,
                    approved: p.approved,
                    rejected: p.rejected,
                  })}
                  className={cn(
                    "relative flex h-full flex-1 items-end justify-center px-[2px] outline-none",
                    active === i && "bg-muted/60"
                  )}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                >
                  <div
                    className="w-full max-w-8 rounded-t-[4px] bg-chart-1"
                    style={{ height: `${(p.submitted / max) * 100}%` }}
                  />
                </div>
              ))}
            </div>
            <svg
              className="pointer-events-none absolute inset-0 size-full overflow-visible"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden
            >
              <path d={linePath} fill="none" className="stroke-chart-3" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
            </svg>
            {current && active !== null && (
              <div
                className="pointer-events-none absolute top-2 z-10 w-44 rounded-md border bg-popover p-2.5 text-xs text-popover-foreground shadow-md"
                style={
                  active < n / 2
                    ? { left: `calc(${((active + 1) / n) * 100}% + 8px)` }
                    : { right: `calc(${((n - active) / n) * 100}% + 8px)` }
                }
              >
                <div className="mb-1.5 font-medium">{current.period}</div>
                <TooltipRow label={t("提交量")} value={current.submitted} swatch="bg-chart-1" />
                <TooltipRow label={t("已通过")} value={current.approved} />
                <TooltipRow label={t("已驳回")} value={current.rejected} />
              </div>
            )}
            {empty && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                {t("该范围内没有提交或办结的申请")}
              </div>
            )}
          </div>
          <div className="mt-2 flex text-xs text-muted-foreground tabular-nums" aria-hidden>
            {points.map((p, i) => (
              <span key={p.period} className="relative h-4 flex-1">
                {i % labelEvery === 0 && (
                  <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap">{periodLabel(p.period, data.granularity)}</span>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function TooltipRow({ label, value, swatch }: { label: string; value: number; swatch?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        {swatch && <span className={cn("size-2 rounded-sm", swatch)} aria-hidden />}
        {label}
      </span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  )
}

/* ---------- 状态分布 ---------- */

function StatusSection({ data }: { data?: ReportSummary }) {
  const t = useT()
  const rows = STATUS_ORDER.map((status) => ({ status, count: data?.byStatus[status] ?? 0 }))
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <section aria-labelledby="status-title" className="flex flex-col gap-4">
      <SectionTitle id="status-title" title={t("状态分布")} description={t("统计范围内申请的当前状态。")} />
      <div className="rounded-lg border bg-card p-4 sm:p-5">
        {!data ? (
          <div className="flex flex-col gap-3">
            {STATUS_ORDER.map((s) => (
              <Skeleton key={s} className="h-5 w-full" />
            ))}
          </div>
        ) : (
          <dl className="flex flex-col gap-3">
            {rows.map((row) => (
              <div key={row.status} className="grid grid-cols-[6rem_1fr_2.5rem] items-center gap-3 text-sm">
                <dt className="truncate text-muted-foreground">{t(APPLICATION_STATUS_LABELS[row.status])}</dt>
                <div className="h-2.5 rounded-full bg-muted" aria-hidden>
                  {row.count > 0 && (
                    <div className="h-full rounded-full bg-chart-1" style={{ width: `${(row.count / max) * 100}%` }} />
                  )}
                </div>
                <dd className={cn("text-right font-medium tabular-nums", row.count === 0 && "text-muted-foreground/70")}>
                  {row.count}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  )
}

/* ---------- 审批人工作量 ---------- */

function ReviewerSection({ data }: { data?: ReportSummary }) {
  const t = useT()
  return (
    <section aria-labelledby="reviewer-title" className="flex flex-col gap-4">
      <SectionTitle id="reviewer-title" title={t("审批工作量")} description={t("统计范围内每位工作人员作出的审批决定。")} />
      <div className="overflow-hidden rounded-lg border bg-card">
        {!data ? (
          <div className="flex flex-col gap-3 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : !data.reviewers.length ? (
          <Empty className="py-10">
            <EmptyHeader>
              <EmptyTitle>{t("暂无审批记录")}</EmptyTitle>
              <EmptyDescription>{t("该范围内还没有工作人员作出审批决定。")}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">{t("审批人")}</TableHead>
                <TableHead className="text-right">{t("审批决定")}</TableHead>
                <TableHead className="text-right">{t("通过")}</TableHead>
                <TableHead className="pr-4 text-right">{t("驳回")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.reviewers.map((row) => (
                <TableRow key={row.actorId}>
                  <TableCell className="pl-4 font-medium">{row.actorName}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.decisions}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.approved}</TableCell>
                  <TableCell className="pr-4 text-right tabular-nums">{row.rejected}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </section>
  )
}

/* ---------- 按申请类型 ---------- */

function TypeSection({ data }: { data?: ReportSummary }) {
  const t = useT()
  return (
    <section aria-labelledby="type-title" className="flex flex-col gap-4">
      <SectionTitle id="type-title" title={t("按申请类型")} />
      <div className="overflow-hidden rounded-lg border bg-card">
        {!data ? (
          <div className="flex flex-col gap-3 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : !data.types.length ? (
          <Empty className="py-10">
            <EmptyHeader>
              <EmptyTitle>{t("该范围内没有申请")}</EmptyTitle>
              <EmptyDescription>{t("换一个统计范围试试。")}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">{t("申请类型")}</TableHead>
                <TableHead className="text-right">{t("申请量")}</TableHead>
                <TableHead className="text-right">{t("通过")}</TableHead>
                <TableHead className="text-right">{t("驳回")}</TableHead>
                <TableHead className="text-right">{t("通过率")}</TableHead>
                <TableHead className="pr-4 text-right">{t("平均处理时长")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.types.map((row) => (
                <TableRow key={row.type}>
                  <TableCell className="pl-4 font-medium">{t(APPLICATION_TYPE_LABELS[row.type] ?? row.type)}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.total}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.approved}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.rejected}</TableCell>
                  <TableCell className="text-right tabular-nums">{percent(row.approvalRate)}</TableCell>
                  <TableCell className="pr-4 text-right tabular-nums">{daysText(row.averageProcessingDays, t)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </section>
  )
}

/* ---------- 导出 ---------- */

function csvCell(value: string | number | null) {
  const text = value == null ? "" : String(value)
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function downloadCsv(data: ReportSummary, t: TFunction) {
  const lines: (string | number | null)[][] = [
    [t("统计范围"), `${data.range.from} ~ ${data.range.to}`],
    [t("申请量"), data.applicationTotal],
    [t("通过率"), percent(data.approvalRate)],
    [t("平均处理时长"), data.averageProcessingDays],
    [t("在办申请"), data.backlog.total],
    [],
    [t("申请类型"), t("申请量"), t("通过"), t("驳回"), t("通过率"), t("平均处理时长")],
    ...data.types.map((row) => [
      t(APPLICATION_TYPE_LABELS[row.type] ?? row.type),
      row.total,
      row.approved,
      row.rejected,
      percent(row.approvalRate),
      row.averageProcessingDays,
    ]),
    [],
    [t("区间"), t("提交量"), t("已通过"), t("已驳回")],
    ...data.trend.map((p) => [p.period, p.submitted, p.approved, p.rejected]),
  ]
  // 带 BOM，Excel 直接打开不乱码
  const csv = "﻿" + lines.map((line) => line.map(csvCell).join(",")).join("\r\n")
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
  const link = document.createElement("a")
  link.href = url
  link.download = `report-${data.range.from}-${data.range.to}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
