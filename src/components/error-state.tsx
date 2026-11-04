"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ArrowLeftIcon, BriefcaseBusinessIcon, RotateCwIcon, TriangleAlertIcon, UserRoundIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { ApiError, errorMessage } from "@/lib/api/client"
import { PORTAL_BASE_PATH } from "@/lib/config"
import { useT } from "@/lib/i18n/client"

/** 门户与职工系统登录域不同，出错后只能把用户带回各自的首页。 */
function useHomeLink() {
  const t = useT()
  const pathname = usePathname() ?? ""
  const inPortal = pathname === PORTAL_BASE_PATH || pathname.startsWith(`${PORTAL_BASE_PATH}/`)
  return inPortal
    ? { href: `${PORTAL_BASE_PATH}/applications`, label: t("返回我的申请") }
    : { href: "/dashboard", label: t("返回工作台") }
}

export function ErrorState({
  error,
  retry,
  className,
}: {
  error: Error & { digest?: string }
  retry: () => void
  className?: string
}) {
  const t = useT()
  const home = useHomeLink()

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <Empty role="alert" className={className}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <TriangleAlertIcon />
        </EmptyMedia>
        <EmptyTitle>{t("页面出错了")}</EmptyTitle>
        <EmptyDescription>
          {/* 非接口错误的 message 是给开发者看的堆栈信息，不直接展示 */}
          {error instanceof ApiError ? errorMessage(error) : t("页面渲染时发生意外错误，可以重试或返回首页。")}
        </EmptyDescription>
        {error.digest && (
          <p className="font-mono text-xs text-muted-foreground">{t("错误编号：{digest}", { digest: error.digest })}</p>
        )}
      </EmptyHeader>
      <EmptyContent className="flex-row justify-center">
        <Button onClick={() => retry()}>
          <RotateCwIcon data-icon="inline-start" />
          {t("重试")}
        </Button>
        <Button variant="outline" asChild>
          <Link href={home.href}>{home.label}</Link>
        </Button>
      </EmptyContent>
    </Empty>
  )
}

/** `showEntries`：外壳之外的 404 不知道访客属于哪个登录域，同时给出申请人与工作人员两个入口。 */
export function NotFoundState({ className, showEntries = false }: { className?: string; showEntries?: boolean }) {
  const t = useT()
  const router = useRouter()
  const home = useHomeLink()

  if (showEntries) {
    return (
      <Empty className={className}>
        <EmptyHeader>
          <p className="mb-2 font-mono text-5xl font-semibold tracking-tight text-muted-foreground/50" aria-hidden>
            404
          </p>
          <EmptyTitle>{t("页面不存在")}</EmptyTitle>
          <EmptyDescription>{t("链接可能已失效，或该记录已被删除。")}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div className="flex justify-center gap-2.5">
            <Button asChild>
              <Link href={PORTAL_BASE_PATH}>
                <UserRoundIcon data-icon="inline-start" />
                {t("申请人")}
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard">
                <BriefcaseBusinessIcon data-icon="inline-start" />
                {t("工作人员")}
              </Link>
            </Button>
          </div>
          <Button variant="link" size="sm" className="text-muted-foreground" onClick={() => router.back()}>
            <ArrowLeftIcon data-icon="inline-start" />
            {t("返回上一页")}
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <Empty className={className}>
      <EmptyHeader>
        <p className="mb-2 font-mono text-5xl font-semibold tracking-tight text-muted-foreground/50" aria-hidden>
          404
        </p>
        <EmptyTitle>{t("页面不存在")}</EmptyTitle>
        <EmptyDescription>{t("链接可能已失效，或该记录已被删除。")}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row justify-center">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeftIcon data-icon="inline-start" />
          {t("返回上一页")}
        </Button>
        <Button asChild>
          <Link href={home.href}>{home.label}</Link>
        </Button>
      </EmptyContent>
    </Empty>
  )
}
