"use client"

import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CircleAlertIcon } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"

import { applyFieldErrors, PasswordField, SelectField, TextField } from "@/components/form/fields"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FieldGroup, FieldLegend, FieldSeparator, FieldSet } from "@/components/ui/field"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Spinner } from "@/components/ui/spinner"
import { ApiError, errorMessage } from "@/lib/api/client"
import { DEPARTMENTS } from "@/lib/constants"
import { formatDateTime } from "@/lib/format"
import { accountFields, passwordRule } from "@/features/auth/schemas"
import { RoleChecklist } from "@/features/roles/role-checklist"
import { useCreateUser, useSetUserStatus, useUpdateUser } from "@/features/users/api"
import type { User } from "@/types"
import { useT } from "@/lib/i18n/client"
import type { TFunction } from "@/lib/i18n/translate"

export type UserSheetMode = { kind: "create" } | { kind: "edit"; user: User } | { kind: "approve"; user: User }

const roleIds = z.array(z.string()).min(1, "至少分配一个角色")

const createSchema = z.object({ ...accountFields, password: passwordRule, roleIds })
const editSchema = z.object({
  fullName: accountFields.fullName,
  department: accountFields.department,
  email: accountFields.email,
  phone: accountFields.phone,
  roleIds: z.array(z.string()),
})
const approveSchema = z.object({ roleIds })

const TITLES = {
  create: { title: "新建用户", description: "由管理员直接开通的账号无需审核，创建后即可登录。" },
  edit: { title: "编辑用户", description: "角色调整在用户下次请求时生效。" },
  approve: { title: "审批账号申请", description: "核实申请人身份后分配角色。批准后账号立即可用。" },
}

export function UserSheet({ mode, onClose }: { mode: UserSheetMode | null; onClose: () => void }) {
  const t = useT()
  const kind = mode?.kind ?? "create"
  return (
    <Sheet open={!!mode} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 overscroll-contain data-[side=right]:sm:max-w-lg">
        <SheetHeader className="border-b">
          <SheetTitle>{t(TITLES[kind].title)}</SheetTitle>
          <SheetDescription>{t(TITLES[kind].description)}</SheetDescription>
        </SheetHeader>
        {mode?.kind === "create" && <CreateForm onDone={onClose} />}
        {mode?.kind === "edit" && <EditForm key={mode.user.id} user={mode.user} onDone={onClose} />}
        {mode?.kind === "approve" && <ApproveForm key={mode.user.id} user={mode.user} onDone={onClose} />}
      </SheetContent>
    </Sheet>
  )
}

function Body({ children }: { children: React.ReactNode }) {
  return <div className="flex-1 overflow-y-auto px-4 py-6">{children}</div>
}

function Footer({ pending, label, onCancel }: { pending: boolean; label: string; onCancel: () => void }) {
  const t = useT()
  return (
    <SheetFooter className="flex-row justify-end border-t">
      <Button type="button" variant="outline" onClick={onCancel}>
        {t("取消")}
      </Button>
      <Button type="submit" disabled={pending}>
        {pending && <Spinner data-icon="inline-start" />}
        {label}
      </Button>
    </SheetFooter>
  )
}

function ErrorAlert({ error }: { error: unknown }) {
  const t = useT()
  if (!error || (error instanceof ApiError && error.fieldErrors)) return null
  return (
    <Alert variant="destructive">
      <CircleAlertIcon />
      <AlertTitle>{t("操作失败")}</AlertTitle>
      <AlertDescription>{errorMessage(error)}</AlertDescription>
    </Alert>
  )
}

const departmentOptions = (t: TFunction) => DEPARTMENTS.map((d) => ({ value: d, label: t(d) }))

