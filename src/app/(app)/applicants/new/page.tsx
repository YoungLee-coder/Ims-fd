import type { Metadata } from "next"

import { PageHeader } from "@/components/page-header"
import { ApplicantForm } from "@/features/applicants/applicant-form"
import { RequirePermission } from "@/features/auth/require-permission"

export const metadata: Metadata = { title: "新建档案" }

export default function NewApplicantPage() {
  return (
    <RequirePermission anyOf="applicant.create">
      <PageHeader title="新建档案" description="档案编号将在保存后由系统生成。证件信息可在建档后补充登记。" className="mb-10" />
      <ApplicantForm />
    </RequirePermission>
  )
}
