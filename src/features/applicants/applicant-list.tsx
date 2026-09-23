"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ChevronLeftIcon, ChevronRightIcon, FilePlusIcon, SearchIcon, TriangleAlertIcon } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { ApplicantStatusBadge } from "@/components/status-badges"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { errorMessage } from "@/lib/api/client"
import { APPLICANT_STATUS_LABELS, COUNTRIES, countryName, SEX_LABELS } from "@/lib/constants"
import { formatDate, formatRelative } from "@/lib/format"
import { Can } from "@/features/auth/require-permission"
import { useApplicants } from "@/features/applicants/api"
import type { ApplicantStatus } from "@/types"

const PAGE_SIZE = 8
const ALL = "all"

export function ApplicantList() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const status = (searchParams.get("status") as ApplicantStatus | null) ?? undefined
  const nationality = searchParams.get("nationality") ?? undefined
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

  const { data, isPending, isError, error, isPlaceholderData } = useApplicants({
    keyword: searchParams.get("q") ?? undefined,
    status,
    nationality,
    page,
    pageSize: PAGE_SIZE,
  })

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
  const filtered = !!(searchParams.get("q") || status || nationality)

  return (
    <div className="flex flex-col">
      <PageHeader
        title="申请人档案"
        description="按姓名、档案编号或证件号码检索。点击姓名查看个人信息与证件。"
        actions={
          <Can anyOf="applicant.create">
            <Button asChild>
              <Link href="/applicants/new">
                <FilePlusIcon data-icon="inline-start" />
                新建档案
              </Link>
            </Button>
          </Can>
        }
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
            placeholder="姓名 / 档案编号 / 证件号码"
            aria-label="搜索档案"
          />
        </InputGroup>
        <Select value={status ?? ALL} onValueChange={(v) => setParams({ status: v === ALL ? undefined : v })}>
          <SelectTrigger className="sm:w-36" aria-label="档案状态">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={ALL}>全部状态</SelectItem>
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              {Object.entries(APPLICANT_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select
          value={nationality ?? ALL}
          onValueChange={(v) => setParams({ nationality: v === ALL ? undefined : v })}
        >
          <SelectTrigger className="sm:w-40" aria-label="国籍">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={ALL}>全部国籍</SelectItem>
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              {COUNTRIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        {filtered && (
          <Button
            variant="ghost"
            onClick={() => {
              setKeyword("")
              router.replace(pathname, { scroll: false })
            }}
          >
            清除筛选
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border bg-card" aria-busy={isPending || isPlaceholderData}>
        {isError ? (
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyTitle>加载失败</EmptyTitle>
              <EmptyDescription>{errorMessage(error)}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : isPending ? (
          <div className="flex flex-col gap-3 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : data.items.length === 0 ? (
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyTitle>{filtered ? "没有符合条件的档案" : "尚未建立任何档案"}</EmptyTitle>
              <EmptyDescription>
                {filtered ? "调整关键词或筛选条件后重试。" : "新申请人首次办理业务时，在此建立档案。"}
              </EmptyDescription>
            </EmptyHeader>
            {!filtered && (
              <Can anyOf="applicant.create">
                <EmptyContent>
                  <Button asChild>
                    <Link href="/applicants/new">新建档案</Link>
                  </Button>
                </EmptyContent>
              </Can>
            )}
          </Empty>
        ) : (
          <Table className={isPlaceholderData ? "opacity-60 transition-opacity" : "transition-opacity"}>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">姓名</TableHead>
                <TableHead>档案编号</TableHead>
                <TableHead>性别</TableHead>
                <TableHead>出生日期</TableHead>
                <TableHead>国籍</TableHead>
                <TableHead>证件</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="pr-4 text-right">最近更新</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((a) => (
                <TableRow key={a.id} className="relative">
                  <TableCell className="pl-4">
                    <Link
                      href={`/applicants/${a.id}`}
                      className="flex flex-col font-medium outline-none after:absolute after:inset-0 focus-visible:after:ring-3 focus-visible:after:ring-ring/50 focus-visible:after:ring-inset"
                    >
                      <span>
                        {a.surname} {a.givenNames}
                      </span>
                      {a.nativeName && (
                        <span className="text-xs font-normal text-muted-foreground">{a.nativeName}</span>
                      )}
                    </Link>
                  </TableCell>
                  <TableCell className="doc-number text-muted-foreground">{a.fileNo}</TableCell>
                  <TableCell>{SEX_LABELS[a.sex]}</TableCell>
                  <TableCell className="tabular-nums">{formatDate(a.dateOfBirth)}</TableCell>
                  <TableCell>
                    <span className="doc-number mr-1.5 text-xs text-muted-foreground">{a.nationality}</span>
                    {countryName(a.nationality)}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 tabular-nums">
                      {a.documentCount}
                      {a.attentionCount > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <TriangleAlertIcon
                              className="relative z-[1] size-3.5 text-warning"
                              aria-label={`${a.attentionCount} 份证件即将到期或已过期`}
                            />
                          </TooltipTrigger>
                          <TooltipContent>{a.attentionCount} 份证件即将到期或已过期</TooltipContent>
                        </Tooltip>
                      )}
                    </span>
                  </TableCell>
                  <TableCell>
                    <ApplicantStatusBadge status={a.status} />
                  </TableCell>
                  <TableCell className="pr-4 text-right text-muted-foreground">{formatRelative(a.updatedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {data && data.total > 0 && (
        <nav aria-label="分页" className="mt-4 flex items-center justify-between gap-4 text-sm text-muted-foreground">
          <span className="tabular-nums">
            共 {data.total} 条 · 第 {data.page} / {totalPages} 页
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setParams({ page: String(page - 1) })}
            >
              <ChevronLeftIcon data-icon="inline-start" />
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setParams({ page: String(page + 1) })}
            >
              下一页
              <ChevronRightIcon data-icon="inline-end" />
            </Button>
          </div>
        </nav>
      )}
    </div>
  )
}
