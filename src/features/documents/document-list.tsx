"use client"

import { useState } from "react"
import {
  BadgeCheckIcon,
  EllipsisIcon,
  FileTextIcon,
  PaperclipIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import { ValidityBadge, VerificationBadge } from "@/components/status-badges"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { errorMessage } from "@/lib/api/client"
import { countryName, DOCUMENT_TYPE_LABELS } from "@/lib/constants"
import { formatDate, formatDateTime, formatFileSize } from "@/lib/format"
import { useAuth } from "@/features/auth/auth-provider"
import { Can } from "@/features/auth/require-permission"
import { useDeleteDocument, useDocuments } from "@/features/documents/api"
import { DocumentSheet } from "@/features/documents/document-sheet"
import { VerifyDialog } from "@/features/documents/verify-dialog"
import type { Applicant, IdentityDocument } from "@/types"

export function DocumentList({ applicant }: { applicant: Applicant }) {
  const { data, isPending, isError, error } = useDocuments(applicant.id)
  const remove = useDeleteDocument(applicant.id)
  const [editing, setEditing] = useState<{ open: boolean; doc?: IdentityDocument }>({ open: false })
  const [verifying, setVerifying] = useState<IdentityDocument | null>(null)
  const [deleting, setDeleting] = useState<IdentityDocument | null>(null)

  const openCreate = () => setEditing({ open: true })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          修改已核验证件的信息后，需要重新核验。
        </p>
        <Can anyOf="document.create">
          <Button onClick={openCreate}>
            <PlusIcon data-icon="inline-start" />
            登记证件
          </Button>
        </Can>
      </div>

      {isPending ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : isError ? (
        <Empty className="rounded-lg border py-10">
          <EmptyHeader>
            <EmptyTitle>证件加载失败</EmptyTitle>
            <EmptyDescription>{errorMessage(error)}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : data.length === 0 ? (
        <Empty className="rounded-lg border border-dashed py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileTextIcon />
            </EmptyMedia>
            <EmptyTitle>尚未登记证件</EmptyTitle>
            <EmptyDescription>通常先登记护照，再登记签证或居留许可。</EmptyDescription>
          </EmptyHeader>
          <Can anyOf="document.create">
            <EmptyContent>
              <Button variant="outline" onClick={openCreate}>
                登记第一份证件
              </Button>
            </EmptyContent>
          </Can>
        </Empty>
      ) : (
        <ul className="flex flex-col divide-y rounded-lg border bg-card">
          {data.map((doc) => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              onEdit={() => setEditing({ open: true, doc })}
              onVerify={() => setVerifying(doc)}
              onDelete={() => setDeleting(doc)}
            />
          ))}
        </ul>
      )}

      <DocumentSheet
        applicant={applicant}
        document={editing.doc}
        open={editing.open}
        onOpenChange={(open) => setEditing((s) => ({ ...s, open }))}
      />
      <VerifyDialog document={verifying} onOpenChange={(open) => !open && setVerifying(null)} />

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除这份证件记录？</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && (
                <>
                  {DOCUMENT_TYPE_LABELS[deleting.type]} <span className="doc-number">{deleting.number}</span>{" "}
                  及其 {deleting.attachments.length} 个附件将被删除，无法恢复。
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() =>
                deleting &&
                remove.mutate(deleting.id, {
                  onSuccess: () => toast.success("证件记录已删除"),
                  onError: (e) => toast.error(errorMessage(e)),
                })
              }
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function DocumentRow({
  doc,
  onEdit,
  onVerify,
  onDelete,
}: {
  doc: IdentityDocument
  onEdit: () => void
  onVerify: () => void
  onDelete: () => void
}) {
  const { can } = useAuth()
  const canUpdate = can("document.update")
  const canVerify = can("document.verify")
  const canDelete = can("document.delete")
  const hasMenu = canUpdate || canDelete || (canVerify && doc.verification !== "pending")

  return (
    <li className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:gap-6 sm:p-5">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="text-sm font-medium">{DOCUMENT_TYPE_LABELS[doc.type]}</span>
          <span className="doc-number text-base font-semibold">{doc.number}</span>
          <ValidityBadge expiryDate={doc.expiryDate} />
          <VerificationBadge status={doc.verification} />
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm lg:grid-cols-4">
          <div className="flex flex-col">
            <dt className="text-xs text-muted-foreground">签发国家</dt>
            <dd>
              {countryName(doc.issuingCountry)} <span className="doc-number text-muted-foreground">{doc.issuingCountry}</span>
            </dd>
          </div>
          <div className="flex min-w-0 flex-col">
            <dt className="text-xs text-muted-foreground">签发机关</dt>
            <dd className="truncate" title={doc.issuingAuthority}>
              {doc.issuingAuthority}
            </dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-xs text-muted-foreground">签发日期</dt>
            <dd className="tabular-nums">{formatDate(doc.issueDate)}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-xs text-muted-foreground">有效期至</dt>
            <dd className="tabular-nums">{doc.expiryDate ? formatDate(doc.expiryDate) : "长期"}</dd>
          </div>
        </dl>

        {doc.attachments.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="附件">
            {doc.attachments.map((a) => (
              <li key={a.id}>
                <a
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => a.url === "#" && e.preventDefault()}
                  className="inline-flex max-w-64 items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs transition-colors hover:bg-accent"
                >
                  <PaperclipIcon className="size-3 shrink-0" />
                  <span className="truncate">{a.fileName}</span>
                  <span className="shrink-0 text-muted-foreground tabular-nums">{formatFileSize(a.size)}</span>
                </a>
              </li>
            ))}
          </ul>
        )}

        {doc.verification !== "pending" && (
          <p className="text-xs text-muted-foreground">
            {doc.verifiedBy} 于 <span className="tabular-nums">{formatDateTime(doc.verifiedAt)}</span>{" "}
            {doc.verification === "verified" ? "核验通过" : "驳回"}
            {doc.verificationNote && <span className="text-foreground">：{doc.verificationNote}</span>}
          </p>
        )}
      </div>

      {(canUpdate || canVerify || canDelete) && (
        <div className="flex shrink-0 items-center gap-2 sm:w-32 sm:justify-end">
          {canVerify && doc.verification === "pending" && (
            <Button variant="outline" size="sm" onClick={onVerify}>
              <BadgeCheckIcon data-icon="inline-start" />
              核验
            </Button>
          )}
          {hasMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`${doc.number} 的更多操作`}>
                <EllipsisIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuGroup>
                {canUpdate && (
                  <DropdownMenuItem onSelect={onEdit}>
                    <PencilIcon />
                    编辑
                  </DropdownMenuItem>
                )}
                {canVerify && doc.verification !== "pending" && (
                  <DropdownMenuItem onSelect={onVerify}>
                    <BadgeCheckIcon />
                    重新核验
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
              {canDelete && (
                <>
                  {(canUpdate || canVerify) && <DropdownMenuSeparator />}
                  <DropdownMenuGroup>
                    <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                      <Trash2Icon />
                      删除
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          )}
        </div>
      )}
    </li>
  )
}
