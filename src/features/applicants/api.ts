import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api/client"
import { endpoints } from "@/lib/api/endpoints"
import type { Applicant, ApplicantPayload, ApplicantQuery, ID, Paginated } from "@/types"

export const applicantKeys = {
  all: ["applicants"] as const,
  list: (q: ApplicantQuery) => ["applicants", "list", q] as const,
  detail: (id: ID) => ["applicants", "detail", id] as const,
}

export const applicantsApi = {
  list: (q: ApplicantQuery) => api.get<Paginated<Applicant>>(endpoints.applicants.list, { ...q }),
  get: (id: ID) => api.get<Applicant>(endpoints.applicants.detail(id)),
  create: (payload: ApplicantPayload) => api.post<Applicant>(endpoints.applicants.list, payload),
  update: (id: ID, payload: ApplicantPayload) => api.put<Applicant>(endpoints.applicants.detail(id), payload),
  remove: (id: ID) => api.delete(endpoints.applicants.detail(id)),
}

export function useApplicants(q: ApplicantQuery) {
  return useQuery({
    queryKey: applicantKeys.list(q),
    queryFn: () => applicantsApi.list(q),
    placeholderData: keepPreviousData,
  })
}

export function useApplicant(id: ID) {
  return useQuery({ queryKey: applicantKeys.detail(id), queryFn: () => applicantsApi.get(id) })
}

export function useSaveApplicant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id?: ID; payload: ApplicantPayload }) =>
      id ? applicantsApi.update(id, payload) : applicantsApi.create(payload),
    onSuccess: (applicant) => {
      qc.setQueryData(applicantKeys.detail(applicant.id), applicant)
      qc.invalidateQueries({ queryKey: applicantKeys.all })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
    },
  })
}

export function useDeleteApplicant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: applicantsApi.remove,
    onSuccess: (_, id) => {
      qc.removeQueries({ queryKey: applicantKeys.detail(id) })
      qc.invalidateQueries({ queryKey: applicantKeys.all })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
    },
  })
}
