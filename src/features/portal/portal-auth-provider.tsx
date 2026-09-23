"use client"

import { createContext, useCallback, useContext, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"

import { clearPortalSession } from "@/lib/api/session"
import { portalAuthApi, portalAuthKeys } from "@/features/portal/api"
import type { ApplicantAccount } from "@/types"

interface PortalAuthContextValue {
  account: ApplicantAccount
  logout: () => Promise<void>
}

const PortalAuthContext = createContext<PortalAuthContextValue | null>(null)

export function PortalAuthProvider({
  account,
  children,
}: {
  account: ApplicantAccount
  children: React.ReactNode
}) {
  const queryClient = useQueryClient()
  const router = useRouter()

  const logout = useCallback(async () => {
    await portalAuthApi.logout().catch(() => undefined)
    clearPortalSession()
    queryClient.removeQueries({ queryKey: portalAuthKeys.me })
    queryClient.removeQueries({ queryKey: ["portal", "applications"] })
    router.replace("/portal/login")
  }, [queryClient, router])

  const value = useMemo(() => ({ account, logout }), [account, logout])

  return <PortalAuthContext.Provider value={value}>{children}</PortalAuthContext.Provider>
}

export function usePortalAuth() {
  const ctx = useContext(PortalAuthContext)
  if (!ctx) throw new Error("usePortalAuth must be used within PortalAuthProvider")
  return ctx
}
