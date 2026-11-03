"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Controller, useForm, useWatch, type UseFormReturn } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import {
  CalendarClockIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  CircleDashedIcon,
  ClockIcon,
  FileBadgeIcon,
  HouseIcon,
  IdCardIcon,
  PencilIcon,
  PlaneIcon,
  SaveIcon,
  UploadIcon,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"

import { applyFieldErrors, SelectField, TextareaField, TextField } from "@/components/form/fields"
import { PageHeader } from "@/components/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
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
  ATTACHMENT_MAX_COUNT,
  COUNTRIES,
  MARITAL_LABELS,
  SEX_LABELS,
  countryName,
} from "@/lib/constants"
import { formatDate, formatFileSize } from "@/lib/format"
import { checkUploads, describeUploadCheck } from "@/lib/upload"
import { cn } from "@/lib/utils"
import { useApplication, useRemoveAttachment, useSaveDraft, useSubmitApplication, useUploadAttachments } from "@/features/portal/api"
import { AttachmentList } from "@/features/portal/attachment-list"
import {
  APPLICATION_FLOWS,
  groupAttachments,
  missingDocuments,
  readLocalRequirements,
  requiredDocuments,
  requirementOf,
  type ApplicationFlow,
  type DocumentRequirement,
} from "@/features/portal/requirements"
import {
  APPLICATION_TYPES,
  STEP_FIELDS,
  applicationSchema,
  toApplicationFormValues,
  toDraftPayload,
  type ApplicationFormValues,
} from "@/features/portal/schemas"
import type { ApplicationType, Attachment, ID, RequirementKey, Sex } from "@/types"
import { useT } from "@/lib/i18n/client"

const STEPS = [
  { title: "申请类型", description: "选择要办理的业务" },
  { title: "申请事项", description: "说明事由与关键日期" },
  { title: "个人信息", description: "与护照一致的身份信息" },
  { title: "护照信息", description: "护照资料页上的信息" },
  { title: "申请材料", description: "按清单逐项上传" },
  { title: "确认提交", description: "核对信息并提交" },
]

const MATTER_STEP = 1
const PERSONAL_STEP = 2
const PASSPORT_STEP = 3
const MATERIALS_STEP = 4
const LAST_STEP = STEPS.length - 1

const TYPE_ICONS: Record<ApplicationType, LucideIcon> = {
  visa: PlaneIcon,
  residence_permit: IdCardIcon,
  residence_extension: CalendarClockIcon,
  permanent_residence: HouseIcon,
  travel_document: FileBadgeIcon,
}

