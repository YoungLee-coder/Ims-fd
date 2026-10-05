"use client"

import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CircleAlertIcon, LockIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"

import { applyFieldErrors, TextareaField, TextField } from "@/components/form/fields"
import { PageHeader } from "@/components/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { ApiError, errorMessage } from "@/lib/api/client"
import { PERMISSION_MODULES } from "@/lib/permissions"
import { cn } from "@/lib/utils"
import { useAuth } from "@/features/auth/auth-provider"
import { useDeleteRole, usePermissions, useRoles, useSaveRole } from "@/features/roles/api"
import type { Permission, PermissionCode, Role } from "@/types"
import { useT } from "@/lib/i18n/client"

const roleSchema = z.object({
  name: z.string().trim().min(2, "角色名称至少 2 个字").max(20, "最多 20 个字"),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z][A-Z0-9_]{2,31}$/, "3–32 位大写字母、数字或下划线，以字母开头"),
  description: z.string().trim().max(120, "最多 120 个字"),
  permissions: z.array(z.string()).min(1, "至少选择一项权限"),
})
type RoleFormValues = z.infer<typeof roleSchema>

const NEW = "__new__"

export function RoleManager() {
  const t = useT()
  const { can } = useAuth()
  const canManage = can("role.manage")
  const roles = useRoles()
  const permissions = usePermissions()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const current = selectedId === NEW ? undefined : (roles.data?.find((r) => r.id === selectedId) ?? roles.data?.[0])
  const activeId = selectedId === NEW ? NEW : current?.id

  return (
    <div className="flex flex-col">
      <PageHeader
        title={t("角色与权限")}
        description={t("用户可持有多个角色，权限取各角色的并集。内置角色由系统维护，不可修改。")}
        actions={
          canManage && (
            <Button onClick={() => setSelectedId(NEW)} disabled={selectedId === NEW}>
              <PlusIcon data-icon="inline-start" />
              {t("新建角色")}
            </Button>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <nav aria-label={t("角色列表")} className="flex flex-col gap-1 self-start rounded-lg border bg-card p-1.5">
          {roles.isPending
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
            : roles.data?.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedId(role.id)}
                  aria-current={activeId === role.id ? "true" : undefined}
                  className={cn(
                    "flex flex-col gap-0.5 rounded-md px-3 py-2.5 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
                    activeId === role.id && "bg-accent text-accent-foreground hover:bg-accent"
                  )}
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {t(role.name)}
                    {role.builtIn && <LockIcon className="size-3 text-muted-foreground" aria-label={t("内置角色")} />}
                  </span>
                  <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="doc-number truncate">{role.code}</span>
                    <span className="shrink-0 tabular-nums">{t("{count} 人", { count: role.userCount })}</span>
                  </span>
                </button>
              ))}
          {selectedId === NEW && (
            <div className="flex flex-col gap-0.5 rounded-md bg-accent px-3 py-2.5 text-accent-foreground" aria-current="true">
              <span className="text-sm font-medium">{t("新角色")}</span>
              <span className="text-xs text-muted-foreground">{t("未保存")}</span>
            </div>
          )}
        </nav>

        <div className="min-w-0 rounded-lg border bg-card">
          {roles.isPending || permissions.isPending ? (
            <div className="flex flex-col gap-4 p-6">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : roles.isError || permissions.isError ? (
            <Alert variant="destructive" className="m-6 w-auto">
              <CircleAlertIcon />
              <AlertTitle>{t("加载失败")}</AlertTitle>
              <AlertDescription>{errorMessage(roles.error ?? permissions.error)}</AlertDescription>
            </Alert>
          ) : (
            <RoleEditor
              key={activeId + (current?.updatedAt ?? "")}
              role={current}
              permissions={permissions.data}
              readOnly={!canManage || !!current?.builtIn}
              onSaved={(role) => setSelectedId(role.id)}
              onCancelNew={() => setSelectedId(null)}
              onDeleted={() => setSelectedId(null)}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function RoleEditor({
  role,
  permissions,
  readOnly,
  onSaved,
  onCancelNew,
  onDeleted,
}: {
  role?: Role
  permissions: Permission[]
  readOnly: boolean
  onSaved: (role: Role) => void
  onCancelNew: () => void
  onDeleted: () => void
}) {
  const t = useT()
  const save = useSaveRole()
  const remove = useDeleteRole()
  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: role?.name ?? "",
      code: role?.code ?? "",
      description: role?.description ?? "",
      permissions: role?.permissions ?? [],
    },
  })
  const isNew = !role

  function onSubmit(values: RoleFormValues) {
    save.mutate(
      { id: role?.id, ...values, permissions: values.permissions as PermissionCode[] },
      {
        onSuccess: (saved) => {
          toast.success(isNew ? t("已创建角色「{name}」", { name: saved.name }) : t("角色权限已保存"))
          onSaved(saved)
        },
        onError: (e) => e instanceof ApiError && applyFieldErrors(e.fieldErrors, form.setError),
      }
    )
  }

  const serverError = save.isError && !(save.error instanceof ApiError && save.error.fieldErrors)

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
      <div className="flex flex-col gap-8 p-5 sm:p-6">
        {role?.builtIn && (
          <Alert>
            <LockIcon />
            <AlertTitle>{t("系统内置角色")}</AlertTitle>
            <AlertDescription>{t("内置角色的权限由系统维护，如需不同的权限组合，请新建角色。")}</AlertDescription>
          </Alert>
        )}
        {serverError && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>{t("保存失败")}</AlertTitle>
            <AlertDescription>{errorMessage(save.error)}</AlertDescription>
          </Alert>
        )}

        <FieldGroup className="max-w-2xl">
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField control={form.control} name="name" label={t("角色名称")} required disabled={readOnly} />
            <TextField
              control={form.control}
              name="code"
              label={t("角色编码")}
              required
              disabled={readOnly || !isNew}
              description={isNew ? t("创建后不可修改，供后端鉴权使用") : undefined}
              className="[&_input]:doc-number [&_input]:uppercase"
            />
          </div>
          <TextareaField control={form.control} name="description" label={t("职责说明")} rows={2} disabled={readOnly} />
        </FieldGroup>

        <Controller
          control={form.control}
          name="permissions"
          render={({ field, fieldState }) => (
            <PermissionMatrix
              permissions={permissions}
              value={field.value as PermissionCode[]}
              onChange={field.onChange}
              disabled={readOnly}
              error={fieldState.error?.message}
            />
          )}
        />
      </div>

      {!readOnly && (
        <div className="flex items-center justify-between gap-2 border-t px-5 py-4 sm:px-6">
          {role ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="ghost" className="text-destructive" disabled={remove.isPending}>
                  <Trash2Icon data-icon="inline-start" />
                  {t("删除角色")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("删除角色「{name}」？", { name: role.name })}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {role.userCount > 0
                      ? t("仍有 {userCount} 名用户持有该角色，需先在用户管理中移除后才能删除。", { userCount: role.userCount })
                      : t("删除后无法恢复。")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("取消")}</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    disabled={role.userCount > 0}
                    onClick={() =>
                      remove.mutate(role.id, {
                        onSuccess: () => {
                          toast.success(t("角色已删除"))
                          onDeleted()
                        },
                        onError: (e) => toast.error(errorMessage(e)),
                      })
                    }
                  >
                    {t("删除")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-3">
            {form.formState.isDirty && <span className="text-xs text-muted-foreground">{t("有未保存的更改")}</span>}
            <Button
              type="button"
              variant="outline"
              onClick={() => (isNew ? onCancelNew() : form.reset())}
              disabled={!isNew && !form.formState.isDirty}
            >
              {isNew ? t("取消") : t("撤销更改")}
            </Button>
            <Button type="submit" disabled={save.isPending || (!isNew && !form.formState.isDirty)}>
              {save.isPending && <Spinner data-icon="inline-start" />}
              {isNew ? t("创建角色") : t("保存")}
            </Button>
          </div>
        </div>
      )}
    </form>
  )
}

function PermissionMatrix({
  permissions,
  value,
  onChange,
  disabled,
  error,
}: {
  permissions: Permission[]
  value: PermissionCode[]
  onChange: (value: PermissionCode[]) => void
  disabled: boolean
  error?: string
}) {
  const t = useT()
  const toggle = (codes: PermissionCode[], on: boolean) =>
    onChange(on ? [...new Set([...value, ...codes])] : value.filter((c) => !codes.includes(c)))

  return (
    <section aria-labelledby="perm-title" className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="perm-title" className="font-semibold">
          {t("权限")}
        </h2>
        <span className="text-sm text-muted-foreground tabular-nums">
          {t("已选 {selected} / {total}", { selected: value.length, total: permissions.length })}
        </span>
      </div>
      {error && <p className="text-sm text-destructive">{t(error)}</p>}

      <div className="flex flex-col divide-y rounded-lg border">
        {PERMISSION_MODULES.map(({ module, name }) => {
          const items = permissions.filter((p) => p.module === module)
          if (!items.length) return null
          const codes = items.map((p) => p.code)
          const selected = codes.filter((c) => value.includes(c)).length
          const state = selected === 0 ? false : selected === codes.length ? true : "indeterminate"

          return (
            <FieldSet key={module} className="gap-0 p-4" disabled={disabled}>
              <Field orientation="horizontal" className="mb-3">
                <Checkbox
                  id={`module-${module}`}
                  checked={state}
                  onCheckedChange={(next) => toggle(codes, next === true)}
                  disabled={disabled}
                />
                <FieldLabel htmlFor={`module-${module}`} className="font-semibold">
                  {t(name)}
                </FieldLabel>
                <Badge variant="secondary" className="ml-auto tabular-nums">
                  {selected}/{codes.length}
                </Badge>
              </Field>
              <div className="grid gap-x-6 gap-y-3 pl-6 sm:grid-cols-2">
                {items.map((p) => (
                  <Field key={p.code} orientation="horizontal" data-disabled={disabled}>
                    <Checkbox
                      id={`perm-${p.code}`}
                      checked={value.includes(p.code)}
                      onCheckedChange={(next) => toggle([p.code], next === true)}
                      disabled={disabled}
                    />
                    <FieldContent>
                      <FieldLabel htmlFor={`perm-${p.code}`}>
                        {t(p.name)}
                        <span className="doc-number text-xs font-normal text-muted-foreground">{p.code}</span>
                      </FieldLabel>
                      <FieldDescription>{t(p.description)}</FieldDescription>
                    </FieldContent>
                  </Field>
                ))}
              </div>
            </FieldSet>
          )
        })}
      </div>
    </section>
  )
}
