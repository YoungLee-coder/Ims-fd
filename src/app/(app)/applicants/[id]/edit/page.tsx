import type { Metadata } from "next"

import { EditApplicant } from "@/features/applicants/edit-applicant"
import { RequirePermission } from "@/features/auth/require-permission"

export const metadata: Metadata = { title: "编辑档案" }

export default async function EditApplicantPage({ params }: PageProps<"/applicants/[id]/edit">) {
  const { id } = await params
  return (
    <RequirePermission anyOf="applicant.update">
      <EditApplicant id={id} />
    </RequirePermission>
  )
}
