"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { CircleAlertIcon, ShieldCheckIcon } from "lucide-react"
import { toast } from "sonner"

import { applyFieldErrors, PasswordField, TextField } from "@/components/form/fields"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { ApiError, errorMessage } from "@/lib/api/client"
import { setPortalSession } from "@/lib/api/session"
import { portalAuthApi, portalAuthKeys } from "@/features/portal/api"
import { portalRegisterSchema, type PortalRegisterValues } from "@/features/portal/schemas"
import { useT } from "@/lib/i18n/client"

export function PortalRegisterForm() {
  const t = useT()
  const router = useRouter()
  const queryClient = useQueryClient()

  const form = useForm<PortalRegisterValues>({
    resolver: zodResolver(portalRegisterSchema),
    defaultValues: { fullName: "", email: "", phone: "", password: "", confirmPassword: "" },
  })

  const register = useMutation({
    mutationFn: ({ confirmPassword: _confirm, ...payload }: PortalRegisterValues) =>
      portalAuthApi.register(payload),
    onSuccess: (result) => {
      setPortalSession(result.accessToken, result.expiresIn)
      queryClient.setQueryData(portalAuthKeys.me, result.account)
      toast.success(t("账号已创建，可以开始填写申请"))
      router.replace("/portal/applications")
    },
    onError: (error) => {
      if (error instanceof ApiError) applyFieldErrors(error.fieldErrors, form.setError)
    },
  })

  const serverError = register.isError && !(register.error instanceof ApiError && register.error.fieldErrors)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold">{t("注册申请人账号")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("用于提交申请、上传材料和查询办理进度。请使用本人常用邮箱，办理结果将发送至该邮箱。")}
        </p>
      </div>

      <form
        noValidate
        onSubmit={form.handleSubmit((values) => register.mutate(values))}
        className="flex flex-col gap-8"
      >
        {serverError && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>{t("注册失败")}</AlertTitle>
            <AlertDescription>{errorMessage(register.error)}</AlertDescription>
          </Alert>
        )}

        <FieldSet>
          <FieldLegend>{t("本人信息")}</FieldLegend>
          <FieldGroup>
            <TextField
              control={form.control}
              name="fullName"
              label={t("姓名")}
              required
              autoComplete="name"
              description={t("与护照一致的姓名，中文或拉丁字母均可")}
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField control={form.control} name="email" label={t("电子邮箱")} type="email" required autoComplete="email" />
              <TextField control={form.control} name="phone" label={t("联系电话")} type="tel" required autoComplete="tel" />
            </div>
          </FieldGroup>
        </FieldSet>

        <FieldSet>
          <FieldLegend>{t("登录凭据")}</FieldLegend>
          <FieldGroup>
            <PasswordField
              control={form.control}
              name="password"
              label={t("密码")}
              required
              autoComplete="new-password"
              description={t("至少 10 位，包含大小写字母和数字")}
            />
            <PasswordField
              control={form.control}
              name="confirmPassword"
              label={t("确认密码")}
              required
              autoComplete="new-password"
            />
          </FieldGroup>
        </FieldSet>

        <div className="flex flex-col gap-4">
          <Button type="submit" size="lg" disabled={register.isPending}>
            {register.isPending && <Spinner data-icon="inline-start" />}
            {t("注册并开始申请")}
          </Button>
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheckIcon className="mt-0.5 size-3.5 shrink-0" />
            {t("注册即表示你确认所填信息真实有效。提供虚假材料将导致申请被驳回并依法承担责任。")}
          </p>
        </div>
      </form>

      <p className="text-sm text-muted-foreground">
        {t("已有账号？")}
        <Link href="/portal/login" className="font-medium text-primary underline-offset-4 hover:underline">
          {t("直接登录")}
        </Link>
      </p>
    </div>
  )
}
