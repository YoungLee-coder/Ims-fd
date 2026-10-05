import type { Metadata } from "next"

import { RegisterForm } from "@/features/auth/register-form"
import { getT } from "@/lib/i18n/server"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return { title: t("申请账号") }
}

export default function RegisterPage() {
  return <RegisterForm />
}
