import type { Metadata } from "next"

import { PageHeader } from "@/components/page-header"
import { ApplicantForm } from "@/features/applicants/applicant-form"
import { RequirePermission } from "@/features/auth/require-permission"
import { getT } from "@/lib/i18n/server"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return { title: t("新建档案") }
}

export default async function NewApplicantPage() {
  const t = await getT()
  return (
    <RequirePermission anyOf="applicant.create">
      <PageHeader
        title={t("新建档案")}
        description={t("档案编号将在保存后由系统生成。证件信息可在建档后补充登记。")}
        className="mb-10"
      />
      <ApplicantForm />
    </RequirePermission>
  )
}
