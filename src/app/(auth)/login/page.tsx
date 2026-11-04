import type { Metadata } from "next"
import { cookies } from "next/headers"
import { Suspense } from "react"

import { LoginForm } from "@/features/auth/login-form"
import { PORTAL_SESSION_COOKIE } from "@/lib/config"
import { getT } from "@/lib/i18n/server"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return { title: t("登录") }
}

export default async function LoginPage() {
  const signedInAsApplicant = (await cookies()).has(PORTAL_SESSION_COOKIE)
  return (
    <Suspense>
      <LoginForm signedInAsApplicant={signedInAsApplicant} />
    </Suspense>
  )
}
