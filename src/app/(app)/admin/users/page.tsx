import type { Metadata } from "next"
import { Suspense } from "react"

import { RequirePermission } from "@/features/auth/require-permission"
import { UserList } from "@/features/users/user-list"
import { getT } from "@/lib/i18n/server"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return { title: t("用户管理") }
}

export default function UsersPage() {
  return (
    <RequirePermission anyOf={["user.read", "user.manage"]}>
      <Suspense>
        <UserList />
      </Suspense>
    </RequirePermission>
  )
}
