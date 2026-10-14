import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api/client"
import { endpoints } from "@/lib/api/endpoints"
import type {
  Application,
  ApplicationDecisionPayload,
  ApplicationDocument,
  ApplicationDocumentCategory,
  ID,
  Paginated,
  StaffApplicationQuery,
  VerifyDocumentPayload,
} from "@/types"

export const staffApplicationKeys = {
  all: ["applications"] as const,
  list: (query: StaffApplicationQuery) => ["applications", "list", query] as const,
  detail: (id: ID) => ["applications", "detail", id] as const,
  documents: (id: ID) => ["applications", "documents", id] as const,
}

export const staffApplicationsApi = {
  list: (query: StaffApplicationQuery) =>
    api.get<Paginated<Application>>(endpoints.applications.list, { ...query }),
  get: (id: ID) => api.get<Application>(endpoints.applications.detail(id)),
  decide: (id: ID, payload: ApplicationDecisionPayload) =>
    api.post<Application>(endpoints.applications.decision(id), payload),
  documents: (id: ID) => api.get<ApplicationDocument[]>(endpoints.applications.documents(id)),
  uploadDocuments: (id: ID, category: ApplicationDocumentCategory, files: File[]) => {
    const form = new FormData()
    form.append("category", category)
    files.forEach((file) => form.append("files", file))
    return api.post<ApplicationDocument[]>(endpoints.applications.documents(id), form)
  },
  removeDocument: (id: ID, documentId: ID) => api.delete(endpoints.applications.document(id, documentId)),
  verifyDocument: (id: ID, documentId: ID, payload: VerifyDocumentPayload) =>
    api.put<ApplicationDocument>(endpoints.applications.documentVerification(id, documentId), payload),
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

export function useApplicationDocuments(id: ID) {
  return useQuery({
    queryKey: staffApplicationKeys.documents(id),
    queryFn: () => staffApplicationsApi.documents(id),
    enabled: !!id,
    // 旧版后端没有该接口，404 时直接回退到申请附件列表，不必重试
    retry: false,
  })
}

function useInvalidateApplicationDocuments(id: ID) {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: staffApplicationKeys.documents(id) })
    queryClient.invalidateQueries({ queryKey: staffApplicationKeys.detail(id) })
  }
}

export function useUploadApplicationDocuments(id: ID) {
  const invalidate = useInvalidateApplicationDocuments(id)
  return useMutation({
    mutationFn: ({ category, files }: { category: ApplicationDocumentCategory; files: File[] }) =>
      staffApplicationsApi.uploadDocuments(id, category, files),
    onSettled: invalidate,
  })
}

export function useRemoveApplicationDocument(id: ID) {
  const invalidate = useInvalidateApplicationDocuments(id)
  return useMutation({
    mutationFn: (documentId: ID) => staffApplicationsApi.removeDocument(id, documentId),
    onSuccess: invalidate,
  })
}

export function useVerifyApplicationDocument(id: ID) {
  const invalidate = useInvalidateApplicationDocuments(id)
  return useMutation({
    mutationFn: ({ documentId, ...payload }: VerifyDocumentPayload & { documentId: ID }) =>
      staffApplicationsApi.verifyDocument(id, documentId, payload),
    onSuccess: invalidate,
  })
}
