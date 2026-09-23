"use client"

import { useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  BanIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EllipsisIcon,
  PencilIcon,
  SearchIcon,
  UserCheckIcon,
  UserPlusIcon,
  UserXIcon,
} from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/page-header"
import { UserStatusBadge } from "@/components/status-badges"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { errorMessage } from "@/lib/api/client"
import { formatRelative } from "@/lib/format"
import { useAuth } from "@/features/auth/auth-provider"
import { Can } from "@/features/auth/require-permission"
import { useDashboardSummary } from "@/features/dashboard/api"
import { useSetUserStatus, useUsers } from "@/features/users/api"
import { UserSheet, type UserSheetMode } from "@/features/users/user-sheet"
import type { User, UserStatus } from "@/types"

const PAGE_SIZE = 10
const TABS: { value: UserStatus | "all"; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "pending", label: "待审核" },
  { value: "active", label: "正常" },
  { value: "disabled", label: "已停用" },
]

type Confirm = { user: User; action: "disable" | "reject" } | null

export function UserList() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user: me, can } = useAuth()
  const canManage = can("user.manage")

  const status = (searchParams.get("status") as UserStatus | null) ?? "all"
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState("")
  const debouncedKeyword = useDebouncedValue(keyword.trim())
  const [sheet, setSheet] = useState<UserSheetMode | null>(null)
  const [confirm, setConfirm] = useState<Confirm>(null)

  const summary = useDashboardSummary()
  const setStatus = useSetUserStatus()
  const { data, isPending, isError, error, isPlaceholderData } = useUsers({
    keyword: debouncedKeyword || undefined,
    status: status === "all" ? undefined : status,
    page,
    pageSize: PAGE_SIZE,
  })
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  function changeStatus(user: User, next: "active" | "disabled" | "rejected") {
    setStatus.mutate(
      { id: user.id, status: next },
      {
        onSuccess: () =>
          toast.success(
            { active: `已启用 ${user.fullName}`, disabled: `已停用 ${user.fullName}`, rejected: "已驳回该申请" }[next]
          ),
        onError: (e) => toast.error(errorMessage(e)),
      }
    )
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title="用户管理"
        description="审批工作人员的账号申请、分配角色，以及停用离岗人员账号。"
        actions={
          <Can anyOf="user.manage">
            <Button onClick={() => setSheet({ kind: "create" })}>
              <UserPlusIcon data-icon="inline-start" />
              新建用户
            </Button>
          </Can>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={status}
          onValueChange={(value) => {
            setPage(1)
            router.replace(value === "all" ? pathname : `${pathname}?status=${value}`, { scroll: false })
          }}
        >
          <TabsList>
            {TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
                {tab.value === "pending" && !!summary.data?.pendingAccounts && (
                  <Badge variant="warning" className="ml-0.5 h-4 min-w-4 px-1 tabular-nums">
                    {summary.data.pendingAccounts}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <InputGroup className="sm:max-w-xs">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value)
              setPage(1)
            }}
            placeholder="姓名 / 用户名 / 工号 / 部门"
            aria-label="搜索用户"
          />
        </InputGroup>
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
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : data.items.length === 0 ? (
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyTitle>{status === "pending" ? "没有待审核的申请" : "没有符合条件的用户"}</EmptyTitle>
              <EmptyDescription>
                {status === "pending" ? "新的账号申请提交后会出现在这里。" : "调整关键词或切换状态后重试。"}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table className={isPlaceholderData ? "opacity-60" : undefined}>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">姓名</TableHead>
                <TableHead>工号</TableHead>
                <TableHead>部门</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>最近登录</TableHead>
                {canManage && (
                  <TableHead className="pr-4 text-right">
                    <span className="sr-only">操作</span>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="pl-4">
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {u.fullName}
                        {u.id === me.id && <span className="ml-1.5 text-xs font-normal text-muted-foreground">（你）</span>}
                      </span>
                      <span className="doc-number text-xs text-muted-foreground">{u.username}</span>
                    </div>
                  </TableCell>
                  <TableCell className="doc-number">{u.employeeId}</TableCell>
                  <TableCell>{u.department}</TableCell>
                  <TableCell>
                    {u.roles.length ? (
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map((r) => (
                          <Badge key={r.id} variant="outline">
                            {r.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <UserStatusBadge status={u.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatRelative(u.lastLoginAt)}</TableCell>
                  {canManage && (
                    <TableCell className="pr-4">
                      <div className="flex items-center justify-end gap-1">
                        {u.status === "pending" && (
                          <Button size="sm" onClick={() => setSheet({ kind: "approve", user: u })}>
                            审批
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" aria-label={`${u.fullName} 的更多操作`}>
                              <EllipsisIcon />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuGroup>
                              <DropdownMenuItem onSelect={() => setSheet({ kind: "edit", user: u })}>
                                <PencilIcon />
                                编辑信息与角色
                              </DropdownMenuItem>
                              {u.status === "disabled" && (
                                <DropdownMenuItem onSelect={() => changeStatus(u, "active")}>
                                  <UserCheckIcon />
                                  启用账号
                                </DropdownMenuItem>
                              )}
                              {u.status === "rejected" && (
                                <DropdownMenuItem onSelect={() => setSheet({ kind: "approve", user: u })}>
                                  <UserCheckIcon />
                                  重新审批
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuGroup>
                            {(u.status === "active" || u.status === "pending") && u.id !== me.id && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                  {u.status === "active" ? (
                                    <DropdownMenuItem
                                      variant="destructive"
                                      onSelect={() => setConfirm({ user: u, action: "disable" })}
                                    >
                                      <BanIcon />
                                      停用账号
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      variant="destructive"
                                      onSelect={() => setConfirm({ user: u, action: "reject" })}
                                    >
                                      <UserXIcon />
                                      驳回申请
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuGroup>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {data && data.total > data.pageSize && (
        <nav aria-label="分页" className="mt-4 flex items-center justify-between gap-4 text-sm text-muted-foreground">
          <span className="tabular-nums">
            共 {data.total} 人 · 第 {data.page} / {totalPages} 页
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeftIcon data-icon="inline-start" />
              上一页
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              下一页
              <ChevronRightIcon data-icon="inline-end" />
            </Button>
          </div>
        </nav>
      )}

      <UserSheet mode={sheet} onClose={() => setSheet(null)} />

      <AlertDialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.action === "disable" ? `停用 ${confirm.user.fullName} 的账号？` : "驳回这份账号申请？"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.action === "disable"
                ? "该用户将立即无法登录，已分配的角色会保留，之后可随时重新启用。"
                : "申请人将收到驳回通知，如需开通需重新提交申请。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() =>
                confirm && changeStatus(confirm.user, confirm.action === "disable" ? "disabled" : "rejected")
              }
            >
              {confirm?.action === "disable" ? "停用" : "驳回"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
