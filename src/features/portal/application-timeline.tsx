import { CheckIcon, MinusIcon, XIcon } from "lucide-react"

import { ApplicationStatusBadge } from "@/components/status-badges"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { ApplicationStatus, ApplicationTimelineEntry } from "@/types"

/** 最新一条按办理结果着色：通过、驳回、撤回一眼可辨，其余沿用主色。 */
const LATEST_TONE: Partial<Record<ApplicationStatus, string>> = {
  approved: "border-success bg-success text-success-foreground",
  rejected: "border-destructive bg-destructive text-white",
  withdrawn: "border-muted-foreground/50 bg-muted-foreground/50 text-background",
}

const ICONS: Partial<Record<ApplicationStatus, typeof CheckIcon>> = {
  rejected: XIcon,
  withdrawn: MinusIcon,
}

/** 办理进度：按时间倒序展示，最新一条高亮。 */
export function ApplicationTimeline({ timeline }: { timeline: ApplicationTimelineEntry[] }) {
  const entries = [...timeline].sort((a, b) => b.at.localeCompare(a.at))

  return (
    <ol className="flex flex-col">
      {entries.map((entry, index) => {
        const latest = index === 0
        const last = index === entries.length - 1
        const Icon = (latest && ICONS[entry.status]) || CheckIcon
        return (
          <li key={`${entry.status}-${entry.at}`} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span
                aria-hidden
                className={cn(
                  "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border",
                  latest
                    ? (LATEST_TONE[entry.status] ?? "border-primary bg-primary text-primary-foreground")
                    : "border-border bg-muted text-muted-foreground"
                )}
              >
                <Icon className="size-3.5" />
              </span>
              {!last && <span aria-hidden className="w-px flex-1 bg-border" />}
            </div>
            <div className={cn("flex flex-col gap-1.5", !last && "pb-6")}>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <ApplicationStatusBadge status={entry.status} />
                <span className="text-xs text-muted-foreground tabular-nums">{formatDateTime(entry.at)}</span>
                {entry.actor && <span className="text-xs text-muted-foreground">· {entry.actor}</span>}
              </div>
              <p className="max-w-[60ch] text-sm">{entry.note}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
