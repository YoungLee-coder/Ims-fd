import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api/client"
import { endpoints } from "@/lib/api/endpoints"
import { applicantKeys } from "@/features/applicants/api"
import type { Attachment, DocumentPayload, ID, IdentityDocument, VerifyDocumentPayload } from "@/types"

export const documentKeys = {
  byApplicant: (applicantId: ID) => ["documents", applicantId] as const,
}

export const documentsApi = {
  list: (applicantId: ID) => api.get<IdentityDocument[]>(endpoints.applicants.documents(applicantId)),
  create: (applicantId: ID, payload: DocumentPayload) =>
    api.post<IdentityDocument>(endpoints.applicants.documents(applicantId), payload),
  update: (id: ID, payload: DocumentPayload) => api.put<IdentityDocument>(endpoints.documents.detail(id), payload),
  remove: (id: ID) => api.delete(endpoints.documents.detail(id)),
  verify: (id: ID, payload: VerifyDocumentPayload) =>
    api.put<IdentityDocument>(endpoints.documents.verification(id), payload),
  uploadAttachments: (id: ID, files: File[]) => {
    const form = new FormData()
    files.forEach((file) => form.append("files", file))
    return api.post<Attachment[]>(endpoints.documents.attachments(id), form)
  },
  removeAttachment: (id: ID, attachmentId: ID) => api.delete(endpoints.documents.attachment(id, attachmentId)),
}

export function useDocuments(applicantId: ID, enabled = true) {
  return useQuery({
    queryKey: documentKeys.byApplicant(applicantId),
    queryFn: () => documentsApi.list(applicantId),
    enabled,
  })
}

function useInvalidateDocuments(applicantId: ID) {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: documentKeys.byApplicant(applicantId) })
    qc.invalidateQueries({ queryKey: applicantKeys.all })
    qc.invalidateQueries({ queryKey: ["dashboard"] })
  }
}

export function useSaveDocument(applicantId: ID) {
  const invalidate = useInvalidateDocuments(applicantId)
  return useMutation({
    mutationFn: async ({
      id,
      payload,
      files,
      removedAttachmentIds,
    }: {
      id?: ID
      payload: DocumentPayload
      files: File[]
      removedAttachmentIds: ID[]
    }) => {
      const doc = id ? await documentsApi.update(id, payload) : await documentsApi.create(applicantId, payload)
      await Promise.all(removedAttachmentIds.map((attId) => documentsApi.removeAttachment(doc.id, attId)))
      if (files.length) await documentsApi.uploadAttachments(doc.id, files)
      return doc
    },
    onSettled: invalidate,
  })
}

export function useVerifyDocument(applicantId: ID) {
  const invalidate = useInvalidateDocuments(applicantId)
  return useMutation({
    mutationFn: ({ id, ...payload }: VerifyDocumentPayload & { id: ID }) => documentsApi.verify(id, payload),
    onSuccess: invalidate,
  })
}

export function useDeleteDocument(applicantId: ID) {
  const invalidate = useInvalidateDocuments(applicantId)
  return useMutation({ mutationFn: documentsApi.remove, onSuccess: invalidate })
}
