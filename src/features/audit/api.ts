import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api/client"
import { endpoints } from "@/lib/api/endpoints"
import type { AuditLog, AuditLogQuery, Paginated } from "@/types"

export function useAuditLogs(query: AuditLogQuery, enabled = true) {
  return useQuery({
    queryKey: ["audit-logs", query],
    queryFn: () => api.get<Paginated<AuditLog>>(endpoints.auditLogs, { ...query }),
    placeholderData: keepPreviousData,
    enabled,
  })
}

const EXPORT_PAGE_SIZE = 100

/** 导出用：按当前筛选逐页拉取，最多 limit 条。truncated 表示还有未导出的记录。 */
export async function fetchAuditLogsForExport(query: Omit<AuditLogQuery, "page" | "pageSize">, limit: number) {
  const items: AuditLog[] = []
  let total = 0
  for (let page = 1; items.length < limit; page++) {
    const result = await api.get<Paginated<AuditLog>>(endpoints.auditLogs, {
      ...query,
      page,
      pageSize: EXPORT_PAGE_SIZE,
    })
    total = result.total
    items.push(...result.items)
    if (!result.items.length || items.length >= total) break
  }
  return { items: items.slice(0, limit), truncated: total > limit }
}

/**
 * 后端未支持某个筛选参数时会忽略它、照常返回记录。
 * 返回的记录里有任何一条不满足条件，就说明筛选没有生效。
 * 日期按时区换算可能差一天，不参与判断。
 */
export function filtersIgnored(items: AuditLog[], query: AuditLogQuery) {
  return items.some(
    (log) =>
      (query.actorType && log.actorType !== query.actorType) ||
      (query.action && log.action !== query.action) ||
      (query.resourceType && log.resourceType !== query.resourceType) ||
      (query.resourceId && log.resourceId !== query.resourceId)
  )
}
