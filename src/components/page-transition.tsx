"use client"

import { ViewTransition } from "react"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

/**
 * 路由切换时让主内容区淡出、新页面上移淡入，页头与侧栏不参与动画。
 * 以 pathname 为 key：只改查询参数（筛选条件、草稿 ID）不算换页。
 * 切换语言时同一页面原地更新，内容做一次交叉淡化。
 */
export function PageTransition({ children, className }: { children: React.ReactNode; className?: string }) {
  const pathname = usePathname()
  return (
    <ViewTransition
      key={pathname}
      enter="page-enter"
      exit="page-exit"
      update={{ "locale-change": "locale-change", default: "none" }}
      default="none"
    >
      <div className={cn("flex flex-1 flex-col", className)}>{children}</div>
    </ViewTransition>
  )
}
