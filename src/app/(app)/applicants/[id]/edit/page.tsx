import type { Metadata } from "next"

import { EditApplicant } from "@/features/applicants/edit-applicant"
import { RequirePermission } from "@/features/auth/require-permission"
import { getT } from "@/lib/i18n/server"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return { title: t("编辑档案") }
}

export default async function EditApplicantPage({ params }: PageProps<"/applicants/[id]/edit">) {
  const { id } = await params
  return (
    <RequirePermission anyOf="applicant.update">
      <EditApplicant id={id} />
    </RequirePermission>
  )
}
