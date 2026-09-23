import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api/client"
import { endpoints } from "@/lib/api/endpoints"
import type { DashboardSummary } from "@/types"

export function useDashboardSummary() {
  return useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: () => api.get<DashboardSummary>(endpoints.dashboard.summary),
  })
}
