import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api/client"
import { endpoints } from "@/lib/api/endpoints"
import type { AuditLog, AuditLogQuery, Paginated } from "@/types"

export function useAuditLogs(query: AuditLogQuery) {
  return useQuery({
    queryKey: ["audit-logs", query],
    queryFn: () => api.get<Paginated<AuditLog>>(endpoints.auditLogs, { ...query }),
    placeholderData: keepPreviousData,
  })
}
