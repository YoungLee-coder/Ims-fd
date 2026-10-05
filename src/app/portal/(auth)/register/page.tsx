import type { Metadata } from "next"

import { PortalRegisterForm } from "@/features/portal/register-form"
import { getT } from "@/lib/i18n/server"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return { title: t("注册申请人账号") }
}

export default function PortalRegisterPage() {
  return <PortalRegisterForm />
}
