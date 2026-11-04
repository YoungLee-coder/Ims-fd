"use client"

import { ErrorState } from "@/components/error-state"

export default function RootError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main id="main-content" className="flex flex-1 items-center justify-center p-6">
      <ErrorState error={error} retry={retry} />
    </main>
  )
}
