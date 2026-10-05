import type { Metadata } from "next"

import { PortalLoginForm } from "@/features/portal/login-form"
import { getT } from "@/lib/i18n/server"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return { title: t("申请人登录") }
}

export default function PortalLoginPage() {
  return <PortalLoginForm />
}
