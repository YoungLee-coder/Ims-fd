import { api } from "@/lib/api/client"
import { endpoints } from "@/lib/api/endpoints"
import type { CurrentUser, LoginPayload, LoginResult, RegisterPayload, User } from "@/types"

export const authKeys = {
  me: ["auth", "me"] as const,
}

export const authApi = {
  login: (payload: LoginPayload) => api.post<LoginResult>(endpoints.auth.login, payload),
  register: (payload: RegisterPayload) => api.post<User>(endpoints.auth.register, payload),
  logout: () => api.post<void>(endpoints.auth.logout),
  me: () => api.get<CurrentUser>(endpoints.auth.me),
}
