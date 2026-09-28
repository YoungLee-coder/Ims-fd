import type { Metadata } from "next"

import { AuditLogList } from "@/features/audit/audit-log-list"
import { RequirePermission } from "@/features/auth/require-permission"

export const metadata: Metadata = { title: "审计日志" }

export default function AuditPage() {
  return (
    <RequirePermission anyOf={["user.read", "role.read"]}>
      <AuditLogList />
    </RequirePermission>
  )
}
