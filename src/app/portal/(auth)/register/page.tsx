import type { Metadata } from "next"

import { PortalRegisterForm } from "@/features/portal/register-form"

export const metadata: Metadata = { title: "注册申请人账号" }

export default function PortalRegisterPage() {
  return <PortalRegisterForm />
}
