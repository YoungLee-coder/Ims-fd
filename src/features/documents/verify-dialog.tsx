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
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { errorMessage } from "@/lib/api/client"
import { DOCUMENT_TYPE_LABELS } from "@/lib/constants"
import { useVerifyDocument } from "@/features/documents/api"
import type { IdentityDocument } from "@/types"
import { useT } from "@/lib/i18n/client"

type Decision = "verified" | "rejected"

export function VerifyDialog({
  document,
  onOpenChange,
}: {
  document: IdentityDocument | null
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={!!document} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {document && <VerifyForm key={document.id} document={document} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function VerifyForm({ document, onDone }: { document: IdentityDocument; onDone: () => void }) {
  const t = useT()
  const verify = useVerifyDocument(document.applicantId)
  const [decision, setDecision] = useState<Decision>("verified")
  const [note, setNote] = useState("")
  const needsNote = decision === "rejected" && !note.trim()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (needsNote) return
    verify.mutate(
      { id: document.id, verification: decision, note: note.trim() },
      {
        onSuccess: () => {
          toast.success(decision === "verified" ? t("已标记为核验通过") : t("已驳回该证件"))
          onDone()
        },
        onError: (error) => toast.error(errorMessage(error)),
      }
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>{t("核验{type}", { type: t(DOCUMENT_TYPE_LABELS[document.type]) })}</DialogTitle>
        <DialogDescription>
          {t("请核对原件或扫描件与登记信息一致：")}
          <span className="doc-number text-foreground">{document.number}</span>
        </DialogDescription>
      </DialogHeader>

      <FieldGroup>
        <Field>
          <FieldLabel id="decision-label">{t("核验结论")}</FieldLabel>
          <ToggleGroup
            type="single"
            variant="outline"
            spacing={0}
            value={decision}
            onValueChange={(v) => v && setDecision(v as Decision)}
            aria-labelledby="decision-label"
          >
            <ToggleGroupItem value="verified" className="px-4">
              {t("核验通过")}
            </ToggleGroupItem>
            <ToggleGroupItem value="rejected" className="px-4">
              {t("驳回")}
            </ToggleGroupItem>
          </ToggleGroup>
        </Field>
        <Field>
          <FieldLabel htmlFor="verify-note">
            {t("核验意见")}
            {decision === "rejected" && (
              <span aria-hidden className="text-destructive">
                *
              </span>
            )}
          </FieldLabel>
          <Textarea
            id="verify-note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={decision === "rejected" ? t("说明驳回原因，将展示给经办人员") : t("可选")}
            aria-required={decision === "rejected"}
          />
          <FieldDescription>{t("核验结论和意见会记录你的姓名与操作时间。")}</FieldDescription>
        </Field>
      </FieldGroup>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t("取消")}
        </Button>
        <Button
          type="submit"
          variant={decision === "rejected" ? "destructive" : "default"}
          disabled={verify.isPending || needsNote}
        >
          {verify.isPending && <Spinner data-icon="inline-start" />}
          {decision === "verified" ? t("确认通过") : t("确认驳回")}
        </Button>
      </DialogFooter>
    </form>
  )
}
