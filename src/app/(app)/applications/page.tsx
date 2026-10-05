import type { Metadata } from "next"
import { Suspense } from "react"

import { ApplicationInbox } from "@/features/applications/application-inbox"
import { RequirePermission } from "@/features/auth/require-permission"
import { getT } from "@/lib/i18n/server"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return { title: t("申请受理") }
}

export default function ApplicationsPage() {
  return (
    <RequirePermission anyOf="applicant.read">
      <Suspense>
        <ApplicationInbox />
      </Suspense>
    </RequirePermission>
  )
}
