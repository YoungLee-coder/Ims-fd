import Link from "next/link"
import { FileQuestionIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

export default function NotFound() {
  return (
    <main id="main-content" className="flex flex-1 items-center justify-center p-6">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileQuestionIcon />
          </EmptyMedia>
          <EmptyTitle>页面不存在</EmptyTitle>
          <EmptyDescription>链接可能已失效，或该记录已被删除。</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href="/dashboard">返回工作台</Link>
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  )
}
