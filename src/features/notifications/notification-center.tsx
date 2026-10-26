"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCheckIcon, MailIcon } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { errorMessage, type ApiRealm } from "@/lib/api/client"
import { useT } from "@/lib/i18n/client"
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationPreferences,
  useNotifications,
  useUpdateNotificationPreferences,
} from "@/features/notifications/api"
import { NotificationItem } from "@/features/notifications/notification-item"
import type { AppNotification } from "@/types"

type Filter = "all" | "unread"

export function NotificationCenter({ realm }: { realm: ApiRealm }) {
  const t = useT()
  const router = useRouter()
  const [filter, setFilter] = useState<Filter>("all")
  const { data, isPending, isError, error } = useNotifications(realm)
  const markRead = useMarkNotificationRead(realm)
  const markAll = useMarkAllNotificationsRead(realm)
  const items = data ?? []
  const unread = items.filter((item) => !item.readAt).length
  const visible = filter === "unread" ? items.filter((item) => !item.readAt) : items

  function select(item: AppNotification) {
    if (!item.readAt) markRead.mutate(item.id)
    if (item.link) router.push(item.link)
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title={t("通知")}
        description={t("申请状态变更、审批流转和账号审核的提醒，保留最近 50 条。")}
        actions={
          <Button variant="outline" disabled={!unread || markAll.isPending} onClick={() => markAll.mutate()}>
            <CheckCheckIcon data-icon="inline-start" />
            {t("全部标为已读")}
          </Button>
        }
      />

      <EmailPreference realm={realm} />

      <ToggleGroup
        type="single"
        variant="outline"
        value={filter}
        onValueChange={(value) => value && setFilter(value as Filter)}
        aria-label={t("筛选通知")}
        className="mb-4"
      >
        <ToggleGroupItem value="all">{t("全部")}</ToggleGroupItem>
        <ToggleGroupItem value="unread">
          {t("未读")}
          {unread > 0 && <span className="tabular-nums">（{unread}）</span>}
        </ToggleGroupItem>
      </ToggleGroup>

      {isError ? (
        <Alert variant="destructive">
          <AlertTitle>{t("通知加载失败")}</AlertTitle>
          <AlertDescription>{errorMessage(error)}</AlertDescription>
        </Alert>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          {isPending ? (
            <div className="flex flex-col gap-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <Empty className="py-12">
              <EmptyHeader>
                <EmptyTitle>{filter === "unread" ? t("没有未读通知") : t("暂无通知")}</EmptyTitle>
                <EmptyDescription>{t("申请或账号状态有变化时，会在这里提醒你。")}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="divide-y">
              {visible.map((item) => (
                <li key={item.id}>
                  <NotificationItem item={item} onSelect={select} className="px-4 py-3" />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function EmailPreference({ realm }: { realm: ApiRealm }) {
  const t = useT()
  const { data, isPending } = useNotificationPreferences(realm)
  const update = useUpdateNotificationPreferences(realm)
  return (
    <div className="mb-6 flex items-center gap-4 rounded-lg border bg-card p-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground" aria-hidden>
        <MailIcon className="size-4" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <label htmlFor="email-notifications" className="text-sm font-medium">
          {t("邮件提醒")}
        </label>
        {isPending ? (
          <Skeleton className="h-4 w-48" />
        ) : (
          <p className="truncate text-sm text-muted-foreground">
            {data?.email ? t("站内通知同时发送到 {email}", { email: data.email }) : t("账号未填写邮箱，只能接收站内通知。")}
          </p>
        )}
      </div>
      <Switch
        id="email-notifications"
        checked={data?.emailEnabled ?? false}
        disabled={isPending || !data?.email || update.isPending}
        onCheckedChange={(checked) =>
          update.mutate(
            { emailEnabled: checked },
            {
              onSuccess: () => toast.success(checked ? t("已开启邮件提醒") : t("已关闭邮件提醒")),
              onError: (err) => toast.error(errorMessage(err)),
            }
          )
        }
      />
    </div>
  )
}
