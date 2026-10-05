"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CircleAlertIcon } from "lucide-react"
import { toast } from "sonner"

import { applyFieldErrors, SelectField, TextareaField, TextField } from "@/components/form/fields"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { ApiError, errorMessage } from "@/lib/api/client"
import { APPLICANT_STATUS_LABELS, COUNTRIES, MARITAL_LABELS, SEX_LABELS } from "@/lib/constants"
import { useSaveApplicant } from "@/features/applicants/api"
import { applicantSchema, toFormValues, toPayload, type ApplicantFormValues } from "@/features/applicants/schema"
import type { Applicant, Sex } from "@/types"
import { useT } from "@/lib/i18n/client"

function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="grid gap-6 py-8 first:pt-0 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] md:gap-12">
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <FieldGroup className="max-w-2xl">{children}</FieldGroup>
    </section>
  )
}

export function ApplicantForm({ applicant }: { applicant?: Applicant }) {
  const t = useT()
  const router = useRouter()
  const save = useSaveApplicant()
  const isEdit = !!applicant

  const form = useForm<ApplicantFormValues>({
    resolver: zodResolver(applicantSchema),
    defaultValues: toFormValues(applicant),
  })

  function onSubmit(values: ApplicantFormValues) {
    save.mutate(
      { id: applicant?.id, payload: toPayload(values) },
      {
        onSuccess: (saved) => {
          toast.success(isEdit ? t("档案已更新") : t("档案已建立：{fileNo}", { fileNo: saved.fileNo }))
          router.push(`/applicants/${saved.id}`)
        },
        onError: (error) => {
          if (error instanceof ApiError) applyFieldErrors(error.fieldErrors, form.setError)
        },
      }
    )
  }

  const cancelHref = applicant ? `/applicants/${applicant.id}` : "/applicants"

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
      {save.isError && (
        <Alert variant="destructive" className="mb-6">
          <CircleAlertIcon />
          <AlertTitle>{t("保存失败")}</AlertTitle>
          <AlertDescription>{errorMessage(save.error)}</AlertDescription>
        </Alert>
      )}

      <Section title={t("身份信息")} description={t("姓名按护照机读区的拉丁字母填写，保存时统一转为大写。")}>
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
                <FieldLabel id="sex-label">
                  {t("性别")}<span aria-hidden className="text-destructive">*</span>
                </FieldLabel>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  spacing={0}
                  value={field.value ?? ""}
                  onValueChange={(v) => v && field.onChange(v as Sex)}
                  aria-labelledby="sex-label"
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
      </Section>

      <Separator />

      <Section title={t("联系方式")} description={t("用于发送补件通知与审批结果。")}>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField control={form.control} name="phone" label={t("联系电话")} type="tel" placeholder="+81 90 1234 5678" />
          <TextField control={form.control} name="email" label={t("电子邮箱")} type="email" />
        </div>
        <TextField control={form.control} name="address" label={t("境内居住地址")} />
      </Section>

      <Separator />

      <Section title={t("其他信息")} description={t("档案状态会影响申请人在各业务模块中的可见性。")}>
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
        <SelectField
          control={form.control}
          name="status"
          label={t("档案状态")}
          required
          className="sm:max-w-[calc(50%-0.625rem)]"
          options={Object.entries(APPLICANT_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
        />
        <TextareaField control={form.control} name="remarks" label={t("备注")} rows={4} placeholder={t("内部备注，申请人不可见")} />
      </Section>

      <div className="sticky bottom-0 -mx-4 mt-2 flex items-center justify-end gap-2 border-t bg-background px-4 py-4 md:-mx-8 md:px-8">
        <Button variant="outline" asChild>
          <Link href={cancelHref}>{t("取消")}</Link>
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending && <Spinner data-icon="inline-start" />}
          {isEdit ? t("保存修改") : t("建立档案")}
        </Button>
      </div>
    </form>
  )
}
