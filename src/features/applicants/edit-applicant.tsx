"use client"

import Link from "next/link"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { errorMessage } from "@/lib/api/client"
import { useApplicant } from "@/features/applicants/api"
import { ApplicantForm } from "@/features/applicants/applicant-form"

export function EditApplicant({ id }: { id: string }) {
  const { data, isPending, isError, error } = useApplicant(id)

  if (isPending) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (isError) {
    return (
      <Empty className="min-h-[50vh]">
        <EmptyHeader>
          <EmptyTitle>无法加载档案</EmptyTitle>
          <EmptyDescription>{errorMessage(error)}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" asChild>
            <Link href="/applicants">返回档案列表</Link>
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <>
      <PageHeader
        title={`编辑档案 · ${data.surname} ${data.givenNames}`}
        description={<span className="doc-number">{data.fileNo}</span>}
        className="mb-10"
      />
      <ApplicantForm key={data.updatedAt} applicant={data} />
    </>
  )
}
