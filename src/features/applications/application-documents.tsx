"use client"

import { useState } from "react"
import { FileIcon, ShieldCheckIcon, Trash2Icon, UploadIcon } from "lucide-react"
import { toast } from "sonner"

import { VerificationBadge } from "@/components/status-badges"
import { Badge } from "@/components/ui/badge"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { errorMessage } from "@/lib/api/client"
import { APPLICATION_DOCUMENT_CATEGORY_LABELS, ATTACHMENT_ACCEPT } from "@/lib/constants"
import { formatDateTime, formatFileSize } from "@/lib/format"
import { checkUploads, describeUploadCheck } from "@/lib/upload"
import { cn } from "@/lib/utils"
import { Can } from "@/features/auth/require-permission"
import {
  useApplicationDocuments,
  useRemoveApplicationDocument,
  useUploadApplicationDocuments,
  useVerifyApplicationDocument,
} from "@/features/applications/api"
import { AttachmentList } from "@/features/portal/attachment-list"
import type { Application, ApplicationDocument, ApplicationDocumentCategory, ApplicationStatus } from "@/types"
import { useT } from "@/lib/i18n/client"

/** 已进入受理流程、尚未办结的申请才能代传和核验材料。 */
const EDITABLE_STATUSES: ApplicationStatus[] = ["submitted", "under_review", "supplement_required"]

const CATEGORIES = Object.keys(APPLICATION_DOCUMENT_CATEGORY_LABELS) as ApplicationDocumentCategory[]

/** 未核验通过的材料数；接口不可用时返回 null，不拦审批。 */
export function useUnverifiedDocumentCount(applicationId: string) {
  const { data } = useApplicationDocuments(applicationId)
  return data ? data.filter((doc) => doc.verification !== "verified").length : null
}

