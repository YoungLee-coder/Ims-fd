import type { Metadata } from "next"
import { Suspense } from "react"

import { ApplicantList } from "@/features/applicants/applicant-list"
import { RequirePermission } from "@/features/auth/require-permission"

export const metadata: Metadata = { title: "申请人档案" }

export default function ApplicantsPage() {
  return (
    <RequirePermission anyOf="applicant.read">
      <Suspense>
        <ApplicantList />
      </Suspense>
    </RequirePermission>
  )
}
