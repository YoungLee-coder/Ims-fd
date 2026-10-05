import type { Metadata } from "next"
import { Suspense } from "react"

import { ApplicantList } from "@/features/applicants/applicant-list"
import { RequirePermission } from "@/features/auth/require-permission"
import { getT } from "@/lib/i18n/server"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return { title: t("申请人档案") }
}

export default function ApplicantsPage() {
  return (
    <RequirePermission anyOf="applicant.read">
      <Suspense>
        <ApplicantList />
      </Suspense>
    </RequirePermission>
  )
}
