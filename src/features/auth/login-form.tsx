"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { CircleAlertIcon } from "lucide-react"

import { PasswordField, TextField } from "@/components/form/fields"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { errorMessage } from "@/lib/api/client"
import { setSession } from "@/lib/api/session"
import { appConfig } from "@/lib/config"
import { authApi, authKeys } from "@/features/auth/api"
import { loginSchema, type LoginValues } from "@/features/auth/schemas"

const DEMO_ACCOUNT = { username: "admin", password: "Admin@2026", role: "系统管理员" }

function safeNext(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/dashboard"
  if (next.startsWith("/login") || next.startsWith("/register")) return "/dashboard"
  return next
}

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  })

  const login = useMutation({
    mutationFn: authApi.login,
    onSuccess: (result) => {
      setSession(result.accessToken, result.expiresIn)
      queryClient.setQueryData(authKeys.me, result.user)
      router.replace(safeNext(searchParams.get("next")))
    },
  })

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-2xl font-semibold">登录</h2>
        <p className="text-sm text-muted-foreground">使用工作账号登录{appConfig.systemName}。</p>
      </div>

      <form method="post" noValidate onSubmit={form.handleSubmit((values) => login.mutate(values))} className="flex flex-col gap-6">
        {login.isError && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>无法登录</AlertTitle>
            <AlertDescription>{errorMessage(login.error)}</AlertDescription>
          </Alert>
        )}
        <FieldGroup>
          <TextField control={form.control} name="username" label="用户名" autoComplete="username" autoFocus />
          <PasswordField control={form.control} name="password" label="密码" />
        </FieldGroup>
        <Button type="submit" size="lg" disabled={login.isPending || login.isSuccess}>
          {(login.isPending || login.isSuccess) && <Spinner data-icon="inline-start" />}
          登录
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">
        新入职人员？
        <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
          申请开通账号
        </Link>
      </p>

      <section aria-labelledby="demo-accounts" className="flex flex-col gap-3">
        <Separator />
        <div className="flex items-baseline justify-between">
          <h3 id="demo-accounts" className="text-xs font-medium text-muted-foreground">
            演示账号
          </h3>
        </div>
        <ul className="flex flex-col">
          <li>
            <button
              type="button"
              onClick={() => {
                form.reset(DEMO_ACCOUNT)
                login.reset()
              }}
              className="flex w-full items-center justify-between gap-4 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:bg-accent"
            >
              <span className="doc-number">{DEMO_ACCOUNT.username}</span>
              <span className="text-muted-foreground">{DEMO_ACCOUNT.role}</span>
            </button>
          </li>
        </ul>
      </section>
    </div>
  )
}
