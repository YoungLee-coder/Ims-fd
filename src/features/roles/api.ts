import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api/client"
import { endpoints } from "@/lib/api/endpoints"
import { authKeys } from "@/features/auth/api"
import type { ID, Permission, Role, RolePayload } from "@/types"

export const roleKeys = {
  all: ["roles"] as const,
  permissions: ["permissions"] as const,
}

export const rolesApi = {
  list: () => api.get<Role[]>(endpoints.roles.list),
  create: (payload: RolePayload) => api.post<Role>(endpoints.roles.list, payload),
  update: (id: ID, payload: RolePayload) => api.put<Role>(endpoints.roles.detail(id), payload),
  remove: (id: ID) => api.delete(endpoints.roles.detail(id)),
  permissions: () => api.get<Permission[]>(endpoints.permissions.list),
}

export function useRoles() {
  return useQuery({ queryKey: roleKeys.all, queryFn: rolesApi.list })
}

export function usePermissions() {
  return useQuery({ queryKey: roleKeys.permissions, queryFn: rolesApi.permissions, staleTime: Infinity })
}

function useInvalidateRoles() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: roleKeys.all })
    qc.invalidateQueries({ queryKey: ["users"] })
    qc.invalidateQueries({ queryKey: authKeys.me })
  }
}

export function useSaveRole() {
  const invalidate = useInvalidateRoles()
  return useMutation({
    mutationFn: ({ id, ...payload }: RolePayload & { id?: ID }) =>
      id ? rolesApi.update(id, payload) : rolesApi.create(payload),
    onSuccess: invalidate,
  })
}

export function useDeleteRole() {
  const invalidate = useInvalidateRoles()
  return useMutation({ mutationFn: rolesApi.remove, onSuccess: invalidate })
}
