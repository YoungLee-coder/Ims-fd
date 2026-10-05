import type { Metadata } from "next"
import { Suspense } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { ApplicationWizard } from "@/features/portal/application-wizard"
import { getT } from "@/lib/i18n/server"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return { title: t("新建申请") }
}

export default async function NewApplicationPage() {
  const t = await getT()
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6" aria-busy="true" aria-label={t("正在加载")}>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      }
    >
      <ApplicationWizard />
    </Suspense>
  )
}
