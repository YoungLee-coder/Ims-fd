import { FileIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { formatFileSize } from "@/lib/format"
import type { Attachment, ID } from "@/types"

export function AttachmentList({
  attachments,
  onRemove,
  removing,
  emptyHint = "尚未上传任何材料。",
}: {
  attachments: Attachment[]
  /** 传入后每行显示移除按钮（仅草稿可移除） */
  onRemove?: (id: ID) => void
  removing?: boolean
  emptyHint?: string
}) {
  if (attachments.length === 0) {
    return (
      <Empty className="rounded-lg border border-dashed py-8">
        <EmptyHeader>
          <EmptyTitle className="text-sm">暂无材料</EmptyTitle>
          <EmptyDescription>{emptyHint}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <ul className="flex flex-col divide-y rounded-lg border">
      {attachments.map((attachment) => (
        <li key={attachment.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
          <FileIcon className="size-4 shrink-0 text-muted-foreground" />
          {attachment.url && attachment.url !== "#" ? (
            <a
              href={attachment.url}
              target="_blank"
              rel="noreferrer"
              className="relative z-[1] min-w-0 flex-1 truncate underline-offset-4 hover:underline"
            >
              {attachment.fileName}
            </a>
          ) : (
            <span className="min-w-0 flex-1 truncate">{attachment.fileName}</span>
          )}
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {formatFileSize(attachment.size)}
          </span>
          {onRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              disabled={removing}
              onClick={() => onRemove(attachment.id)}
              aria-label={`移除 ${attachment.fileName}`}
            >
              <XIcon />
            </Button>
          )}
        </li>
      ))}
    </ul>
  )
}
