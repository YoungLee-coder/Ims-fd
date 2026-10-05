"use client"

import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { CircleAlertIcon, MailCheckIcon } from "lucide-react"

import { applyFieldErrors, PasswordField, SelectField, TextField } from "@/components/form/fields"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { ApiError, errorMessage } from "@/lib/api/client"
import { DEPARTMENTS } from "@/lib/constants"
import { authApi } from "@/features/auth/api"
import { registerSchema, type RegisterValues } from "@/features/auth/schemas"
import { useT } from "@/lib/i18n/client"

export function RegisterForm() {
  const t = useT()
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      employeeId: "",
      department: "",
      email: "",
      phone: "",
      username: "",
      password: "",
      confirmPassword: "",
    },
  })

  const register = useMutation({
    mutationFn: ({ confirmPassword: _confirm, ...payload }: RegisterValues) => authApi.register(payload),
    onError: (error) => {
      if (error instanceof ApiError) applyFieldErrors(error.fieldErrors, form.setError)
    },
  })

  if (register.isSuccess) {
    const user = register.data
    return (
      <div className="flex flex-col gap-6">
        <span className="inline-flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <MailCheckIcon className="size-5" />
        </span>
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold">{t("申请已提交")}</h2>
          <p className="leading-relaxed text-muted-foreground">
            {t("系统管理员审核通过并分配角色后，账号即可登录。审核结果将发送至 {email}。", { email: user.email })}
          </p>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-y py-4 text-sm">
          <dt className="text-muted-foreground">{t("姓名")}</dt>
          <dd>{user.fullName}</dd>
          <dt className="text-muted-foreground">{t("工号")}</dt>
          <dd className="doc-number">{user.employeeId}</dd>
          <dt className="text-muted-foreground">{t("用户名")}</dt>
          <dd className="doc-number">{user.username}</dd>
          <dt className="text-muted-foreground">{t("部门")}</dt>
          <dd>{t(user.department)}</dd>
        </dl>
        <Button asChild variant="outline" className="self-start">
          <Link href="/login">{t("返回登录")}</Link>
        </Button>
      </div>
    )
  }

  const serverError = register.isError && !(register.error instanceof ApiError && register.error.fieldErrors)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-2xl font-semibold">{t("申请开通账号")}</h2>
        <p className="text-sm text-muted-foreground">{t("提交后由系统管理员核实身份并分配角色。")}</p>
      </div>

      <form noValidate onSubmit={form.handleSubmit((values) => register.mutate(values))} className="flex flex-col gap-8">
        {serverError && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>{t("提交失败")}</AlertTitle>
            <AlertDescription>{errorMessage(register.error)}</AlertDescription>
          </Alert>
        )}

        <FieldSet>
          <FieldLegend>{t("身份信息")}</FieldLegend>
          <FieldGroup>
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField control={form.control} name="fullName" label={t("姓名")} required autoComplete="name" />
              <TextField control={form.control} name="employeeId" label={t("工号")} required placeholder="E20417" />
            </div>
            <SelectField
              control={form.control}
              name="department"
              label={t("所属部门")}
              required
              options={DEPARTMENTS.map((d) => ({ value: d, label: t(d) }))}
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField control={form.control} name="email" label={t("工作邮箱")} type="email" required autoComplete="email" />
              <TextField control={form.control} name="phone" label={t("联系电话")} type="tel" required autoComplete="tel" />
            </div>
          </FieldGroup>
        </FieldSet>

        <FieldSet>
          <FieldLegend>{t("登录凭据")}</FieldLegend>
          <FieldGroup>
            <TextField
              control={form.control}
              name="username"
              label={t("用户名")}
              required
              autoComplete="username"
              description={t("建议使用 姓.名 的拼音，例如 zhou.anlan")}
            />
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

        <Button type="submit" size="lg" disabled={register.isPending}>
          {register.isPending && <Spinner data-icon="inline-start" />}
          {t("提交申请")}
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">
        {t("已有账号？")}
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          {t("返回登录")}
        </Link>
      </p>
    </div>
  )
}
