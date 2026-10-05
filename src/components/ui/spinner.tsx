"use client"

import { cn } from "cn"
import { Loader2Icon } from "lucide-react"

import { useT } from "@/lib/i18n/client"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  const t = useT()
  return (
    <Loader2Icon data-slot="spinner" role="status" aria-label={t("加载中")} className={cn("size-4 animate-spin", className)} {...props} />
  )
}

export { Spinner }
