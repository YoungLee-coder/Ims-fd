"use client"

import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CircleAlertIcon, FileIcon, UploadIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { applyFieldErrors, SelectField, TextField } from "@/components/form/fields"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Spinner } from "@/components/ui/spinner"
import { ApiError, errorMessage } from "@/lib/api/client"
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_MAX_BYTES,
  COUNTRIES,
  DOCUMENT_TYPE_LABELS,
} from "@/lib/constants"
import { formatFileSize } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useSaveDocument } from "@/features/documents/api"
import {
  documentSchema,
  NO_EXPIRY_TYPES,
  toDocumentFormValues,
  toDocumentPayload,
  type DocumentFormValues,
} from "@/features/documents/schema"
import type { Applicant, ID, IdentityDocument } from "@/types"
import { useT } from "@/lib/i18n/client"

const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png"]

export function DocumentSheet({
  applicant,
  document,
  open,
  onOpenChange,
}: {
  applicant: Applicant
  document?: IdentityDocument
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useT()
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overscroll-contain data-[side=right]:sm:max-w-lg">
        <SheetHeader className="border-b">
          <SheetTitle>{document ? t("编辑证件") : t("登记证件")}</SheetTitle>
          <SheetDescription>
            {applicant.surname} {applicant.givenNames} · <span className="doc-number">{applicant.fileNo}</span>
          </SheetDescription>
        </SheetHeader>
        {open && (
          <DocumentForm
            key={document?.id ?? "new"}
            applicant={applicant}
            document={document}
            onDone={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

function DocumentForm({
  applicant,
  document,
  onDone,
}: {
  applicant: Applicant
  document?: IdentityDocument
  onDone: () => void
}) {
  const t = useT()
  const save = useSaveDocument(applicant.id)
  const [files, setFiles] = useState<File[]>([])
  const [removed, setRemoved] = useState<ID[]>([])
  const [fileError, setFileError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const form = useForm<DocumentFormValues>({
    resolver: zodResolver(documentSchema),
    defaultValues: toDocumentFormValues(document),
  })
  const type = useWatch({ control: form.control, name: "type" })
  const noExpiry = !!type && (NO_EXPIRY_TYPES as readonly string[]).includes(type)

  function addFiles(list: FileList | null) {
    if (!list) return
    const accepted: File[] = []
    const rejected: string[] = []
    for (const file of Array.from(list)) {
      if (!ACCEPTED_TYPES.includes(file.type)) rejected.push(t("{name}：格式不支持", { name: file.name }))
      else if (file.size > ATTACHMENT_MAX_BYTES) rejected.push(t("{name}：超过 10 MB", { name: file.name }))
      else accepted.push(file)
    }
    setFiles((prev) => [...prev, ...accepted])
    setFileError(rejected.length ? rejected.join(t("；")) : null)
  }

  function onSubmit(values: DocumentFormValues) {
    save.mutate(
      { id: document?.id, payload: toDocumentPayload(values), files, removedAttachmentIds: removed },
      {
        onSuccess: () => {
          toast.success(document ? t("证件信息已更新，需重新核验") : t("证件已登记，等待核验"))
          onDone()
        },
        onError: (error) => {
          if (error instanceof ApiError) applyFieldErrors(error.fieldErrors, form.setError)
        },
      }
    )
  }

  const existing = document?.attachments.filter((a) => !removed.includes(a.id)) ?? []

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <FieldGroup>
          {save.isError && (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertTitle>{t("保存失败")}</AlertTitle>
              <AlertDescription>{errorMessage(save.error)}</AlertDescription>
            </Alert>
          )}
          {document?.verification === "verified" && (
            <Alert>
              <CircleAlertIcon />
              <AlertDescription>{t("该证件已核验。修改信息后，核验状态将重置为“待核验”。")}</AlertDescription>
            </Alert>
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField
              control={form.control}
              name="type"
              label={t("证件类型")}
              required
              options={Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
            />
            <TextField
              control={form.control}
              name="number"
              label={t("证件号码")}
              required
              autoComplete="off"
              spellCheck={false}
              className="[&_input]:doc-number [&_input]:uppercase"
            />
          </div>
          <SelectField
            control={form.control}
            name="issuingCountry"
            label={t("签发国家")}
            required
            options={COUNTRIES.map((c) => ({ value: c.code, label: `${t(c.name)} (${c.code})` }))}
          />
          <TextField control={form.control} name="issuingAuthority" label={t("签发机关")} required />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField control={form.control} name="issueDate" label={t("签发日期")} type="date" required />
            <TextField
              control={form.control}
              name="expiryDate"
              label={t("有效期至")}
              type="date"
              required={!noExpiry}
              description={noExpiry ? t("此类证件可留空，表示长期有效") : undefined}
            />
          </div>

          <Field>
            <FieldLabel htmlFor="attachments">{t("扫描件")}</FieldLabel>
            <label
              htmlFor="attachments"
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
                dragging && "border-primary bg-accent"
              )}
            >
              <UploadIcon className="size-5 text-muted-foreground" />
              <span className="text-sm font-medium">{t("点击选择或拖入文件")}</span>
              <span className="text-xs text-muted-foreground">{t("PDF、JPG、PNG，单个不超过 10 MB")}</span>
              <input
                id="attachments"
                type="file"
                multiple
                accept={ATTACHMENT_ACCEPT}
                className="sr-only"
                onChange={(e) => {
                  addFiles(e.target.files)
                  e.target.value = ""
                }}
              />
            </label>
            {fileError && <FieldDescription className="text-destructive">{fileError}</FieldDescription>}

            {(existing.length > 0 || files.length > 0) && (
              <ul className="flex flex-col divide-y rounded-lg border">
                {existing.map((a) => (
                  <AttachmentRow
                    key={a.id}
                    name={a.fileName}
                    size={a.size}
                    onRemove={() => setRemoved((r) => [...r, a.id])}
                  />
                ))}
                {files.map((f, i) => (
                  <AttachmentRow
                    key={`${f.name}-${i}`}
                    name={f.name}
                    size={f.size}
                    pending
                    onRemove={() => setFiles((list) => list.filter((_, j) => j !== i))}
                  />
                ))}
              </ul>
            )}
          </Field>
        </FieldGroup>
      </div>

      <SheetFooter className="flex-row justify-end border-t">
        <Button type="button" variant="outline" onClick={onDone}>
          {t("取消")}
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending && <Spinner data-icon="inline-start" />}
          {document ? t("保存修改") : t("登记证件")}
        </Button>
      </SheetFooter>
    </form>
  )
}

function AttachmentRow({
  name,
  size,
  pending,
  onRemove,
}: {
  name: string
  size: number
  pending?: boolean
  onRemove: () => void
}) {
  const t = useT()
  return (
    <li className="flex items-center gap-3 px-3 py-2 text-sm">
      <FileIcon className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate">{name}</span>
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
        {pending ? t("待上传 · ") : ""}
        {formatFileSize(size)}
      </span>
      <Button type="button" variant="ghost" size="icon-xs" onClick={onRemove} aria-label={t("移除 {name}", { name })}>
        <XIcon />
      </Button>
    </li>
  )
}
