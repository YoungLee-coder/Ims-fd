"use client"

import { createContext, useCallback, useContext, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { clearSession } from "@/lib/api/session"
import { authApi, authKeys } from "@/features/auth/api"
import type { CurrentUser, PermissionCode } from "@/types"

interface AuthContextValue {
  user: CurrentUser
  /** 满足任一权限即返回 true */
  can: (permission: PermissionCode | PermissionCode[]) => boolean
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useCurrentUserQuery(enabled = true) {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: authApi.me,
    staleTime: 5 * 60 * 1000,
    retry: false,
    enabled,
  })
}

export function AuthProvider({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const router = useRouter()

  const can = useCallback(
    (permission: PermissionCode | PermissionCode[]) => {
      const required = Array.isArray(permission) ? permission : [permission]
      return required.some((p) => user.permissions.includes(p))
    },
    [user.permissions]
  )

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => undefined)
    clearSession()
    queryClient.clear()
    router.replace("/login")
  }, [queryClient, router])

  const value = useMemo(() => ({ user, can, logout }), [user, can, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
