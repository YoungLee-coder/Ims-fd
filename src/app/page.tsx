import { redirect } from "next/navigation"

import { PORTAL_BASE_PATH } from "@/lib/config"

export default function Home() {
  redirect(PORTAL_BASE_PATH)
}
