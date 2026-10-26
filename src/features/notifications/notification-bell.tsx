"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { BellIcon, CheckCheckIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { ApiRealm } from "@/lib/api/client"
import { useT } from "@/lib/i18n/client"
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/features/notifications/api"
import { NOTIFICATION_PAGE, NotificationItem } from "@/features/notifications/notification-item"
import type { AppNotification } from "@/types"

/** 弹层里只放最近几条，完整列表在通知页 */
const PREVIEW_COUNT = 8

export function NotificationBell({ realm }: { realm: ApiRealm }) {
  const t = useT()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const { data } = useNotifications(realm)
  const markRead = useMarkNotificationRead(realm)
  const markAll = useMarkAllNotificationsRead(realm)
  const items = data ?? []
  const unread = items.filter((item) => !item.readAt).length

  function select(item: AppNotification) {
    if (!item.readAt) markRead.mutate(item.id)
    if (item.link) {
      setOpen(false)
      router.push(item.link)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={unread ? t("{count} 条未读通知", { count: unread }) : t("通知")}>
          <BellIcon />
          {unread > 0 && (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[0.625rem] leading-none font-semibold text-white tabular-nums" aria-hidden>
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] max-w-[calc(100vw-2rem)] gap-0 p-0">
        <div className="flex items-center justify-between gap-2 border-b py-1.5 pr-1.5 pl-3">
          <span className="text-sm font-medium">{t("通知")}</span>
          <Button variant="ghost" size="sm" disabled={!unread || markAll.isPending} onClick={() => markAll.mutate()}>
            <CheckCheckIcon data-icon="inline-start" />
            {t("全部标为已读")}
          </Button>
        </div>
        {items.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">{t("暂无通知")}</p>
        ) : (
          <ul className="max-h-96 overflow-y-auto">
            {items.slice(0, PREVIEW_COUNT).map((item) => (
              <li key={item.id}>
                <NotificationItem item={item} onSelect={select} />
              </li>
            ))}
          </ul>
        )}
        <div className="border-t p-1.5">
          <Button variant="ghost" size="sm" className="w-full" asChild>
            <Link href={NOTIFICATION_PAGE[realm]} onClick={() => setOpen(false)}>
              {t("查看全部通知")}
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
