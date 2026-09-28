import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api/client"
import { endpoints } from "@/lib/api/endpoints"
import type {
  Application,
  ApplicationDecisionPayload,
  ID,
  Paginated,
  StaffApplicationQuery,
} from "@/types"

export const staffApplicationKeys = {
  all: ["applications"] as const,
  list: (query: StaffApplicationQuery) => ["applications", "list", query] as const,
  detail: (id: ID) => ["applications", "detail", id] as const,
}

export const staffApplicationsApi = {
  list: (query: StaffApplicationQuery) =>
    api.get<Paginated<Application>>(endpoints.applications.list, { ...query }),
  get: (id: ID) => api.get<Application>(endpoints.applications.detail(id)),
  decide: (id: ID, payload: ApplicationDecisionPayload) =>
    api.post<Application>(endpoints.applications.decision(id), payload),
}

export function useStaffApplications(query: StaffApplicationQuery) {
  return useQuery({
    queryKey: staffApplicationKeys.list(query),
    queryFn: () => staffApplicationsApi.list(query),
    placeholderData: keepPreviousData,
  })
}

export function useStaffApplication(id: ID) {
  return useQuery({
    queryKey: staffApplicationKeys.detail(id),
    queryFn: () => staffApplicationsApi.get(id),
    enabled: !!id,
  })
}

export function useDecideApplication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: ApplicationDecisionPayload & { id: ID }) =>
      staffApplicationsApi.decide(id, payload),
    onSuccess: (application) => {
      queryClient.setQueryData(staffApplicationKeys.detail(application.id), application)
      queryClient.invalidateQueries({ queryKey: staffApplicationKeys.all })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      queryClient.invalidateQueries({ queryKey: ["reports"] })
      queryClient.invalidateQueries({ queryKey: ["applicants"] })
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })
}
