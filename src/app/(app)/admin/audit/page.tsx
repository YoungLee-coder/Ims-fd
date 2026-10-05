import type { Metadata } from "next"

import { AuditLogList } from "@/features/audit/audit-log-list"
import { RequirePermission } from "@/features/auth/require-permission"
import { getT } from "@/lib/i18n/server"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return { title: t("审计日志") }
}

export default function AuditPage() {
  return (
    <RequirePermission anyOf={["user.read", "role.read"]}>
      <AuditLogList />
    </RequirePermission>
  )
}
