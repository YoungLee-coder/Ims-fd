"use client"

import { useState } from "react"
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { errorMessage } from "@/lib/api/client"
import { formatDateTime } from "@/lib/format"
import { useAuditLogs } from "@/features/audit/api"
import type { AuditActorType } from "@/types"

const PAGE_SIZE = 12

const ACTOR_LABELS: Record<AuditActorType, string> = {
  staff: "工作人员",
  portal: "申请人",
  system: "系统",
}

const ACTION_LABELS: Record<string, string> = {
  "auth.login": "登录",
  "auth.register": "提交账号申请",
  "user.create": "新建账号",
  "user.update": "更新账号",
  "user.status": "变更账号状态",
  "role.create": "新建角色",
  "role.update": "更新角色",
  "role.delete": "删除角色",
  "applicant.create": "建立档案",
  "applicant.update": "更新档案",
  "applicant.delete": "删除档案",
  "document.create": "登记证件",
  "document.update": "修改证件",
  "document.delete": "删除证件",
  "document.verify": "核验证件",
  "application.submit": "提交申请",
  "application.decision": "审批申请",
}

export function AuditLogList() {
  const [keyword, setKeyword] = useState("")
  const [page, setPage] = useState(1)
  const debouncedKeyword = useDebouncedValue(keyword.trim())
  const [trackedKeyword, setTrackedKeyword] = useState(debouncedKeyword)
  if (trackedKeyword !== debouncedKeyword) {
    setTrackedKeyword(debouncedKeyword)
    setPage(1)
  }

  const { data, isPending, isError, error, isPlaceholderData } = useAuditLogs({
    keyword: debouncedKeyword || undefined,
    page,
    pageSize: PAGE_SIZE,
  })

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  return (
    <div className="flex flex-col">
      <PageHeader title="审计日志" description="登录、审批、建档等写操作的记录，按时间倒序。" />

      <div className="mb-4">
        <InputGroup className="sm:max-w-sm">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="操作人 / 动作 / 说明"
            aria-label="搜索审计日志"
          />
        </InputGroup>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        {isPending ? (
          <div className="flex flex-col gap-3 p-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-full" />
            ))}
          </div>
        ) : isError ? (
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyTitle>无法加载审计日志</EmptyTitle>
              <EmptyDescription>{errorMessage(error)}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : !data?.items.length ? (
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyTitle>{debouncedKeyword ? "没有符合条件的记录" : "还没有审计记录"}</EmptyTitle>
              <EmptyDescription>{debouncedKeyword ? "试试其他关键词。" : "写操作发生后会出现在这里。"}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table className={isPlaceholderData ? "opacity-60 transition-opacity" : "transition-opacity"}>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">时间</TableHead>
                <TableHead>操作人</TableHead>
                <TableHead>动作</TableHead>
                <TableHead className="pr-4">说明</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="pl-4 tabular-nums text-muted-foreground">{formatDateTime(log.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{log.actorName}</span>
                      <span className="text-xs text-muted-foreground">{ACTOR_LABELS[log.actorType]}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{ACTION_LABELS[log.action] ?? log.action}</Badge>
                  </TableCell>
                  <TableCell className="pr-4">{log.detail}</TableCell>
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
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
              <ChevronLeftIcon data-icon="inline-start" />
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
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
