import type { Metadata } from "next"

import { PortalLoginForm } from "@/features/portal/login-form"

export const metadata: Metadata = { title: "申请人登录" }

export default function PortalLoginPage() {
  return <PortalLoginForm />
}
