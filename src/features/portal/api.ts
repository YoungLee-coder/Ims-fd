import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { portalApi } from "@/lib/api/client"
import { endpoints } from "@/lib/api/endpoints"
import type {
  ApplicantAccount,
  ApplicantLoginPayload,
  ApplicantLoginResult,
  ApplicantRegisterPayload,
  Application,
  ApplicationDraftPayload,
  ApplicationQuery,
  Attachment,
  ID,
} from "@/types"

export const portalAuthKeys = {
  me: ["portal", "auth", "me"] as const,
}

export const portalAuthApi = {
  login: (payload: ApplicantLoginPayload) =>
    portalApi.post<ApplicantLoginResult>(endpoints.portal.auth.login, payload),
  register: (payload: ApplicantRegisterPayload) =>
    portalApi.post<ApplicantLoginResult>(endpoints.portal.auth.register, payload),
  logout: () => portalApi.post<void>(endpoints.portal.auth.logout),
  me: () => portalApi.get<ApplicantAccount>(endpoints.portal.auth.me),
}

export function useCurrentAccountQuery(enabled = true) {
  return useQuery({
    queryKey: portalAuthKeys.me,
    queryFn: portalAuthApi.me,
    staleTime: 5 * 60 * 1000,
    retry: false,
    enabled,
  })
}

export const applicationKeys = {
  all: ["portal", "applications"] as const,
  list: (query: ApplicationQuery) => ["portal", "applications", "list", query] as const,
  detail: (id: ID) => ["portal", "applications", "detail", id] as const,
}

export const applicationsApi = {
  list: (query: ApplicationQuery) => portalApi.get<Application[]>(endpoints.portal.applications.list, { ...query }),
  get: (id: ID) => portalApi.get<Application>(endpoints.portal.applications.detail(id)),
  create: (payload: Partial<ApplicationDraftPayload>) =>
    portalApi.post<Application>(endpoints.portal.applications.create, payload),
  update: (id: ID, payload: Partial<ApplicationDraftPayload>) =>
    portalApi.put<Application>(endpoints.portal.applications.detail(id), payload),
  submit: (id: ID) => portalApi.post<Application>(endpoints.portal.applications.submit(id)),
  withdraw: (id: ID) => portalApi.post<Application>(endpoints.portal.applications.withdraw(id)),
  remove: (id: ID) => portalApi.delete(endpoints.portal.applications.detail(id)),
  uploadAttachments: (id: ID, files: File[]) => {
    const form = new FormData()
    files.forEach((file) => form.append("files", file))
    return portalApi.post<Attachment[]>(endpoints.portal.applications.attachments(id), form)
  },
  removeAttachment: (id: ID, attachmentId: ID) =>
    portalApi.delete(endpoints.portal.applications.attachment(id, attachmentId)),
}

function useInvalidateApplications() {
  const queryClient = useQueryClient()
  return (application: Application) => {
    queryClient.setQueryData(applicationKeys.detail(application.id), application)
    queryClient.invalidateQueries({ queryKey: applicationKeys.all })
  }
}

export function useApplications(query: ApplicationQuery = {}) {
  return useQuery({
    queryKey: applicationKeys.list(query),
    queryFn: () => applicationsApi.list(query),
  })
}

export function useApplication(id: ID) {
  return useQuery({
    queryKey: applicationKeys.detail(id),
    queryFn: () => applicationsApi.get(id),
    enabled: !!id,
  })
}

/** 保存草稿：没有 id 时新建，有 id 时更新 */
export function useSaveDraft() {
  const invalidate = useInvalidateApplications()
  return useMutation({
    mutationFn: ({ id, payload }: { id?: ID; payload: Partial<ApplicationDraftPayload> }) =>
      id ? applicationsApi.update(id, payload) : applicationsApi.create(payload),
    onSuccess: invalidate,
  })
}

export function useSubmitApplication() {
  const invalidate = useInvalidateApplications()
  return useMutation({ mutationFn: applicationsApi.submit, onSuccess: invalidate })
}

export function useWithdrawApplication() {
  const invalidate = useInvalidateApplications()
  return useMutation({ mutationFn: applicationsApi.withdraw, onSuccess: invalidate })
}

export function useDeleteDraft() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: applicationsApi.remove,
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: applicationKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: applicationKeys.all })
    },
  })
}

export function useUploadAttachments() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, files }: { id: ID; files: File[] }) => applicationsApi.uploadAttachments(id, files),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: applicationKeys.all })
    },
  })
}

export function useRemoveAttachment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, attachmentId }: { id: ID; attachmentId: ID }) =>
      applicationsApi.removeAttachment(id, attachmentId),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: applicationKeys.all })
    },
  })
}
