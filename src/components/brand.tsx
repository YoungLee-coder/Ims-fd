"use client"

import { cn } from "@/lib/utils"
import { appConfig } from "@/lib/config"
import { useT } from "@/lib/i18n/client"

/** 机构标识占位：上线前替换为正式国徽 / 局徽 SVG。 */
export function AgencyMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-current/40 font-mono text-[0.6rem] font-semibold tracking-[0.12em]",
        "before:absolute before:inset-[3px] before:rounded-full before:border before:border-current/25",
        className
      )}
    >
      {appConfig.systemCode}
    </span>
  )
}

export function AgencyLockup({ className, compact = false }: { className?: string; compact?: boolean }) {
  const t = useT()
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <AgencyMark />
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-sm font-semibold">{t(appConfig.agencyName)}</span>
        {!compact && (
          <span lang="en" className="truncate text-[0.7rem] tracking-wide opacity-70">
            {appConfig.agencyNameEn}
          </span>
        )}
      </div>
    </div>
  )
}
