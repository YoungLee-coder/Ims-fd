"use client"

import { BellIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { ApiRealm } from "@/lib/api/client"
import { formatRelative } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useMarkNotificationRead, useNotifications } from "@/features/notifications/api"

export function NotificationBell({ realm }: { realm: ApiRealm }) {
  const { data } = useNotifications(realm)
  const markRead = useMarkNotificationRead(realm)
  const items = data ?? []
  const unread = items.filter((item) => !item.readAt).length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={unread ? `${unread} 条未读通知` : "通知"}>
          <BellIcon />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-destructive" aria-hidden />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-0 p-0">
        <div className="border-b px-3 py-2.5 text-sm font-medium">通知</div>
        {items.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">暂无通知</p>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            <ul>
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full flex-col gap-1 px-3 py-2.5 text-left text-sm outline-none hover:bg-muted focus-visible:bg-muted",
                      !item.readAt && "bg-muted/50"
                    )}
                    onClick={() => {
                      if (!item.readAt) markRead.mutate(item.id)
                    }}
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="font-medium">{item.title}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{formatRelative(item.createdAt)}</span>
                    </span>
                    <span className="text-muted-foreground">{item.body}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
