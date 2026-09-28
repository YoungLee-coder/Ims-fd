"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { errorMessage } from "@/lib/api/client"
import { DECISION_ACTION_LABELS } from "@/lib/constants"
import { useDecideApplication } from "@/features/applications/api"
import type { ApplicationDecisionAction, ID } from "@/types"

const NOTE_REQUIRED = new Set<ApplicationDecisionAction>(["request_supplement", "reject"])

const HINTS: Record<ApplicationDecisionAction, string> = {
  start_review: "受理后申请进入审核。意见可以留空。",
  request_supplement: "请写明需要补交的材料，申请人会在门户看到这段说明。",
  approve: "通过后如果还没有档案，系统会按本申请建立档案，并把护照登记为已核验证件。",
  reject: "请填写驳回理由，申请人会在门户看到。",
}

export function DecisionDialog({
  applicationId,
  action,
  onOpenChange,
}: {
  applicationId: ID
  action: ApplicationDecisionAction | null
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={!!action} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {action && (
          <DecisionForm
            key={action}
            applicationId={applicationId}
            action={action}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function DecisionForm({
  applicationId,
  action,
  onDone,
}: {
  applicationId: ID
  action: ApplicationDecisionAction
  onDone: () => void
}) {
  const decide = useDecideApplication()
  const [note, setNote] = useState("")
  const required = NOTE_REQUIRED.has(action)
  const blocked = required && !note.trim()

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (blocked) return
    decide.mutate(
      { id: applicationId, action, note: note.trim() || undefined },
      {
        onSuccess: (application) => {
          const fileNo = action === "approve" && application.fileNo ? `，档案编号 ${application.fileNo}` : ""
          toast.success(`已${DECISION_ACTION_LABELS[action]}${fileNo}`)
          onDone()
        },
        onError: (error) => toast.error(errorMessage(error)),
      }
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>{DECISION_ACTION_LABELS[action]}</DialogTitle>
        <DialogDescription>{HINTS[action]}</DialogDescription>
      </DialogHeader>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="decision-note">{required ? "说明" : "意见（可选）"}</FieldLabel>
          <Textarea
            id="decision-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={4}
            required={required}
          />
        </Field>
      </FieldGroup>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          取消
        </Button>
        <Button type="submit" disabled={blocked || decide.isPending} variant={action === "reject" ? "destructive" : "default"}>
          {decide.isPending && <Spinner data-icon="inline-start" />}
          确认
        </Button>
      </DialogFooter>
    </form>
  )
}
