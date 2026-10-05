"use client"

import { useState } from "react"
import { EyeIcon, EyeOffIcon } from "lucide-react"
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form"

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useT } from "@/lib/i18n/client"

interface BaseProps<T extends FieldValues> {
  control: Control<T>
  name: FieldPath<T>
  label: string
  description?: React.ReactNode
  required?: boolean
  disabled?: boolean
  className?: string
}

function Label({ label, required }: { label: string; required?: boolean }) {
  return (
    <>
      {label}
      {required && (
        <span aria-hidden className="text-destructive">
          *
        </span>
      )}
    </>
  )
}

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  required,
  disabled,
  className,
  ...inputProps
}: BaseProps<T> & Omit<React.ComponentProps<typeof Input>, "name" | "defaultValue" | "value">) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} data-disabled={disabled} className={className}>
          <FieldLabel htmlFor={name}>
            <Label label={label} required={required} />
          </FieldLabel>
          <Input
            {...inputProps}
            {...field}
            value={field.value ?? ""}
            id={name}
            disabled={disabled}
            aria-invalid={fieldState.invalid}
            aria-required={required}
          />
          {description && !fieldState.invalid && <FieldDescription>{description}</FieldDescription>}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}

export function TextareaField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  required,
  disabled,
  className,
  ...textareaProps
}: BaseProps<T> & Omit<React.ComponentProps<typeof Textarea>, "name" | "defaultValue" | "value">) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} data-disabled={disabled} className={className}>
          <FieldLabel htmlFor={name}>
            <Label label={label} required={required} />
          </FieldLabel>
          <Textarea
            {...textareaProps}
            {...field}
            value={field.value ?? ""}
            id={name}
            disabled={disabled}
            aria-invalid={fieldState.invalid}
          />
          {description && !fieldState.invalid && <FieldDescription>{description}</FieldDescription>}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}

export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  required,
  disabled,
  className,
  placeholder,
  options,
}: BaseProps<T> & {
  placeholder?: string
  options: { value: string; label: React.ReactNode }[]
}) {
  const t = useT()
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} data-disabled={disabled} className={className}>
          <FieldLabel htmlFor={name}>
            <Label label={label} required={required} />
          </FieldLabel>
          <Select value={field.value ?? ""} onValueChange={field.onChange} disabled={disabled} name={field.name}>
            <SelectTrigger id={name} aria-invalid={fieldState.invalid} onBlur={field.onBlur} className="w-full">
              <SelectValue placeholder={placeholder ?? t("请选择")} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {description && !fieldState.invalid && <FieldDescription>{description}</FieldDescription>}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}

export function PasswordField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  required,
  disabled,
  className,
  autoComplete = "current-password",
}: BaseProps<T> & { autoComplete?: string }) {
  const t = useT()
  const [visible, setVisible] = useState(false)
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} data-disabled={disabled} className={className}>
          <FieldLabel htmlFor={name}>
            <Label label={label} required={required} />
          </FieldLabel>
          <InputGroup>
            <InputGroupInput
              {...field}
              value={field.value ?? ""}
              id={name}
              type={visible ? "text" : "password"}
              autoComplete={autoComplete}
              disabled={disabled}
              aria-invalid={fieldState.invalid}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                onClick={() => setVisible((v) => !v)}
                aria-label={visible ? t("隐藏密码") : t("显示密码")}
                aria-pressed={visible}
              >
                {visible ? <EyeOffIcon /> : <EyeIcon />}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          {description && !fieldState.invalid && <FieldDescription>{description}</FieldDescription>}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}

/** 将后端返回的字段级错误回填到表单 */
export function applyFieldErrors(
  fieldErrors: Record<string, string> | undefined,
  setError: (name: never, error: { type: string; message: string }) => void
) {
  if (!fieldErrors) return false
  for (const [name, message] of Object.entries(fieldErrors)) {
    setError(name as never, { type: "server", message })
  }
  return true
}
