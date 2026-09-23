import type { Metadata } from "next"
import { Suspense } from "react"

import { ApplicantDetail } from "@/features/applicants/applicant-detail"
import { RequirePermission } from "@/features/auth/require-permission"

export const metadata: Metadata = { title: "档案详情" }

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
