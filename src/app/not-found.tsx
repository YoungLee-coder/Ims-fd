import Link from "next/link"
import { FileQuestionIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { getT } from "@/lib/i18n/server"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

export default async function NotFound() {
  const t = await getT()
  return (
    <main id="main-content" className="flex flex-1 items-center justify-center p-6">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileQuestionIcon />
          </EmptyMedia>
          <EmptyTitle>{t("页面不存在")}</EmptyTitle>
          <EmptyDescription>{t("链接可能已失效，或该记录已被删除。")}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href="/dashboard">{t("返回工作台")}</Link>
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  )
}
