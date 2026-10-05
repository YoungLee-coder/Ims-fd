"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Controller, useForm, type UseFormReturn } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, CircleAlertIcon, UploadIcon } from "lucide-react"
import { toast } from "sonner"

import { applyFieldErrors, SelectField, TextareaField, TextField } from "@/components/form/fields"
import { PageHeader } from "@/components/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { ApiError, errorMessage } from "@/lib/api/client"
import {
  APPLICATION_TYPE_HINTS,
  APPLICATION_TYPE_LABELS,
  ATTACHMENT_ACCEPT,
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_MAX_COUNT,
  COUNTRIES,
  MARITAL_LABELS,
  SEX_LABELS,
} from "@/lib/constants"
import { formatDate, formatFileSize } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useApplication, useRemoveAttachment, useSaveDraft, useSubmitApplication, useUploadAttachments } from "@/features/portal/api"
import { AttachmentList } from "@/features/portal/attachment-list"
import {
  APPLICATION_TYPES,
  STEP_FIELDS,
  applicationSchema,
  toApplicationFormValues,
  toDraftPayload,
  type ApplicationFormValues,
} from "@/features/portal/schemas"
import type { Attachment, ID, Sex } from "@/types"
import { useT } from "@/lib/i18n/client"

const STEPS = [
  { title: "申请类型", description: "选择业务类型并说明事由" },
  { title: "个人信息", description: "与护照一致的身份信息" },
  { title: "护照信息", description: "现行有效护照的资料" },
  { title: "申请材料", description: "上传支持性文件" },
  { title: "确认提交", description: "核对信息并提交" },
]

const LAST_STEP = STEPS.length - 1
/** 落库步骤：到达材料上传前必须先有草稿 ID */
const PASSPORT_STEP = 2
const MATERIALS_STEP = 3

const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png"]

