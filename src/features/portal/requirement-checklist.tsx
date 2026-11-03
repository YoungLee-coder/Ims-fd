"use client"

import { useMemo } from "react"
import { CircleAlertIcon, CircleCheckIcon } from "lucide-react"

import { AttachmentList } from "@/features/portal/attachment-list"
import { APPLICATION_FLOWS, groupAttachments, readLocalRequirements } from "@/features/portal/requirements"
import type { Application } from "@/types"
import { useT } from "@/lib/i18n/client"

/**
 * 申请材料按清单项分组展示（只读）。附件都没有归属信息时（旧数据、换了设备）
 * 无法判断哪项缺失，退回普通列表。
 */
export function RequirementChecklist({ application }: { application: Application }) {
  const t = useT()
  const { id, type, attachments } = application
  const local = useMemo(() => (attachments.length ? readLocalRequirements(id) : {}), [id, attachments])
  const groups = useMemo(() => groupAttachments(type, attachments, local), [type, attachments, local])
  const classified = [...groups.keys()].some((key) => key !== "other")

  if (!classified) {
    return <AttachmentList attachments={attachments} emptyHint={t("本次申请尚未上传材料。")} />
  }

  const documents = APPLICATION_FLOWS[type].documents.filter((doc) => doc.required || groups.get(doc.key)?.length)
  return (
    <ul className="flex flex-col gap-4">
      {documents.map((doc) => {
        const files = groups.get(doc.key) ?? []
        return (
          <li key={doc.key} className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm">
              {files.length ? (
                <CircleCheckIcon className="size-4 shrink-0 text-success" />
              ) : (
                <CircleAlertIcon className="size-4 shrink-0 text-destructive" />
              )}
              <span className="font-medium">{t(doc.label)}</span>
              {!doc.required && <span className="text-xs text-muted-foreground">{t("选交")}</span>}
            </div>
            {files.length ? (
              <AttachmentList attachments={files} />
            ) : (
              <p className="pl-6 text-xs text-destructive">{t("未上传")}</p>
            )}
          </li>
        )
      })}
    </ul>
  )
}
