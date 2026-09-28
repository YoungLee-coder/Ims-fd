import type { Metadata } from "next"
import { Suspense } from "react"

import { ApplicationInbox } from "@/features/applications/application-inbox"
import { RequirePermission } from "@/features/auth/require-permission"

export const metadata: Metadata = { title: "申请受理" }

export default function ApplicationsPage() {
  return (
    <RequirePermission anyOf="applicant.read">
      <Suspense>
        <ApplicationInbox />
      </Suspense>
    </RequirePermission>
  )
}
