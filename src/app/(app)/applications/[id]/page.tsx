import type { Metadata } from "next"

import { StaffApplicationDetail } from "@/features/applications/staff-application-detail"
import { RequirePermission } from "@/features/auth/require-permission"

export const metadata: Metadata = { title: "申请详情" }

export default async function StaffApplicationPage({ params }: PageProps<"/applications/[id]">) {
  const { id } = await params
  return (
    <RequirePermission anyOf="applicant.read">
      <StaffApplicationDetail id={id} />
    </RequirePermission>
  )
}
