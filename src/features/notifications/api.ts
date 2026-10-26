import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api, portalApi, type ApiRealm } from "@/lib/api/client"
import { endpoints } from "@/lib/api/endpoints"
import type { AppNotification, ID, NotificationPreferences } from "@/types"

export const notificationKeys = {
  staff: ["notifications", "staff"] as const,
  portal: ["notifications", "portal"] as const,
}

const clients = {
  staff: {
    http: api,
    paths: endpoints.notifications,
    key: notificationKeys.staff,
  },
  portal: {
    http: portalApi,
    paths: endpoints.portal.notifications,
    key: notificationKeys.portal,
  },
} as const

/** 最近 50 则通知；铃铛和通知页共用同一份缓存，未读筛选在前端完成。 */
export function useNotifications(realm: ApiRealm, enabled = true) {
  const { http, paths, key } = clients[realm]
  return useQuery({
    queryKey: [...key, "list"],
    queryFn: () => http.get<AppNotification[]>(paths.list),
    enabled,
    refetchInterval: 60_000,
  })
}

export function useMarkNotificationRead(realm: ApiRealm) {
  const queryClient = useQueryClient()
  const { http, paths, key } = clients[realm]
  return useMutation({
    mutationFn: (id: ID) => http.post<void>(paths.read(id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...key, "list"] }),
  })
}

export function useMarkAllNotificationsRead(realm: ApiRealm) {
  const queryClient = useQueryClient()
  const { http, paths, key } = clients[realm]
  return useMutation({
    mutationFn: () => http.post<void>(paths.readAll),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...key, "list"] }),
  })
}

export function useNotificationPreferences(realm: ApiRealm) {
  const { http, paths, key } = clients[realm]
  return useQuery({
    queryKey: [...key, "preferences"],
    queryFn: () => http.get<NotificationPreferences>(paths.preferences),
  })
}

export function useUpdateNotificationPreferences(realm: ApiRealm) {
  const queryClient = useQueryClient()
  const { http, paths, key } = clients[realm]
  return useMutation({
    mutationFn: (payload: { emailEnabled: boolean }) => http.put<NotificationPreferences>(paths.preferences, payload),
    onSuccess: (data) => queryClient.setQueryData([...key, "preferences"], data),
  })
}
