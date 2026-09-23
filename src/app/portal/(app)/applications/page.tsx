import type { Metadata } from "next"

import { ApplicationList } from "@/features/portal/application-list"

export const metadata: Metadata = { title: "我的申请" }

export default function PortalApplicationsPage() {
  return <ApplicationList />
}
