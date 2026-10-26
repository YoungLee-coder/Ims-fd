import type { Metadata } from "next"

import { RequirePermission } from "@/features/auth/require-permission"
import { ReportView } from "@/features/reports/report-view"
import { getT } from "@/lib/i18n/server"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return { title: t("报表与统计") }
}

export default function ReportsPage() {
  return (
    <RequirePermission anyOf="applicant.read">
      <ReportView />
    </RequirePermission>
  )
}
