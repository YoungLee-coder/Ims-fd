import type { Metadata } from "next"

import { DashboardView } from "@/features/dashboard/dashboard-view"
import { getT } from "@/lib/i18n/server"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return { title: t("工作台") }
}

export default function DashboardPage() {
  return <DashboardView />
}
