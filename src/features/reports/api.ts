import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api/client"
import { endpoints } from "@/lib/api/endpoints"
import type { ReportQuery, ReportSummary } from "@/types"

/** 不带参数时统计全部申请，工作台和侧栏徽标用它读当前待受理数。 */
export function useReports(enabled = true, query: ReportQuery = {}) {
  return useQuery({
    queryKey: ["reports", query],
    queryFn: () => api.get<ReportSummary>(endpoints.reports, { ...query }),
    enabled,
    placeholderData: keepPreviousData,
  })
}
