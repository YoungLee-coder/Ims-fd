"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { CircleAlertIcon } from "lucide-react"

import { PasswordField, TextField } from "@/components/form/fields"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { errorMessage } from "@/lib/api/client"
import { setPortalSession } from "@/lib/api/session"
import { portalAuthApi, portalAuthKeys } from "@/features/portal/api"
import { portalLoginSchema, type PortalLoginValues } from "@/features/portal/schemas"

/** 只允许跳回门户内部路径，避免 next 参数把用户带到其他系统。 */
function safeNext(next: string | null) {
  if (!next || !next.startsWith("/portal/") || next.startsWith("//")) return "/portal/applications"
  if (next.startsWith("/portal/login") || next.startsWith("/portal/register")) return "/portal/applications"
  return next
}

export function PortalLoginForm() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const form = useForm<PortalLoginValues>({
    resolver: zodResolver(portalLoginSchema),
    defaultValues: { email: "", password: "" },
  })

  const login = useMutation({
    mutationFn: portalAuthApi.login,
    onSuccess: (result) => {
      setPortalSession(result.accessToken, result.expiresIn)
      queryClient.setQueryData(portalAuthKeys.me, result.account)
      // 在事件回调里读取查询参数，页面因此无需 useSearchParams，可以直接服务端渲染
      router.replace(safeNext(new URLSearchParams(window.location.search).get("next")))
    },
  })

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold">申请人登录</h1>
        <p className="text-sm text-muted-foreground">使用注册邮箱登录，查询办理进度或提交新的申请。</p>
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
          <TextField
            control={form.control}
            name="email"
            label="电子邮箱"
            type="email"
            required
            autoComplete="email"
            autoFocus
          />
          <PasswordField control={form.control} name="password" label="密码" required />
        </FieldGroup>
        <Button type="submit" size="lg" disabled={login.isPending || login.isSuccess}>
          {(login.isPending || login.isSuccess) && <Spinner data-icon="inline-start" />}
          登录
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">
        还没有账号？
        <Link href="/portal/register" className="font-medium text-primary underline-offset-4 hover:underline">
          注册申请人账号
        </Link>
      </p>
    </div>
  )
}
