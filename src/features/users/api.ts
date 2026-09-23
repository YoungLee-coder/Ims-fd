import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api/client"
import { endpoints } from "@/lib/api/endpoints"
import type {
  CreateUserPayload,
  ID,
  ListQuery,
  Paginated,
  UpdateUserPayload,
  UpdateUserStatusPayload,
  User,
  UserStatus,
} from "@/types"

export interface UserQuery extends ListQuery {
  status?: UserStatus
}

export const userKeys = {
  all: ["users"] as const,
  list: (q: UserQuery) => ["users", "list", q] as const,
}

export const usersApi = {
  list: (q: UserQuery) => api.get<Paginated<User>>(endpoints.users.list, { ...q }),
  create: (payload: CreateUserPayload) => api.post<User>(endpoints.users.list, payload),
  update: (id: ID, payload: UpdateUserPayload) => api.patch<User>(endpoints.users.detail(id), payload),
  setStatus: (id: ID, payload: UpdateUserStatusPayload) => api.put<User>(endpoints.users.status(id), payload),
}

export function useUsers(q: UserQuery) {
  return useQuery({
    queryKey: userKeys.list(q),
    queryFn: () => usersApi.list(q),
    placeholderData: keepPreviousData,
  })
}

function useInvalidateUsers() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: userKeys.all })
    qc.invalidateQueries({ queryKey: ["roles"] })
    qc.invalidateQueries({ queryKey: ["dashboard"] })
  }
}

export function useCreateUser() {
  const invalidate = useInvalidateUsers()
  return useMutation({ mutationFn: usersApi.create, onSuccess: invalidate })
}

export function useUpdateUser() {
  const invalidate = useInvalidateUsers()
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateUserPayload & { id: ID }) => usersApi.update(id, payload),
    onSuccess: invalidate,
  })
}

export function useSetUserStatus() {
  const invalidate = useInvalidateUsers()
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateUserStatusPayload & { id: ID }) => usersApi.setStatus(id, payload),
    onSuccess: invalidate,
  })
}
