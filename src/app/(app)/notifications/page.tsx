import type { Metadata } from "next"

import { NotificationCenter } from "@/features/notifications/notification-center"
import { getT } from "@/lib/i18n/server"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return { title: t("通知") }
}

export default function NotificationsPage() {
  return <NotificationCenter realm="staff" />
}
