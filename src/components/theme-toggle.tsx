"use client"

import { MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { useT } from "@/lib/i18n/client"

/** 浅色 / 深色切换。图标由 .dark 类决定，首屏渲染与水合结果一致，不会闪烁。 */
export function ThemeToggle() {
  const t = useT()
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={t("切换浅色与深色")}
      title={t("切换浅色与深色")}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <MoonIcon className="dark:hidden" />
      <SunIcon className="hidden dark:block" />
    </Button>
  )
}
