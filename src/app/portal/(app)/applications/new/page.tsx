import type { Metadata } from "next"
import { Suspense } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { ApplicationWizard } from "@/features/portal/application-wizard"

export const metadata: Metadata = { title: "新建申请" }

export default function NewApplicationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6" aria-busy="true" aria-label="正在加载">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      }
    >
      <ApplicationWizard />
    </Suspense>
  )
}
