import type { Metadata } from "next"

import { RequirePermission } from "@/features/auth/require-permission"
import { RoleManager } from "@/features/roles/role-manager"

export const metadata: Metadata = { title: "角色与权限" }

export default function RolesPage() {
  return (
    <RequirePermission anyOf={["role.read", "role.manage"]}>
      <RoleManager />
    </RequirePermission>
  )
}
