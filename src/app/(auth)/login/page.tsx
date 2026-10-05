import type { Metadata } from "next"
import { Suspense } from "react"

import { LoginForm } from "@/features/auth/login-form"
import { getT } from "@/lib/i18n/server"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return { title: t("登录") }
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