function CreateForm({ onDone }: { onDone: () => void }) {
  const t = useT()
  const create = useCreateUser()
  const form = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      fullName: "",
      employeeId: "",
      department: "",
      email: "",
      phone: "",
      username: "",
      password: "",
      roleIds: [],
    },
  })

  return (
    <form
      noValidate
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={form.handleSubmit((values) =>
        create.mutate(values, {
          onSuccess: (user) => {
            toast.success(t("已开通账号 {username}", { username: user.username }))
            onDone()
          },
          onError: (e) => e instanceof ApiError && applyFieldErrors(e.fieldErrors, form.setError),
        })
      )}
    >
      <Body>
        <FieldGroup>
          <ErrorAlert error={create.error} />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField control={form.control} name="fullName" label={t("姓名")} required />
            <TextField control={form.control} name="employeeId" label={t("工号")} required placeholder="E20417" />
          </div>
          <SelectField control={form.control} name="department" label={t("所属部门")} required options={departmentOptions(t)} />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField control={form.control} name="email" label={t("工作邮箱")} type="email" required />
            <TextField control={form.control} name="phone" label={t("联系电话")} type="tel" required />
          </div>
          <FieldSeparator />
          <TextField control={form.control} name="username" label={t("用户名")} required autoComplete="off" />
          <PasswordField
            control={form.control}
            name="password"
            label={t("初始密码")}
            required
            autoComplete="new-password"
            description={t("用户首次登录后应自行修改")}
          />
          <FieldSeparator />
          <Controller
            control={form.control}
            name="roleIds"
            render={({ field, fieldState }) => (
              <RoleChecklist value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
            )}
          />
        </FieldGroup>
      </Body>
      <Footer pending={create.isPending} label={t("创建账号")} onCancel={onDone} />
    </form>
  )
}

function ReadonlyIdentity({ user }: { user: User }) {
  const t = useT()
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-lg bg-muted/60 p-4 text-sm">
      <dt className="text-muted-foreground">{t("用户名")}</dt>
      <dd className="doc-number">{user.username}</dd>
      <dt className="text-muted-foreground">{t("工号")}</dt>
      <dd className="doc-number">{user.employeeId}</dd>
      <dt className="text-muted-foreground">{t("申请时间")}</dt>
      <dd className="tabular-nums">{formatDateTime(user.createdAt)}</dd>
    </dl>
  )
}

function EditForm({ user, onDone }: { user: User; onDone: () => void }) {
  const t = useT()
  const update = useUpdateUser()
  const form = useForm<z.infer<typeof editSchema>>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      fullName: user.fullName,
      department: user.department,
      email: user.email,
      phone: user.phone,
      roleIds: user.roles.map((r) => r.id),
    },
  })

  return (
    <form
      noValidate
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={form.handleSubmit((values) =>
        update.mutate(
          { id: user.id, ...values },
          {
            onSuccess: () => {
              toast.success(t("用户信息已更新"))
              onDone()
            },
          }
        )
      )}
    >
      <Body>
        <FieldGroup>
          <ErrorAlert error={update.error} />
          <ReadonlyIdentity user={user} />
          <TextField control={form.control} name="fullName" label={t("姓名")} required />
          <SelectField control={form.control} name="department" label={t("所属部门")} required options={departmentOptions(t)} />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField control={form.control} name="email" label={t("工作邮箱")} type="email" required />
            <TextField control={form.control} name="phone" label={t("联系电话")} type="tel" required />
          </div>
          <FieldSeparator />
          <Controller
            control={form.control}
            name="roleIds"
            render={({ field, fieldState }) => (
              <RoleChecklist value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
            )}
          />
        </FieldGroup>
      </Body>
      <Footer pending={update.isPending} label={t("保存")} onCancel={onDone} />
    </form>
  )
}

function ApproveForm({ user, onDone }: { user: User; onDone: () => void }) {
  const t = useT()
  const setStatus = useSetUserStatus()
  const form = useForm<z.infer<typeof approveSchema>>({
    resolver: zodResolver(approveSchema),
    defaultValues: { roleIds: [] },
  })

  return (
    <form
      noValidate
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={form.handleSubmit(({ roleIds }) =>
        setStatus.mutate(
          { id: user.id, status: "active", roleIds },
          {
            onSuccess: () => {
              toast.success(t("已批准 {fullName} 的账号申请", { fullName: user.fullName }))
              onDone()
            },
          }
        )
      )}
    >
      <Body>
        <FieldGroup>
          <ErrorAlert error={setStatus.error} />
          <FieldSet>
            <FieldLegend variant="label">{t("申请人")}</FieldLegend>
            <div className="flex flex-col gap-1">
              <span className="text-base font-semibold">{user.fullName}</span>
              <span className="text-sm text-muted-foreground">
                {t(user.department)} · {user.email} · <span className="tabular-nums">{user.phone}</span>
              </span>
            </div>
            <ReadonlyIdentity user={user} />
          </FieldSet>
          <FieldSeparator />
          <Controller
            control={form.control}
            name="roleIds"
            render={({ field, fieldState }) => (
              <RoleChecklist
                legend={t("分配角色")}
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />
        </FieldGroup>
      </Body>
      <Footer pending={setStatus.isPending} label={t("批准并开通")} onCancel={onDone} />
    </form>
  )
}
