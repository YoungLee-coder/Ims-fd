import type { Metadata } from "next"

import { ApplicationDetail } from "@/features/portal/application-detail"
import { getT } from "@/lib/i18n/server"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return { title: t("申请详情") }
}

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ApplicationDetail id={id} />
}
