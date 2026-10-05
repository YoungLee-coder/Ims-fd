import type { Metadata } from "next"

import { RequirePermission } from "@/features/auth/require-permission"
import { RoleManager } from "@/features/roles/role-manager"
import { getT } from "@/lib/i18n/server"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return { title: t("角色与权限") }
}

export default function RolesPage() {
  return (
    <RequirePermission anyOf={["role.read", "role.manage"]}>
      <RoleManager />
    </RequirePermission>
  )
}
