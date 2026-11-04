"use client"

import { useEffect, useSyncExternalStore } from "react"
import { RotateCwIcon, TriangleAlertIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { PORTAL_BASE_PATH } from "@/lib/config"
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "@/lib/i18n/config"
import { createT } from "@/lib/i18n/translate"
import "./globals.css"

const noopSubscribe = () => () => {}

function readLocale(): Locale {
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`))
  return isLocale(match?.[1]) ? match[1] : DEFAULT_LOCALE
}

function readDark() {
  return window.localStorage.getItem("theme") === "dark"
}

function readInPortal() {
  const { pathname } = window.location
  return pathname === PORTAL_BASE_PATH || pathname.startsWith(`${PORTAL_BASE_PATH}/`)
}

/** 替换根布局时生效：拿不到 LocaleProvider 和 ThemeProvider，语言和主题直接从 Cookie / localStorage 读。 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const locale = useSyncExternalStore(noopSubscribe, readLocale, () => DEFAULT_LOCALE)
  const dark = useSyncExternalStore(noopSubscribe, readDark, () => false)
  const inPortal = useSyncExternalStore(noopSubscribe, readInPortal, () => false)
  const t = createT(locale)

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang={locale} className={dark ? "dark h-full" : "h-full"}>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <title>{t("页面出错了")}</title>
        <main className="flex flex-1 items-center justify-center p-6">
          <Empty role="alert">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <TriangleAlertIcon />
              </EmptyMedia>
              <EmptyTitle>{t("页面出错了")}</EmptyTitle>
              <EmptyDescription>{t("页面渲染时发生意外错误，可以重试或返回首页。")}</EmptyDescription>
              {error.digest && (
                <p className="font-mono text-xs text-muted-foreground">
                  {t("错误编号：{digest}", { digest: error.digest })}
                </p>
              )}
            </EmptyHeader>
            <EmptyContent className="flex-row justify-center">
              <Button onClick={() => retry()}>
                <RotateCwIcon data-icon="inline-start" />
                {t("重试")}
              </Button>
              {/* 根布局已崩溃，客户端路由不可靠，用整页跳转回首页 */}
              <Button
                variant="outline"
                onClick={() => window.location.assign(inPortal ? `${PORTAL_BASE_PATH}/applications` : "/dashboard")}
              >
                {inPortal ? t("返回我的申请") : t("返回工作台")}
              </Button>
            </EmptyContent>
          </Empty>
        </main>
      </body>
    </html>
  )
}
