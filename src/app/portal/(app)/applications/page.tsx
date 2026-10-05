import type { Metadata } from "next"

import { ApplicationList } from "@/features/portal/application-list"
import { getT } from "@/lib/i18n/server"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return { title: t("我的申请") }
}

export default function PortalApplicationsPage() {
  return <ApplicationList />
}
