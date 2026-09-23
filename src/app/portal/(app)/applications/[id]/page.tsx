import type { Metadata } from "next"

import { ApplicationDetail } from "@/features/portal/application-detail"

export const metadata: Metadata = { title: "申请详情" }

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ApplicationDetail id={id} />
}
