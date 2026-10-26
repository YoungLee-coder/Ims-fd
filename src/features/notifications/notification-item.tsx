"use client"

import { BellIcon, FileCheckIcon, FileTextIcon, UserCheckIcon, type LucideIcon } from "lucide-react"

import { formatRelative } from "@/lib/format"
import { useLocale, useT } from "@/lib/i18n/client"
import { cn } from "@/lib/utils"
import type { ApiRealm } from "@/lib/api/client"
import type { AppNotification, NotificationCategory } from "@/types"

const CATEGORY_ICONS: Record<NotificationCategory, LucideIcon> = {
  application: FileTextIcon,
  document: FileCheckIcon,
  account: UserCheckIcon,
  system: BellIcon,
}

export const NOTIFICATION_PAGE: Record<ApiRealm, string> = {
  staff: "/notifications",
  portal: "/portal/notifications",
}

/** 通知行：铃铛弹层和通知页共用。点击由调用方处理（标为已读并跳转）。 */
export function NotificationItem({
  item,
  onSelect,
  className,
}: {
  item: AppNotification
  onSelect: (item: AppNotification) => void
  className?: string
}) {
  const t = useT()
  const locale = useLocale()
  const Icon = CATEGORY_ICONS[item.category] ?? BellIcon
  const unread = !item.readAt
  return (
    <button
      type="button"
      className={cn(
        "flex w-full gap-3 px-3 py-2.5 text-left text-sm outline-none hover:bg-muted focus-visible:bg-muted",
        unread && "bg-muted/50",
        className
      )}
      onClick={() => onSelect(item)}
    >
      <span
        className={cn(
          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground",
          unread && "text-primary"
        )}
        aria-hidden
      >
        <Icon className="size-3.5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className={cn("truncate", unread ? "font-semibold" : "font-medium")}>
            {unread && <span className="sr-only">{t("未读")}：</span>}
            {t(item.title)}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">{formatRelative(item.createdAt, locale)}</span>
        </span>
        <span className="text-muted-foreground">{item.body}</span>
      </span>
      {unread && <span className="mt-2 size-2 shrink-0 rounded-full bg-destructive" aria-hidden />}
    </button>
  )
}
