import type { Metadata } from "next"

import { RegisterForm } from "@/features/auth/register-form"

export const metadata: Metadata = { title: "申请账号" }

export default function RegisterPage() {
  return <RegisterForm />
}
