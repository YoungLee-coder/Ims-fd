"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { ApplicationStatusBadge } from "@/components/status-badges"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { errorMessage } from "@/lib/api/client"
import { APPLICATION_STATUS_LABELS, APPLICATION_TYPE_LABELS, countryName } from "@/lib/constants"
import { formatRelative } from "@/lib/format"
import { useStaffApplications } from "@/features/applications/api"
import type { ApplicationStatus } from "@/types"
import { useLocale, useT } from "@/lib/i18n/client"

const PAGE_SIZE = 8
const ALL = "all"

export function ApplicationInbox() {
  const t = useT()
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const status = (searchParams.get("status") as ApplicationStatus | null) ?? undefined
  const page = Number(searchParams.get("page") ?? 1)
  const [keyword, setKeyword] = useState(searchParams.get("q") ?? "")
  const debouncedKeyword = useDebouncedValue(keyword.trim())

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

  const { data, isPending, isError, error, isPlaceholderData } = useStaffApplications({
    keyword: searchParams.get("q") ?? undefined,
    status,
    page,
    pageSize: PAGE_SIZE,
  })

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
  const filtered = !!(searchParams.get("q") || status)

  return (
    <div className="flex flex-col">
      <PageHeader
        title={t("申请受理")}
        description={t("查看申请人提交的业务申请，受理后可要求补件、通过建档或驳回。")}
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <InputGroup className="sm:max-w-sm">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t("申请编号 / 姓名 / 护照号码")}
            aria-label={t("搜索申请")}
          />
        </InputGroup>
        <Select value={status ?? ALL} onValueChange={(v) => setParams({ status: v === ALL ? undefined : v })}>
          <SelectTrigger className="sm:w-36" aria-label={t("申请状态")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={ALL}>{t("全部状态")}</SelectItem>
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              {Object.entries(APPLICATION_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        {isPending ? (
          <div className="flex flex-col gap-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : isError ? (
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyTitle>{t("无法加载申请")}</EmptyTitle>
              <EmptyDescription>{errorMessage(error)}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : !data?.items.length ? (
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyTitle>{filtered ? t("没有符合条件的申请") : t("还没有申请")}</EmptyTitle>
              <EmptyDescription>
                {filtered ? t("试试放宽筛选条件。") : t("申请人在门户提交后，申请会出现在这里。")}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table className={isPlaceholderData ? "opacity-60 transition-opacity" : "transition-opacity"}>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">{t("申请人")}</TableHead>
                <TableHead>{t("申请编号")}</TableHead>
                <TableHead>{t("类型")}</TableHead>
                <TableHead>{t("国籍")}</TableHead>
                <TableHead>{t("状态")}</TableHead>
                <TableHead className="pr-4 text-right">{t("最近更新")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((application) => (
                <TableRow key={application.id} className="relative">
                  <TableCell className="pl-4">
                    <Link
                      href={`/applications/${application.id}`}
                      className="flex flex-col font-medium outline-none after:absolute after:inset-0 focus-visible:after:ring-3 focus-visible:after:ring-ring/50 focus-visible:after:ring-inset"
                    >
                      <span>
                        {application.surname} {application.givenNames}
                      </span>
                      {application.nativeName && (
                        <span className="text-xs font-normal text-muted-foreground">{application.nativeName}</span>
                      )}
                    </Link>
                  </TableCell>
                  <TableCell className="doc-number text-muted-foreground">
                    {application.applicationNo ?? t("草稿")}
                  </TableCell>
                  <TableCell>{APPLICATION_TYPE_LABELS[application.type]}</TableCell>
                  <TableCell>
                    {application.nationality ? (
                      <>
                        <span className="doc-number mr-1.5 text-xs text-muted-foreground">{application.nationality}</span>
                        {countryName(application.nationality, t)}
                      </>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <ApplicationStatusBadge status={application.status} />
                  </TableCell>
                  <TableCell className="pr-4 text-right text-muted-foreground">
                    {formatRelative(application.updatedAt, locale)}
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
    </div>
  )
}