export function ApplicationDocuments({ application }: { application: Application }) {
  const t = useT()
  const { data, isPending, isError } = useApplicationDocuments(application.id)
  const [verifying, setVerifying] = useState<ApplicationDocument | null>(null)
  const editable = EDITABLE_STATUSES.includes(application.status)

  if (isPending) return <Skeleton className="h-32 w-full rounded-lg" />

  // 旧版后端没有材料核验接口：只列出申请附件
  if (isError) {
    return <AttachmentList attachments={application.attachments} emptyHint={t("本次申请尚未上传材料。")} />
  }

  const verified = data.filter((doc) => doc.verification === "verified").length
  const rejected = data.filter((doc) => doc.verification === "rejected").length

  return (
    <div className="flex flex-col gap-4">
      {data.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {t("已核验 {verified} / {total} 份", { verified, total: data.length })}
          {rejected > 0 && <span className="text-destructive">{t("，驳回 {count} 份", { count: rejected })}</span>}
        </p>
      )}

      {data.length === 0 ? (
        <AttachmentList attachments={[]} emptyHint={t("本次申请尚未上传材料。")} />
      ) : (
        <ul className="flex flex-col divide-y rounded-lg border">
          {data.map((doc) => (
            <DocumentRow
              key={doc.id}
              applicationId={application.id}
              document={doc}
              editable={editable}
              onVerify={() => setVerifying(doc)}
            />
          ))}
        </ul>
      )}

      {editable && (
        <Can anyOf="document.create">
          <UploadArea applicationId={application.id} existing={data} />
        </Can>
      )}

      <Dialog open={!!verifying} onOpenChange={(open) => !open && setVerifying(null)}>
        <DialogContent className="sm:max-w-md">
          {verifying && (
            <VerifyForm
              key={verifying.id}
              applicationId={application.id}
              document={verifying}
              onDone={() => setVerifying(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DocumentRow({
  applicationId,
  document,
  editable,
  onVerify,
}: {
  applicationId: string
  document: ApplicationDocument
  editable: boolean
  onVerify: () => void
}) {
  const t = useT()
  const remove = useRemoveApplicationDocument(applicationId)
  const removable = editable && document.source === "staff" && document.verification === "pending"

  return (
    <li className="flex flex-col gap-1.5 px-3 py-2.5 text-sm">
      <div className="flex items-center gap-3">
        <FileIcon className="size-4 shrink-0 text-muted-foreground" />
        {document.url && document.url !== "#" ? (
          <a
            href={document.url}
            target="_blank"
            rel="noreferrer"
            className="min-w-0 flex-1 truncate underline-offset-4 hover:underline"
          >
            {document.fileName}
          </a>
        ) : (
          <span className="min-w-0 flex-1 truncate">{document.fileName}</span>
        )}
        <VerificationBadge status={document.verification} />
        {editable && (
          <Can anyOf="document.verify">
            <Button type="button" variant="outline" size="xs" onClick={onVerify}>
              <ShieldCheckIcon data-icon="inline-start" />
              {t("核验")}
            </Button>
          </Can>
        )}
        {removable && (
          <Can anyOf="document.create">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(document.id, {
                  onSuccess: () => toast.success(t("已移除 {fileName}", { fileName: document.fileName })),
                  onError: (error) => toast.error(errorMessage(error)),
                })
              }
              aria-label={t("移除 {fileName}", { fileName: document.fileName })}
            >
              <Trash2Icon />
            </Button>
          </Can>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pl-7 text-xs text-muted-foreground">
        <Badge variant="secondary">{t(APPLICATION_DOCUMENT_CATEGORY_LABELS[document.category])}</Badge>
        <span>{document.source === "staff" ? t("窗口代传") : t("申请人上传")}</span>
        <span className="tabular-nums">· {formatFileSize(document.size)}</span>
        {document.verifiedBy && document.verifiedAt && (
          <span>
            · {document.verifiedBy} <span className="tabular-nums">{formatDateTime(document.verifiedAt)}</span>
          </span>
        )}
      </div>
      {document.verificationNote && (
        <p className={cn("pl-7 text-xs", document.verification === "rejected" && "text-destructive")}>
          {document.verificationNote}
        </p>
      )}
    </li>
  )
}

function UploadArea({ applicationId, existing }: { applicationId: string; existing: ApplicationDocument[] }) {
  const t = useT()
  const upload = useUploadApplicationDocuments(applicationId)
  const [category, setCategory] = useState<ApplicationDocumentCategory>("supporting")
  const [fileError, setFileError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  async function addFiles(list: FileList | null) {
    if (!list) return
    const check = await checkUploads(Array.from(list), { existingNames: existing.map((doc) => doc.fileName) })
    setFileError(describeUploadCheck(t, check))
    if (check.overLimit || check.accepted.length === 0) return
    upload.mutate(
      { category, files: check.accepted },
      {
        onSuccess: (docs) => toast.success(t("已上传 {count} 份材料，等待核验", { count: docs.length })),
        onError: (error) => toast.error(errorMessage(error)),
      }
    )
  }

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="document-category">{t("代传扫描件")}</FieldLabel>
        <Select value={category} onValueChange={(value) => setCategory(value as ApplicationDocumentCategory)}>
          <SelectTrigger id="document-category" className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((item) => (
              <SelectItem key={item} value={item}>
                {t(APPLICATION_DOCUMENT_CATEGORY_LABELS[item])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            addFiles(e.dataTransfer.files)
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-dashed px-4 py-6 text-center transition-colors hover:bg-muted/60 has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
            dragging && "border-primary bg-accent",
            upload.isPending && "pointer-events-none opacity-60"
          )}
        >
          {upload.isPending ? <Spinner className="size-5" /> : <UploadIcon className="size-5 text-muted-foreground" />}
          <span className="text-sm font-medium">{t("点击选择或拖入文件")}</span>
          <span className="text-xs text-muted-foreground">{t("PDF、JPG、PNG，单个不超过 10 MB")}</span>
          <input
            type="file"
            multiple
            accept={ATTACHMENT_ACCEPT}
            className="sr-only"
            disabled={upload.isPending}
            onChange={(e) => {
              addFiles(e.target.files)
              e.target.value = ""
            }}
          />
        </label>
        {fileError ? (
          <FieldDescription className="text-destructive">{fileError}</FieldDescription>
        ) : (
          <FieldDescription>{t("上传前会检查文件格式、内容与大小；代传的材料同样需要核验。")}</FieldDescription>
        )}
      </Field>
    </FieldGroup>
  )
}

type Decision = "verified" | "rejected"

function VerifyForm({
  applicationId,
  document,
  onDone,
}: {
  applicationId: string
  document: ApplicationDocument
  onDone: () => void
}) {
  const t = useT()
  const verify = useVerifyApplicationDocument(applicationId)
  const [decision, setDecision] = useState<Decision>(document.verification === "rejected" ? "rejected" : "verified")
  const [note, setNote] = useState(document.verificationNote)
  const needsNote = decision === "rejected" && !note.trim()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (needsNote) return
    verify.mutate(
      { documentId: document.id, verification: decision, note: note.trim() },
      {
        onSuccess: () => {
          toast.success(decision === "verified" ? t("已标记为核验通过") : t("已驳回该材料"))
          onDone()
        },
        onError: (error) => toast.error(errorMessage(error)),
      }
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>{t("核验材料")}</DialogTitle>
        <DialogDescription className="break-all">
          {t(APPLICATION_DOCUMENT_CATEGORY_LABELS[document.category])} · {document.fileName}
        </DialogDescription>
      </DialogHeader>

      <FieldGroup>
        <Field>
          <FieldLabel id="material-decision-label">{t("核验结论")}</FieldLabel>
          <ToggleGroup
            type="single"
            variant="outline"
            spacing={0}
            value={decision}
            onValueChange={(v) => v && setDecision(v as Decision)}
            aria-labelledby="material-decision-label"
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
          <FieldLabel htmlFor="material-verify-note">
            {t("核验意见")}
            {decision === "rejected" && (
              <span aria-hidden className="text-destructive">
                *
              </span>
            )}
          </FieldLabel>
          <Textarea
            id="material-verify-note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={decision === "rejected" ? t("说明驳回原因，例如扫描不清晰或与申请信息不符") : t("可选")}
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