export function ApplicationWizard() {
  const t = useT()
  const router = useRouter()
  const searchParams = useSearchParams()
  const draftParam = searchParams.get("draft")

  const [draftId, setDraftId] = useState<ID | null>(draftParam)
  const [step, setStep] = useState(0)
  const [stepError, setStepError] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [agreed, setAgreed] = useState(false)
  const [dragging, setDragging] = useState(false)
  const hydrated = useRef(false)

  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: toApplicationFormValues(),
  })

  const draft = useApplication(draftId ?? "")
  const saveDraft = useSaveDraft()
  const submit = useSubmitApplication()
  const upload = useUploadAttachments()
  const removeAttachment = useRemoveAttachment()

  const attachments: Attachment[] = draft.data?.attachments ?? []
  const busy = saveDraft.isPending || submit.isPending

  // 从草稿箱继续填写时，用服务端数据回填表单（只回填一次）
  useEffect(() => {
    if (draftParam && draft.data && !hydrated.current) {
      form.reset(toApplicationFormValues(draft.data))
      hydrated.current = true
    }
  }, [draftParam, draft.data, form])

  useEffect(() => {
    setStepError(null)
  }, [step])

  /** 创建或更新草稿，返回可用的草稿 ID */
  async function persistDraft(): Promise<ID> {
    const payload = toDraftPayload(form.getValues())
    if (draftId) {
      await saveDraft.mutateAsync({ id: draftId, payload })
      return draftId
    }
    const created = await saveDraft.mutateAsync({ payload })
    setDraftId(created.id)
    return created.id
  }

  async function goNext() {
    setStepError(null)
    const fields = STEP_FIELDS[step]
    if (fields.length && !(await form.trigger(fields))) return

    // 护照信息填写完成后落库：材料上传需要一个真实的草稿 ID
    if (step === PASSPORT_STEP || step === MATERIALS_STEP) {
      if (step === MATERIALS_STEP && attachments.length === 0) {
        setStepError(t("请至少上传一份申请材料后再继续。"))
        return
      }
      try {
        await persistDraft()
      } catch {
        // 失败原因由 saveDraft.error 渲染
        return
      }
    }

    setStep((s) => Math.min(s + 1, LAST_STEP))
  }

  function addFiles(list: FileList | null) {
    if (!list || !draftId) return
    const accepted: File[] = []
    const rejected: string[] = []
    for (const file of Array.from(list)) {
      if (!ACCEPTED_TYPES.includes(file.type)) rejected.push(t("{name}：格式不支持", { name: file.name }))
      else if (file.size > ATTACHMENT_MAX_BYTES) rejected.push(t("{name}：超过 10 MB", { name: file.name }))
      else accepted.push(file)
    }
    if (attachments.length + accepted.length > ATTACHMENT_MAX_COUNT) {
      setFileError(t("最多上传 {ATTACHMENT_MAX_COUNT} 份材料", { ATTACHMENT_MAX_COUNT }))
      return
    }
    setFileError(rejected.length ? rejected.join(t("；")) : null)
    if (accepted.length) upload.mutate({ id: draftId, files: accepted })
  }

  async function onSubmit() {
    setStepError(null)
    if (!(await form.trigger())) {
      setStepError(t("部分信息填写有误，请返回对应步骤修改后重新提交。"))
      return
    }
    if (attachments.length === 0) {
      setStep(MATERIALS_STEP)
      setStepError(t("请至少上传一份申请材料后再提交。"))
      return
    }
    if (!agreed) {
      setStepError(t("请先确认信息真实有效后再提交。"))
      return
    }
    try {
      const id = await persistDraft()
      const result = await submit.mutateAsync(id)
      toast.success(t("申请已提交，申请编号 {applicationNo}", { applicationNo: result.applicationNo ?? "" }))
      router.replace(`/portal/applications/${id}`)
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) {
        applyFieldErrors(error.fieldErrors, form.setError)
        // 跳到第一个出错的步骤，避免申请人在确认页反复提交
        const badStep = STEP_FIELDS.findIndex((fields) =>
          fields.some((field) => field in error.fieldErrors!)
        )
        if (badStep >= 0) setStep(badStep)
      }
      setStepError(errorMessage(error))
    }
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title={t("新建申请")}
        description={t("按步骤填写，离开页面后已填内容会保留为草稿，可在“我的申请”中继续填写。")}
        className="mb-6"
      />

      <Stepper step={step} onSelect={(index) => index < step && setStep(index)} />

      <form noValidate onSubmit={(e) => e.preventDefault()} className="mt-6">
        <Card>
          <CardContent className="flex flex-col gap-6 pt-2">
            {saveDraft.isError && (
              <Alert variant="destructive">
                <CircleAlertIcon />
                <AlertTitle>{t("草稿保存失败")}</AlertTitle>
                <AlertDescription>{errorMessage(saveDraft.error)}</AlertDescription>
              </Alert>
            )}

            {stepError && (
              <Alert variant="destructive">
                <CircleAlertIcon />
                <AlertTitle>{t("暂时无法继续")}</AlertTitle>
                <AlertDescription>{stepError}</AlertDescription>
              </Alert>
            )}

            {step === 0 && <TypeStep form={form} />}
            {step === 1 && <PersonalStep form={form} />}
            {step === 2 && <PassportStep form={form} />}
            {step === MATERIALS_STEP && (
              <MaterialsStep
                attachments={attachments}
                uploading={upload.isPending}
                removing={removeAttachment.isPending}
                dragging={dragging}
                fileError={fileError}
                onDragChange={setDragging}
                onAddFiles={addFiles}
                onRemove={(attachmentId) => draftId && removeAttachment.mutate({ id: draftId, attachmentId })}
              />
            )}
            {step === LAST_STEP && (
              <ReviewStep
                values={form.getValues()}
                attachments={attachments}
                agreed={agreed}
                onAgreedChange={setAgreed}
              />
            )}
          </CardContent>
        </Card>

        <div className="sticky bottom-0 mt-4 flex items-center justify-between gap-4 border-t bg-background/95 py-4 backdrop-blur">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || busy}
          >
            <ChevronLeftIcon data-icon="inline-start" />
            {t("上一步")}
          </Button>

          <span className="hidden text-xs text-muted-foreground sm:block">
            {t("第 {step} / {total} 步 · {description}", { step: step + 1, total: STEPS.length, description: t(STEPS[step].description) })}
          </span>

          {step < LAST_STEP ? (
            <Button type="button" onClick={goNext} disabled={busy}>
              {saveDraft.isPending && <Spinner data-icon="inline-start" />}
              {t("下一步")}
              <ChevronRightIcon data-icon="inline-end" />
            </Button>
          ) : (
            <Button type="button" onClick={onSubmit} disabled={busy}>
              {busy && <Spinner data-icon="inline-start" />}
              {t("提交申请")}
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}

/* ---------------- 步骤条 ---------------- */

function Stepper({ step, onSelect }: { step: number; onSelect: (index: number) => void }) {
  const t = useT()
  return (
    <nav aria-label={t("申请步骤")} className="flex flex-col gap-3">
      <Progress value={((step + 1) / STEPS.length) * 100} className="h-1.5" />
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-2">
        {STEPS.map((s, index) => {
          const done = index < step
          const current = index === step
          return (
            <li key={s.title} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onSelect(index)}
                disabled={index >= step}
                aria-current={current ? "step" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                  current && "bg-accent font-medium text-accent-foreground",
                  done && "text-foreground hover:bg-muted",
                  !done && !current && "text-muted-foreground"
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border text-[0.7rem] tabular-nums",
                    current && "border-primary bg-primary text-primary-foreground",
                    done && "border-primary text-primary"
                  )}
                >
                  {done ? <CheckIcon className="size-3" /> : index + 1}
                </span>
                <span className="hidden sm:inline">{t(s.title)}</span>
              </button>
              {index < STEPS.length - 1 && (
                <ChevronRightIcon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/* ---------------- 步骤 1：申请类型 ---------------- */

type StepProps = { form: UseFormReturn<ApplicationFormValues> }

function TypeStep({ form }: StepProps) {
  const t = useT()
  return (
    <FieldSet>
      <FieldLegend>{t("申请类型")}</FieldLegend>
      <FieldGroup>
        <Controller
          control={form.control}
          name="type"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel id="application-type-label">
                {t("业务类型")}
                <span aria-hidden className="text-destructive">
                  *
                </span>
              </FieldLabel>
              <RadioGroup
                value={field.value ?? ""}
                onValueChange={field.onChange}
                aria-labelledby="application-type-label"
                aria-invalid={fieldState.invalid}
                className="grid gap-3 sm:grid-cols-2"
              >
                {APPLICATION_TYPES.map((type) => (
                  <Label
                    key={type}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border p-4 font-normal transition-colors hover:bg-muted/60",
                      field.value === type && "border-primary bg-accent"
                    )}
                  >
                    <RadioGroupItem value={type} className="mt-0.5" />
                    <span className="flex flex-col gap-1">
                      <span className="text-sm font-medium">{APPLICATION_TYPE_LABELS[type]}</span>
                      <span className="text-xs leading-relaxed text-muted-foreground">
                        {APPLICATION_TYPE_HINTS[type]}
                      </span>
                    </span>
                  </Label>
                ))}
              </RadioGroup>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Separator />
        <TextareaField
          control={form.control}
          name="purpose"
          label={t("申请事由")}
          required
          rows={3}
          placeholder={t("请简要说明申请背景与目的，例如：受雇于某公司，合同期两年，申请居留许可延期。")}
          description={t("10–500 字，将用于受理机关初审")}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            control={form.control}
            name="intendedArrivalDate"
            label={t("计划入境日期")}
            type="date"
            required
          />
          <TextField
            control={form.control}
            name="intendedStayDays"
            label={t("拟停留天数")}
            inputMode="numeric"
            required
            placeholder="90"
            description={t("1–3650 天")}
          />
        </div>
      </FieldGroup>
    </FieldSet>
  )
}

/* ---------------- 步骤 2：个人信息 ---------------- */

function PersonalStep({ form }: StepProps) {
  const t = useT()
  return (
    <FieldSet>
      <FieldLegend>{t("个人信息")}</FieldLegend>
      <FieldGroup>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField control={form.control} name="surname" label={t("姓（Surname）")} required autoComplete="off" />
          <TextField control={form.control} name="givenNames" label={t("名（Given names）")} required autoComplete="off" />
        </div>
        <TextField
          control={form.control}
          name="nativeName"
          label={t("原文姓名")}
          description={t("护照上的非拉丁文字姓名，如“田中 陽翔”，没有可留空")}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Controller
            control={form.control}
            name="sex"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel id="portal-sex-label">
                  {t("性别")}
                  <span aria-hidden className="text-destructive">
                    *
                  </span>
                </FieldLabel>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  spacing={0}
                  value={field.value ?? ""}
                  onValueChange={(v) => v && field.onChange(v as Sex)}
                  aria-labelledby="portal-sex-label"
                  aria-invalid={fieldState.invalid}
                >
                  {(Object.keys(SEX_LABELS) as Sex[]).map((sex) => (
                    <ToggleGroupItem key={sex} value={sex} className="px-4">
                      {SEX_LABELS[sex]}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <TextField control={form.control} name="dateOfBirth" label={t("出生日期")} type="date" required />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField control={form.control} name="placeOfBirth" label={t("出生地")} required />
          <SelectField
            control={form.control}
            name="nationality"
            label={t("国籍")}
            required
            options={COUNTRIES.map((c) => ({ value: c.code, label: `${t(c.name)} (${c.code})` }))}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            control={form.control}
            name="maritalStatus"
            label={t("婚姻状况")}
            required
            options={Object.entries(MARITAL_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <TextField control={form.control} name="occupation" label={t("职业")} />
        </div>
        <Separator />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField control={form.control} name="phone" label={t("联系电话")} type="tel" required placeholder="+81 90 1234 5678" />
          <TextField control={form.control} name="email" label={t("电子邮箱")} type="email" required />
        </div>
        <TextField
          control={form.control}
          name="address"
          label={t("境内居住地址")}
          description={t("入境后拟居住的地址，尚未确定可留空并在补件时补充")}
        />
      </FieldGroup>
    </FieldSet>
  )
}

/* ---------------- 步骤 3：护照信息 ---------------- */

function PassportStep({ form }: StepProps) {
  const t = useT()
  return (
    <FieldSet>
      <FieldLegend>{t("护照信息")}</FieldLegend>
      <FieldGroup>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            control={form.control}
            name="passportNumber"
            label={t("护照号码")}
            required
            autoComplete="off"
            spellCheck={false}
            className="[&_input]:doc-number [&_input]:uppercase"
          />
          <SelectField
            control={form.control}
            name="passportIssuingCountry"
            label={t("签发国家")}
            required
            options={COUNTRIES.map((c) => ({ value: c.code, label: `${t(c.name)} (${c.code})` }))}
          />
        </div>
        <TextField control={form.control} name="passportIssuingAuthority" label={t("签发机关")} required />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField control={form.control} name="passportIssueDate" label={t("签发日期")} type="date" required />
          <TextField
            control={form.control}
            name="passportExpiryDate"
            label={t("有效期至")}
            type="date"
            required
            description={t("需晚于计划入境日期")}
          />
        </div>
      </FieldGroup>
    </FieldSet>
  )
}

/* ---------------- 步骤 4：申请材料 ---------------- */

function MaterialsStep({
  attachments,
  uploading,
  removing,
  dragging,
  fileError,
  onDragChange,
  onAddFiles,
  onRemove,
}: {
  attachments: Attachment[]
  uploading: boolean
  removing: boolean
  dragging: boolean
  fileError: string | null
  onDragChange: (dragging: boolean) => void
  onAddFiles: (files: FileList | null) => void
  onRemove: (id: ID) => void
}) {
  const t = useT()
  return (
    <FieldSet>
      <FieldLegend>{t("申请材料")}</FieldLegend>
      <FieldDescription>
        {t("请上传护照资料页、与申请事由相关的证明文件。支持 PDF、JPG、PNG，单个文件不超过 10 MB，最多 {max} 份。", {
          max: ATTACHMENT_MAX_COUNT,
        })}
      </FieldDescription>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="portal-attachments">{t("上传文件")}</FieldLabel>
          <label
            htmlFor="portal-attachments"
            onDragOver={(e) => {
              e.preventDefault()
              onDragChange(true)
            }}
            onDragLeave={() => onDragChange(false)}
            onDrop={(e) => {
              e.preventDefault()
              onDragChange(false)
              onAddFiles(e.dataTransfer.files)
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-dashed px-4 py-8 text-center transition-colors hover:bg-muted/60 has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
              dragging && "border-primary bg-accent",
              uploading && "pointer-events-none opacity-60"
            )}
          >
            {uploading ? <Spinner className="size-5" /> : <UploadIcon className="size-5 text-muted-foreground" />}
            <span className="text-sm font-medium">{uploading ? t("正在上传…") : t("点击选择或拖入文件")}</span>
            <span className="text-xs text-muted-foreground">
              {t("已有 {count} / {ATTACHMENT_MAX_COUNT} 份", { count: attachments.length, ATTACHMENT_MAX_COUNT })}
            </span>
            <input
              id="portal-attachments"
              type="file"
              multiple
              accept={ATTACHMENT_ACCEPT}
              className="sr-only"
              onChange={(e) => {
                onAddFiles(e.target.files)
                e.target.value = ""
              }}
            />
          </label>
          {fileError && <FieldDescription className="text-destructive">{fileError}</FieldDescription>}
        </Field>

        <AttachmentList
          attachments={attachments}
          onRemove={onRemove}
          removing={removing}
          emptyHint={t("请上传护照资料页等必需材料。")}
        />
      </FieldGroup>
    </FieldSet>
  )
}

/* ---------------- 步骤 5：确认提交 ---------------- */

function ReviewStep({
  values,
  attachments,
  agreed,
  onAgreedChange,
}: {
  values: ApplicationFormValues
  attachments: Attachment[]
  agreed: boolean
  onAgreedChange: (agreed: boolean) => void
}) {
  const t = useT()
  const rows: [string, React.ReactNode][] = [
    [t("申请类型"), APPLICATION_TYPE_LABELS[values.type]],
    [t("计划入境日期"), values.intendedArrivalDate ? formatDate(values.intendedArrivalDate) : "—"],
    [t("拟停留天数"), values.intendedStayDays ? t("{intendedStayDays} 天", { intendedStayDays: values.intendedStayDays }) : "—"],
    [t("姓名（拉丁）"), `${values.surname} ${values.givenNames}`.trim() || "—"],
    [t("性别"), SEX_LABELS[values.sex]],
    [t("出生日期"), values.dateOfBirth ? formatDate(values.dateOfBirth) : "—"],
    [t("出生地"), values.placeOfBirth || "—"],
    [t("国籍"), values.nationality || "—"],
    [t("婚姻状况"), MARITAL_LABELS[values.maritalStatus]],
    [t("联系电话"), values.phone || "—"],
    [t("电子邮箱"), values.email || "—"],
    [t("护照号码"), <span key="pn" className="doc-number">{values.passportNumber || "—"}</span>],
    [t("护照有效期至"), values.passportExpiryDate ? formatDate(values.passportExpiryDate) : "—"],
    [t("材料"), t("{count} 份 · {size}", { count: attachments.length, size: formatFileSize(attachments.reduce((sum, a) => sum + a.size, 0)) })],
  ]

  return (
    <FieldSet>
      <FieldLegend>{t("确认并提交")}</FieldLegend>
      <FieldDescription>
        {t("提交后申请将进入受理流程，在此期间不能修改内容。如需变更请先撤回申请。")}
      </FieldDescription>
      <FieldGroup>
        <dl className="grid gap-x-8 gap-y-3 rounded-lg border p-4 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label} className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="text-sm break-words">{value}</dd>
            </div>
          ))}
          <div className="flex flex-col gap-0.5 sm:col-span-2">
            <dt className="text-xs text-muted-foreground">{t("申请事由")}</dt>
            <dd className="text-sm leading-relaxed break-words">{values.purpose || "—"}</dd>
          </div>
        </dl>

        <Label className="flex items-start gap-3 rounded-lg border p-4 font-normal">
          <Checkbox
            checked={agreed}
            onCheckedChange={(checked) => onAgreedChange(checked === true)}
            className="mt-0.5"
          />
          <span className="text-sm leading-relaxed">
            {t("我确认以上信息真实、准确、完整，所提交的材料与原件一致。如有虚假，愿承担相应的法律责任并接受申请被驳回的处理。")}
          </span>
        </Label>
      </FieldGroup>
    </FieldSet>
  )
}
