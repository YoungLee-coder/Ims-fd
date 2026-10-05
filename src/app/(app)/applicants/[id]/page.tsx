import type { Metadata } from "next"
import { Suspense } from "react"

import { ApplicantDetail } from "@/features/applicants/applicant-detail"
import { RequirePermission } from "@/features/auth/require-permission"
import { getT } from "@/lib/i18n/server"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return { title: t("档案详情") }
}

export default async function ApplicantPage({ params }: PageProps<"/applicants/[id]">) {
  const { id } = await params
  return (
    <RequirePermission anyOf="applicant.read">
      <Suspense>
        <ApplicantDetail id={id} />
      </Suspense>
    </RequirePermission>
  )
}
