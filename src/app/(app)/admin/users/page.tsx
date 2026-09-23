import type { Metadata } from "next"
import { Suspense } from "react"

import { RequirePermission } from "@/features/auth/require-permission"
import { UserList } from "@/features/users/user-list"

export const metadata: Metadata = { title: "用户管理" }

export default function UsersPage() {
  return (
    <RequirePermission anyOf={["user.read", "user.manage"]}>
      <Suspense>
        <UserList />
      </Suspense>
    </RequirePermission>
  )
}
