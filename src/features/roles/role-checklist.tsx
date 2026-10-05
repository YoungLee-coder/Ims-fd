"use client"

import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Skeleton } from "@/components/ui/skeleton"
import { useRoles } from "@/features/roles/api"
import type { ID } from "@/types"
import { useT } from "@/lib/i18n/client"

export function RoleChecklist({
  value,
  onChange,
  error,
  legend,
}: {
  value: ID[]
  onChange: (value: ID[]) => void
  error?: string
  legend?: string
}) {
  const t = useT()
  const { data: roles, isPending } = useRoles()

  return (
    <FieldSet data-invalid={!!error}>
      <FieldLegend variant="label">{legend ?? t("角色")}</FieldLegend>
      <FieldDescription>{t("用户的权限为所选角色权限的并集。")}</FieldDescription>
      {isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {roles?.map((role) => {
            const checked = value.includes(role.id)
            return (
              <FieldLabel key={role.id} htmlFor={`role-${role.id}`}>
                <Field orientation="horizontal">
                  <Checkbox
                    id={`role-${role.id}`}
                    checked={checked}
                    onCheckedChange={(next) =>
                      onChange(next ? [...value, role.id] : value.filter((id) => id !== role.id))
                    }
                  />
                  <FieldContent>
                    <span className="flex items-center gap-2 font-medium">
                      {t(role.name)}
                      {role.builtIn && <Badge variant="secondary">{t("内置")}</Badge>}
                    </span>
                    <FieldDescription>{t(role.description)}</FieldDescription>
                  </FieldContent>
                </Field>
              </FieldLabel>
            )
          })}
        </div>
      )}
      {error && <FieldError>{t(error)}</FieldError>}
    </FieldSet>
  )
}
