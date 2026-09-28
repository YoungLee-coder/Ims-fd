import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api, portalApi, type ApiRealm } from "@/lib/api/client"
import { endpoints } from "@/lib/api/endpoints"
import type { AppNotification, ID } from "@/types"

export const notificationKeys = {
  staff: ["notifications", "staff"] as const,
  portal: ["notifications", "portal"] as const,
}

const clients = {
  staff: {
    list: () => api.get<AppNotification[]>(endpoints.notifications.list),
    read: (id: ID) => api.post<void>(endpoints.notifications.read(id)),
    key: notificationKeys.staff,
  },
  portal: {
    list: () => portalApi.get<AppNotification[]>(endpoints.portal.notifications.list),
    read: (id: ID) => portalApi.post<void>(endpoints.portal.notifications.read(id)),
    key: notificationKeys.portal,
  },
} as const

export function useNotifications(realm: ApiRealm, enabled = true) {
  const client = clients[realm]
  return useQuery({
    queryKey: client.key,
    queryFn: client.list,
    enabled,
    refetchInterval: 60_000,
  })
}

export function useMarkNotificationRead(realm: ApiRealm) {
  const queryClient = useQueryClient()
  const client = clients[realm]
  return useMutation({
    mutationFn: client.read,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: client.key }),
  })
}