export function ApplicationWizard() {
  const t = useT()
  const router = useRouter()
  const searchParams = useSearchParams()
  const draftParam = searchParams.get("draft")
  // 新建后会把草稿 ID 写进地址栏，标题按进入页面时的状态显示
  const [resuming] = useState(draftParam !== null)

  const [draftId, setDraftId] = useState<ID | null>(draftParam)
  const [step, setStep] = useState(0)
  const [stepError, setStepError] = useState<string | null>(null)
  const [fileError, setFileError] = useState<{ key: RequirementKey; message: string } | null>(null)
  const [uploadingKey, setUploadingKey] = useState<RequirementKey | null>(null)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [agreed, setAgreed] = useState(false)
  const hydrated = useRef(false)
  const errorRef = useRef<HTMLDivElement>(null)

  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: toApplicationFormValues(),
  })
  const type = useWatch({ control: form.control, name: "type" })
  const flow: ApplicationFlow | null = type ? APPLICATION_FLOWS[type] : null

  const draft = useApplication(draftId ?? "")
  const saveDraft = useSaveDraft()
  const submit = useSubmitApplication()
  const upload = useUploadAttachments()
  const removeAttachment = useRemoveAttachment()

  const attachments = useMemo<Attachment[]>(() => draft.data?.attachments ?? [], [draft.data])
  // 附件列表变化（上传完成后重新拉取）时重新读取本机记录的归属
  const localRequirements = useMemo(
    () => (draftId && attachments.length ? readLocalRequirements(draftId) : {}),
    [draftId, attachments]
  )
  const groups = useMemo(
    () => (type ? groupAttachments(type, attachments, localRequirements) : new Map<RequirementKey, Attachment[]>()),
    [type, attachments, localRequirements]
  )
  const missing = type ? missingDocuments(type, groups) : []
  const busy = saveDraft.isPending || submit.isPending

  // 从草稿箱继续填写时，用服务端数据回填表单（只回填一次）
  useEffect(() => {
    if (draftParam && draft.data && !hydrated.current) {
      form.reset(toApplicationFormValues(draft.data))
      hydrated.current = true
    }
  }, [draftParam, draft.data, form])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [step])

  /** 申请人主动切换步骤时清掉上一步的错误；提交失败跳回出错步骤时错误要保留 */
  function goTo(index: number) {
    setStepError(null)
    setStep(index)
  }

  // 材料清单较长，出错时把提示滚到可见处
  useEffect(() => {
    if (stepError) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [stepError])

  /** 创建或更新草稿，返回可用的草稿 ID */
  async function persistDraft(): Promise<ID> {
    const payload = toDraftPayload(form.getValues())
    let id = draftId
    if (id) {
      await saveDraft.mutateAsync({ id, payload })
    } else {
      id = (await saveDraft.mutateAsync({ payload })).id
      setDraftId(id)
      // 地址栏带上草稿 ID，刷新页面后能接着填
      router.replace(`/portal/applications/new?draft=${id}`, { scroll: false })
      hydrated.current = true
    }
    setSavedAt(new Date())
    return id
  }

  async function goNext() {
    setStepError(null)
    const fields = STEP_FIELDS[step]
    if (fields.length && !(await form.trigger(fields))) return

    if (step === MATERIALS_STEP && missing.length) {
      setStepError(
        t("还缺少以下必交材料：{items}", { items: missing.map((doc) => t(doc.label)).join(t("、")) })
      )
      return
    }

    // 填完申请事项后每一步都落库：材料上传需要真实的草稿 ID，中途离开也不丢内容
    if (step >= MATTER_STEP) {
      try {
        await persistDraft()
      } catch {
        // 失败原因由 saveDraft.error 渲染
        return
      }
    }

    goTo(Math.min(step + 1, LAST_STEP))
  }

  async function saveNow() {
    try {
      await persistDraft()
      toast.success(t("草稿已保存"))
    } catch {
      // 失败原因由 saveDraft.error 渲染
    }
  }

  async function addFiles(requirement: DocumentRequirement, list: FileList | null) {
    if (!list || !draftId) return
    const check = await checkUploads(Array.from(list), { existingNames: attachments.map((a) => a.fileName) })
    const message = describeUploadCheck(t, check)
    setFileError(message ? { key: requirement.key, message } : null)
    if (check.overLimit || check.accepted.length === 0) return
    setUploadingKey(requirement.key)
    upload.mutate(
      { id: draftId, files: check.accepted, requirement },
      {
        onError: (error) => setFileError({ key: requirement.key, message: errorMessage(error) }),
        onSettled: () => setUploadingKey(null),
      }
    )
  }

  async function onSubmit() {
    setStepError(null)
    if (!(await form.trigger())) {
      const badStep = STEP_FIELDS.findIndex((fields) => fields.some((field) => form.getFieldState(field).invalid))
      if (badStep >= 0) setStep(badStep)
      setStepError(t("部分信息填写有误，请修改后重新提交。"))
      return
    }
    if (missing.length) {
      setStep(MATERIALS_STEP)
      setStepError(
        t("还缺少以下必交材料：{items}", { items: missing.map((doc) => t(doc.label)).join(t("、")) })
      )
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
        const badStep = "attachments" in error.fieldErrors
          ? MATERIALS_STEP
          : STEP_FIELDS.findIndex((fields) => fields.some((field) => field in error.fieldErrors!))
        if (badStep >= 0) setStep(badStep)
      }
      setStepError(errorMessage(error))
    }
  }

  const requiredTotal = type ? requiredDocuments(type).length : 0

  return (
    <div className="flex flex-col">
      <PageHeader
        title={resuming ? t("继续填写申请") : t("新建申请")}
        description={t("按步骤填写，填完申请事项后每一步都会自动保存为草稿，可在“我的申请”中继续填写。")}
        className="mb-6 lg:mb-8"
      />

      <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
        <aside aria-label={t("申请进度")} className="hidden lg:block">
          <div className="sticky top-24 flex flex-col gap-6">
            <Stepper step={step} onSelect={(index) => index < step && goTo(index)} />
            {flow && (
              <RailSummary
                flow={flow}
                done={requiredTotal - missing.length}
                total={requiredTotal}
                fileCount={attachments.length}
                savedAt={savedAt}
              />
            )}
          </div>
        </aside>

        <form noValidate onSubmit={(e) => e.preventDefault()} className="flex min-w-0 flex-col">
          <MobileProgress step={step} />

          <Card>
            <CardHeader className="border-b">
              <p className="text-xs font-medium text-muted-foreground tabular-nums">
                {t("第 {step} / {total} 步", { step: step + 1, total: STEPS.length })}
                {flow && step > 0 && <> · {t(APPLICATION_TYPE_LABELS[flow.type])}</>}
              </p>
              <CardTitle className="text-lg">
                {step === PASSPORT_STEP && flow ? t(flow.passport.title) : t(STEPS[step].title)}
              </CardTitle>
              <CardDescription>
                {step === PASSPORT_STEP && flow ? t(flow.passport.description) : t(STEPS[step].description)}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              {saveDraft.isError && (
                <Alert variant="destructive">
                  <CircleAlertIcon />
                  <AlertTitle>{t("草稿保存失败")}</AlertTitle>
                  <AlertDescription>{errorMessage(saveDraft.error)}</AlertDescription>
                </Alert>
              )}

              {stepError && (
                <Alert ref={errorRef} variant="destructive">
                  <CircleAlertIcon />
                  <AlertTitle>{t("暂时无法继续")}</AlertTitle>
                  <AlertDescription>{stepError}</AlertDescription>
                </Alert>
              )}

              {step === 0 && <TypeStep form={form} attachments={attachments} localRequirements={localRequirements} />}
              {step === MATTER_STEP && flow && <MatterStep form={form} flow={flow} />}
              {step === PERSONAL_STEP && <PersonalStep form={form} />}
              {step === PASSPORT_STEP && <PassportStep form={form} />}
              {step === MATERIALS_STEP && flow && (
                <MaterialsStep
                  flow={flow}
                  groups={groups}
                  fileCount={attachments.length}
                  uploadingKey={uploadingKey}
                  removing={removeAttachment.isPending}
                  fileError={fileError}
                  onAddFiles={addFiles}
                  onRemove={(attachmentId) => draftId && removeAttachment.mutate({ id: draftId, attachmentId })}
                />
              )}
              {step === LAST_STEP && flow && (
                <ReviewStep
                  flow={flow}
                  values={form.getValues()}
                  groups={groups}
                  agreed={agreed}
                  onAgreedChange={setAgreed}
                  onEdit={goTo}
                />
              )}
            </CardContent>
          </Card>

          <div className="sticky bottom-0 z-10 mt-4 flex items-center gap-3 border-t bg-background/95 py-4 backdrop-blur supports-backdrop-filter:bg-background/80">
            <Button
              type="button"
              variant="outline"
              onClick={() => goTo(Math.max(0, step - 1))}
              disabled={step === 0 || busy}
            >
              <ChevronLeftIcon data-icon="inline-start" />
              {t("上一步")}
            </Button>

            <div className="flex-1" />

            {step >= MATTER_STEP && step < LAST_STEP && (
              <Button type="button" variant="ghost" onClick={saveNow} disabled={busy} aria-label={t("保存草稿")}>
                <SaveIcon data-icon="inline-start" />
                <span className="hidden sm:inline">{t("保存草稿")}</span>
              </Button>
            )}

            {step < LAST_STEP ? (
              <Button type="button" onClick={goNext} disabled={busy || uploadingKey !== null}>
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
    </div>
  )
}

/* ---------------- 进度：桌面端侧栏与移动端进度条 ---------------- */

function Stepper({ step, onSelect }: { step: number; onSelect: (index: number) => void }) {
  const t = useT()
  return (
    <nav aria-label={t("申请步骤")}>
      <ol className="flex flex-col">
        {STEPS.map((s, index) => {
          const done = index < step
          const current = index === step
          return (
            <li key={s.title} className="relative pb-5 last:pb-0">
              {index < STEPS.length - 1 && (
                <span
                  aria-hidden
                  className={cn("absolute top-7 bottom-1 left-[0.8125rem] w-px bg-border", done && "bg-primary")}
                />
              )}
              <button
                type="button"
                onClick={() => onSelect(index)}
                disabled={index >= step}
                aria-current={current ? "step" : undefined}
                className="group flex w-full items-start gap-3 rounded-md text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default"
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full border bg-background text-xs font-medium tabular-nums text-muted-foreground transition-colors",
                    current && "border-primary bg-primary text-primary-foreground",
                    done && "border-primary text-primary group-hover:bg-accent"
                  )}
                >
                  {done ? <CheckIcon className="size-3.5" /> : index + 1}
                </span>
                <span className="flex min-w-0 flex-col pt-0.5">
                  <span
                    className={cn(
                      "text-sm",
                      current ? "font-medium text-foreground" : done ? "text-foreground group-hover:underline" : "text-muted-foreground"
                    )}
                  >
                    {t(s.title)}
                  </span>
                  <span className="text-xs text-muted-foreground">{t(s.description)}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function RailSummary({
  flow,
  done,
  total,
  fileCount,
  savedAt,
}: {
  flow: ApplicationFlow
  done: number
  total: number
  fileCount: number
  savedAt: Date | null
}) {
  const t = useT()
  const Icon = TYPE_ICONS[flow.type]
  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 text-sm">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Icon className="size-4" />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{t(APPLICATION_TYPE_LABELS[flow.type])}</span>
          <span className="text-xs text-muted-foreground">{t(flow.processingTime)}</span>
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between text-xs">
          <span className="text-muted-foreground">{t("必交材料")}</span>
          <span className="font-medium tabular-nums">
            {done} / {total}
          </span>
        </div>
        <Progress value={total ? (done / total) * 100 : 0} className="h-1.5" />
        <span className="text-xs text-muted-foreground tabular-nums">
          {t("已上传 {count} / {ATTACHMENT_MAX_COUNT} 份", { count: fileCount, ATTACHMENT_MAX_COUNT })}
        </span>
      </div>
      {savedAt && (
        <p className="flex items-center gap-1.5 border-t pt-3 text-xs text-muted-foreground">
          <CircleCheckIcon className="size-3.5 text-success" />
          {t("草稿已保存于 {time}", { time: format(savedAt, "HH:mm") })}
        </p>
      )}
    </div>
  )
}

function MobileProgress({ step }: { step: number }) {
  const t = useT()
  return (
    <div className="mb-4 flex flex-col gap-2 lg:hidden">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{t(STEPS[step].title)}</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {step + 1} / {STEPS.length}
        </span>
      </div>
      <Progress value={((step + 1) / STEPS.length) * 100} className="h-1.5" />
    </div>
  )
}

/* ---------------- 步骤 1：申请类型 ---------------- */

type StepProps = { form: UseFormReturn<ApplicationFormValues> }

function TypeStep({
  form,
  attachments,
  localRequirements,
}: StepProps & { attachments: Attachment[]; localRequirements: Record<ID, RequirementKey> }) {
  const t = useT()
  const type = useWatch({ control: form.control, name: "type" })
  const flow = type ? APPLICATION_FLOWS[type] : null

  // 切换类型后，原先归在别的清单项下的材料会落到“其他补充材料”
  const orphaned = flow
    ? attachments.filter((a) => {
        const key = requirementOf(a, localRequirements)
        return key !== "other" && !flow.documents.some((doc) => doc.key === key)
      }).length
    : 0

  return (
    <div className="flex flex-col gap-6">
      <Controller
        control={form.control}
        name="type"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel id="application-type-label" className="sr-only">
              {t("业务类型")}
            </FieldLabel>
            <RadioGroup
              value={field.value ?? ""}
              onValueChange={field.onChange}
              aria-labelledby="application-type-label"
              aria-invalid={fieldState.invalid}
              className="grid gap-3 md:grid-cols-2"
            >
              {APPLICATION_TYPES.map((item) => {
                const Icon = TYPE_ICONS[item]
                const itemFlow = APPLICATION_FLOWS[item]
                const selected = field.value === item
                return (
                  <Label
                    key={item}
                    className={cn(
                      "relative flex cursor-pointer flex-col items-stretch gap-3 rounded-xl border p-4 font-normal transition-colors hover:border-foreground/20 hover:bg-muted/40 has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                      selected && "border-primary bg-accent/60 hover:border-primary hover:bg-accent/60"
                    )}
                  >
                    <span className="flex items-start gap-3">
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors",
                          selected && "bg-primary text-primary-foreground"
                        )}
                      >
                        <Icon className="size-4.5" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="text-sm font-medium">{t(APPLICATION_TYPE_LABELS[item])}</span>
                        <span className="text-xs leading-relaxed text-muted-foreground">
                          {t(APPLICATION_TYPE_HINTS[item])}
                        </span>
                      </span>
                      <RadioGroupItem value={item} className="mt-0.5" />
                    </span>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-12 text-xs text-muted-foreground">
                      <span className="tabular-nums">
                        {t("必交材料 {count} 项", { count: requiredDocuments(item).length })}
                      </span>
                      <span className="flex items-center gap-1">
                        <ClockIcon className="size-3" />
                        {t(itemFlow.processingTime)}
                      </span>
                    </span>
                  </Label>
                )
              })}
            </RadioGroup>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      {orphaned > 0 && (
        <Alert>
          <CircleAlertIcon />
          <AlertTitle>{t("已上传的材料需要重新核对")}</AlertTitle>
          <AlertDescription>
            {t("有 {count} 份材料不在该类型的清单中，将显示在“其他补充材料”里，可在材料一步移除或重新上传。", {
              count: orphaned,
            })}
          </AlertDescription>
        </Alert>
      )}

      {flow && <DocumentPreview flow={flow} />}
    </div>
  )
}

/** 选好类型后先列出要准备的材料，申请人可以对照清单备齐再往下填 */
function DocumentPreview({ flow }: { flow: ApplicationFlow }) {
  const t = useT()
  const required = flow.documents.filter((doc) => doc.required)
  const optional = flow.documents.filter((doc) => !doc.required && doc.key !== "other")
  return (
    <section className="flex flex-col gap-4 rounded-xl bg-muted/50 p-5">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-medium">
          {t("办理{type}需准备的材料", { type: t(APPLICATION_TYPE_LABELS[flow.type]) })}
        </h3>
        <p className="text-xs text-muted-foreground">
          {t("PDF、JPG、PNG，单个文件不超过 10 MB，全部材料最多 {max} 份。", { max: ATTACHMENT_MAX_COUNT })}
        </p>
      </div>
      <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
        <DocumentPreviewList title={t("必交")} documents={required} />
        {optional.length > 0 && <DocumentPreviewList title={t("视情况提交")} documents={optional} muted />}
      </div>
    </section>
  )
}

function DocumentPreviewList({
  title,
  documents,
  muted,
}: {
  title: string
  documents: DocumentRequirement[]
  muted?: boolean
}) {
  const t = useT()
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-muted-foreground">{title}</span>
      <ul className="flex flex-col gap-2.5">
        {documents.map((doc) => (
          <li key={doc.key} className="flex items-start gap-2 text-sm">
            {muted ? (
              <CircleDashedIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            ) : (
              <CircleCheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
            )}
            <span className="flex flex-col gap-0.5">
              <span>{t(doc.label)}</span>
              <span className="text-xs leading-relaxed text-muted-foreground">{t(doc.description)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ---------------- 步骤 2：申请事项 ---------------- */

function MatterStep({ form, flow }: StepProps & { flow: ApplicationFlow }) {
  const t = useT()
  return (
    <FieldGroup>
      <TextareaField
        control={form.control}
        name="purpose"
        label={t("申请事由")}
        required
        rows={4}
        placeholder={t(flow.purposePlaceholder)}
        description={t("10–500 字，将用于受理机关初审")}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          control={form.control}
          name="intendedArrivalDate"
          label={t(flow.date.label)}
          type="date"
          required
          description={t(flow.date.description)}
        />
        {flow.stay && (
          <TextField
            control={form.control}
            name="intendedStayDays"
            label={t(flow.stay.label)}
            inputMode="numeric"
            required
            placeholder={flow.stay.placeholder}
            description={t(flow.stay.description)}
          />
        )}
      </div>
    </FieldGroup>
  )
}

/* ---------------- 步骤 3：个人信息 ---------------- */

function PersonalStep({ form }: StepProps) {
  const t = useT()
  return (
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
                    {t(SEX_LABELS[sex])}
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
          options={Object.entries(MARITAL_LABELS).map(([value, label]) => ({ value, label: t(label) }))}
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
  )
}

/* ---------------- 步骤 4：护照信息 ---------------- */

function PassportStep({ form }: StepProps) {
  const t = useT()
  return (
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
        <TextField control={form.control} name="passportExpiryDate" label={t("有效期至")} type="date" required />
      </div>
    </FieldGroup>
  )
}

/* ---------------- 步骤 5：申请材料 ---------------- */

function MaterialsStep({
  flow,
  groups,
  fileCount,
  uploadingKey,
  removing,
  fileError,
  onAddFiles,
  onRemove,
}: {
  flow: ApplicationFlow
  groups: Map<RequirementKey, Attachment[]>
  fileCount: number
  uploadingKey: RequirementKey | null
  removing: boolean
  fileError: { key: RequirementKey; message: string } | null
  onAddFiles: (requirement: DocumentRequirement, files: FileList | null) => void
  onRemove: (id: ID) => void
}) {
  const t = useT()
  const required = flow.documents.filter((doc) => doc.required)
  const optional = flow.documents.filter((doc) => !doc.required)
  const done = required.filter((doc) => groups.get(doc.key)?.length).length

  const slot = (doc: DocumentRequirement) => (
    <RequirementSlot
      key={doc.key}
      requirement={doc}
      files={groups.get(doc.key) ?? []}
      uploading={uploadingKey === doc.key}
      disabled={uploadingKey !== null && uploadingKey !== doc.key}
      removing={removing}
      error={fileError?.key === doc.key ? fileError.message : null}
      onAddFiles={(files) => onAddFiles(doc, files)}
      onRemove={onRemove}
    />
  )

  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm text-muted-foreground">
        {t("每项可上传多份文件，支持 PDF、JPG、PNG，单个文件不超过 10 MB；全部材料合计最多 {max} 份，当前已上传 {count} 份。", {
          max: ATTACHMENT_MAX_COUNT,
          count: fileCount,
        })}
      </p>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="text-sm font-medium">{t("必交材料")}</h3>
          <span className={cn("text-xs tabular-nums", done === required.length ? "text-success" : "text-muted-foreground")}>
            {t("已完成 {done} / {total} 项", { done, total: required.length })}
          </span>
        </div>
        <ul className="flex flex-col gap-3">{required.map(slot)}</ul>
      </section>

      {optional.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-sm font-medium">{t("视情况提交")}</h3>
            <p className="text-xs text-muted-foreground">{t("符合说明中的情形时请一并上传，有助于加快审核。")}</p>
          </div>
          <ul className="flex flex-col gap-3">{optional.map(slot)}</ul>
        </section>
      )}
    </div>
  )
}

function RequirementSlot({
  requirement,
  files,
  uploading,
  disabled,
  removing,
  error,
  onAddFiles,
  onRemove,
}: {
  requirement: DocumentRequirement
  files: Attachment[]
  uploading: boolean
  disabled: boolean
  removing: boolean
  error: string | null
  onAddFiles: (files: FileList | null) => void
  onRemove: (id: ID) => void
}) {
  const t = useT()
  const [dragging, setDragging] = useState(false)
  const inputId = `requirement-${requirement.key}`
  const done = files.length > 0

  return (
    <li
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        if (!disabled) onAddFiles(e.dataTransfer.files)
      }}
      className={cn(
        "flex gap-3 rounded-xl border p-4 transition-colors sm:gap-4",
        done && "border-success/30 bg-success/[0.03]",
        dragging && "border-dashed border-primary bg-accent",
        error && "border-destructive/50"
      )}
    >
      {done ? (
        <CircleCheckIcon aria-hidden className="mt-0.5 size-5 shrink-0 text-success" />
      ) : (
        <CircleDashedIcon aria-hidden className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
              {t(requirement.label)}
              {requirement.required ? (
                <Badge variant="secondary">{t("必交")}</Badge>
              ) : (
                <Badge variant="outline">{t("选交")}</Badge>
              )}
              <span className="sr-only">{done ? t("已上传") : t("未上传")}</span>
            </span>
            <span className="text-xs leading-relaxed text-muted-foreground">{t(requirement.description)}</span>
          </div>
          <Button
            asChild
            variant={done ? "ghost" : "outline"}
            size="sm"
            className={cn(
              "shrink-0 cursor-pointer self-start has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
              (uploading || disabled) && "pointer-events-none opacity-60"
            )}
          >
            <label htmlFor={inputId}>
              {uploading ? <Spinner data-icon="inline-start" /> : <UploadIcon data-icon="inline-start" />}
              {uploading ? t("正在上传…") : done ? t("继续添加") : t("上传文件")}
              <input
                id={inputId}
                type="file"
                multiple
                accept={ATTACHMENT_ACCEPT}
                disabled={uploading || disabled}
                className="sr-only"
                onChange={(e) => {
                  onAddFiles(e.target.files)
                  e.target.value = ""
                }}
              />
            </label>
          </Button>
        </div>
        {done && <AttachmentList attachments={files} onRemove={onRemove} removing={removing} />}
        {!done && !error && (
          <span className="hidden text-xs text-muted-foreground sm:block">{t("也可以把文件拖到这里")}</span>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </li>
  )
}

/* ---------------- 步骤 6：确认提交 ---------------- */

function ReviewStep({
  flow,
  values,
  groups,
  agreed,
  onAgreedChange,
  onEdit,
}: {
  flow: ApplicationFlow
  values: ApplicationFormValues
  groups: Map<RequirementKey, Attachment[]>
  agreed: boolean
  onAgreedChange: (agreed: boolean) => void
  onEdit: (step: number) => void
}) {
  const t = useT()
  const files = [...groups.values()].flat()

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        {t("提交后申请将进入受理流程，在此期间不能修改内容。如需变更请先撤回申请。")}
      </p>

      <ReviewSection title={t("申请事项")} onEdit={() => onEdit(MATTER_STEP)}>
        <ReviewItem label={t("申请类型")}>{t(APPLICATION_TYPE_LABELS[flow.type])}</ReviewItem>
        <ReviewItem label={t(flow.date.label)}>
          {values.intendedArrivalDate ? formatDate(values.intendedArrivalDate) : "—"}
        </ReviewItem>
        {flow.stay && (
          <ReviewItem label={t(flow.stay.label)}>
            {values.intendedStayDays ? t("{intendedStayDays} 天", { intendedStayDays: values.intendedStayDays }) : "—"}
          </ReviewItem>
        )}
        <ReviewItem label={t("申请事由")} wide>
          <span className="leading-relaxed">{values.purpose || "—"}</span>
        </ReviewItem>
      </ReviewSection>

      <ReviewSection title={t("个人信息")} onEdit={() => onEdit(PERSONAL_STEP)}>
        <ReviewItem label={t("姓名（拉丁）")}>{`${values.surname} ${values.givenNames}`.trim() || "—"}</ReviewItem>
        {values.nativeName && <ReviewItem label={t("原文姓名")}>{values.nativeName}</ReviewItem>}
        <ReviewItem label={t("性别")}>{t(SEX_LABELS[values.sex])}</ReviewItem>
        <ReviewItem label={t("出生日期")}>{values.dateOfBirth ? formatDate(values.dateOfBirth) : "—"}</ReviewItem>
        <ReviewItem label={t("出生地")}>{values.placeOfBirth || "—"}</ReviewItem>
        <ReviewItem label={t("国籍")}>{values.nationality ? countryName(values.nationality, t) : "—"}</ReviewItem>
        <ReviewItem label={t("婚姻状况")}>{t(MARITAL_LABELS[values.maritalStatus])}</ReviewItem>
        <ReviewItem label={t("联系电话")}>{values.phone || "—"}</ReviewItem>
        <ReviewItem label={t("电子邮箱")}>{values.email || "—"}</ReviewItem>
      </ReviewSection>

      <ReviewSection title={t(flow.passport.title)} onEdit={() => onEdit(PASSPORT_STEP)}>
        <ReviewItem label={t("护照号码")}>
          <span className="doc-number">{values.passportNumber || "—"}</span>
        </ReviewItem>
        <ReviewItem label={t("签发国家")}>
          {values.passportIssuingCountry ? countryName(values.passportIssuingCountry, t) : "—"}
        </ReviewItem>
        <ReviewItem label={t("护照有效期至")}>
          {values.passportExpiryDate ? formatDate(values.passportExpiryDate) : "—"}
        </ReviewItem>
      </ReviewSection>

      <ReviewSection
        title={t("申请材料")}
        meta={t("{count} 份 · {size}", { count: files.length, size: formatFileSize(files.reduce((sum, a) => sum + a.size, 0)) })}
        onEdit={() => onEdit(MATERIALS_STEP)}
        plain
      >
        <ul className="flex flex-col gap-2 sm:col-span-2">
          {flow.documents
            .filter((doc) => doc.required || groups.get(doc.key)?.length)
            .map((doc) => {
              const count = groups.get(doc.key)?.length ?? 0
              return (
                <li key={doc.key} className="flex items-center gap-2 text-sm">
                  {count ? (
                    <CircleCheckIcon className="size-4 shrink-0 text-success" />
                  ) : (
                    <CircleAlertIcon className="size-4 shrink-0 text-destructive" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{t(doc.label)}</span>
                  <span className={cn("text-xs tabular-nums", count ? "text-muted-foreground" : "text-destructive")}>
                    {count ? t("{count} 份", { count }) : t("未上传")}
                  </span>
                </li>
              )
            })}
        </ul>
      </ReviewSection>

      <Label className="flex items-start gap-3 rounded-xl border p-4 font-normal has-data-[state=checked]:border-primary has-data-[state=checked]:bg-accent/50">
        <Checkbox checked={agreed} onCheckedChange={(checked) => onAgreedChange(checked === true)} className="mt-0.5" />
        <span className="text-sm leading-relaxed">
          {t("我确认以上信息真实、准确、完整，所提交的材料与原件一致。如有虚假，愿承担相应的法律责任并接受申请被驳回的处理。")}
        </span>
      </Label>
    </div>
  )
}

function ReviewSection({
  title,
  meta,
  onEdit,
  plain,
  children,
}: {
  title: string
  meta?: string
  onEdit: () => void
  /** 内容不是 ReviewItem 时用 div 包裹，避免 dl 里出现列表 */
  plain?: boolean
  children: React.ReactNode
}) {
  const t = useT()
  const Body = plain ? "div" : "dl"
  return (
    <section className="rounded-xl border">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-2.5">
        <h3 className="flex items-baseline gap-2 text-sm font-medium">
          {title}
          {meta && <span className="text-xs font-normal text-muted-foreground tabular-nums">{meta}</span>}
        </h3>
        <Button type="button" variant="ghost" size="xs" onClick={onEdit} aria-label={t("修改{section}", { section: title })}>
          <PencilIcon data-icon="inline-start" />
          {t("修改")}
        </Button>
      </div>
      <Body className="grid gap-x-8 gap-y-3 p-4 sm:grid-cols-2">{children}</Body>
    </section>
  )
}

function ReviewItem({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-0.5", wide && "sm:col-span-2")}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm break-words">{children}</dd>
    </div>
  )
}
