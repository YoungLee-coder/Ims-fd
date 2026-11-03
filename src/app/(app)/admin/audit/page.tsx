import type { Metadata } from "next"
import { Suspense } from "react"

import { AuditLogList } from "@/features/audit/audit-log-list"
import { AUDIT_PERMISSIONS } from "@/features/audit/labels"
import { RequirePermission } from "@/features/auth/require-permission"
import { getT } from "@/lib/i18n/server"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return { title: t("审计日志") }
}

export default function AuditPage() {
  return (
    <RequirePermission anyOf={AUDIT_PERMISSIONS}>
      <Suspense>
        <AuditLogList />
      </Suspense>
    </RequirePermission>
  )
}
