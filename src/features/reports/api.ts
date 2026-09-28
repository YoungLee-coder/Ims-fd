import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api/client"
import { endpoints } from "@/lib/api/endpoints"
import type { ReportSummary } from "@/types"

export function useReports(enabled = true) {
  return useQuery({
    queryKey: ["reports"],
    queryFn: () => api.get<ReportSummary>(endpoints.reports),
    enabled,
  })
}
