"use client"

import { CheckIcon, XIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { APPLICATION_STATUS_LABELS, APPROVAL_LEVEL_LABELS, DECISION_ACTION_LABELS } from "@/lib/constants"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import { progressStage, stoppedStage, type ProgressStage } from "@/features/applications/workflow"
import type { Application, ApplicationDecisionAction, ApprovalRecord } from "@/types"
import { useT } from "@/lib/i18n/client"

const STAGES: { stage: ProgressStage; label: string }[] = [
  { stage: "intake", label: "受理" },
  { stage: "first_review", label: "初审" },
  { stage: "final_review", label: "终审" },
  { stage: "done", label: "办结" },
]

type BadgeVariant = React.ComponentProps<typeof Badge>["variant"]

const ACTION_VARIANT: Record<ApplicationDecisionAction, BadgeVariant> = {
  start_review: "outline",
  pass_first_review: "default",
  return_to_first_review: "warning",
  request_supplement: "warning",
  approve: "success",
  reject: "destructive",
}

/**
 * 受理 → 初审 → 终审 → 办结 四格进度。
 * 驳回 / 撤回的申请标出停下的那一格，之后的格子留空，最后一格写明结果，不再显示成全部完成。
 */
export function ApprovalProgress({ application }: { application: Application }) {
  const t = useT()
  const stopped = stoppedStage(application)
  const current = STAGES.findIndex((item) => item.stage === (stopped ?? progressStage(application)))
  const rejected = application.status === "rejected"

  return (
    <ol className="grid grid-cols-4 gap-2" aria-label={t("审批进度")}>
      {STAGES.map((item, index) => {
        const halted = !!stopped && index === current
        const done = !halted && (index < current || (!stopped && item.stage === "done" && index === current))
        const active = !stopped && index === current && !done
        const outcome = !!stopped && item.stage === "done"
        return (
          <li key={item.stage} className="flex flex-col gap-2" aria-current={active || halted ? "step" : undefined}>
            <span
              aria-hidden
              className={cn(
                "h-1.5 rounded-full",
                done
                  ? "bg-primary"
                  : active
                    ? "bg-primary/50"
                    : halted
                      ? rejected
                        ? "bg-destructive"
                        : "bg-muted-foreground/40"
                      : "bg-muted"
              )}
            />
            <span
              className={cn(
                "flex items-center gap-1 text-xs",
                done || active ? "font-medium text-foreground" : "text-muted-foreground",
                halted && "font-medium",
                halted && rejected && "text-destructive"
              )}
            >
              {done && <CheckIcon className="size-3" />}
              {halted && rejected && <XIcon className="size-3" />}
              {outcome ? t(APPLICATION_STATUS_LABELS[application.status]) : t(item.label)}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/** 审批意见记录：最新在上，每条写明层级、决定、审批人、时间与意见。 */
export function ApprovalHistory({ records }: { records: ApprovalRecord[] }) {
  const t = useT()

  if (records.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("尚无审批意见。")}</p>
  }

  const entries = [...records].sort((a, b) => b.at.localeCompare(a.at))
  return (
    <ul className="flex flex-col divide-y">
      {entries.map((record) => (
        <li key={record.id} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {record.level && <Badge variant="secondary">{t(APPROVAL_LEVEL_LABELS[record.level])}</Badge>}
            <Badge variant={ACTION_VARIANT[record.action]}>{t(DECISION_ACTION_LABELS[record.action])}</Badge>
            <span className="text-xs text-muted-foreground">
              {record.actorName} · <span className="tabular-nums">{formatDateTime(record.at)}</span>
            </span>
          </div>
          <p className={cn("max-w-[60ch] text-sm break-words", !record.note && "text-muted-foreground")}>
            {record.note || t("未填写意见")}
          </p>
        </li>
      ))}
    </ul>
  )
}
