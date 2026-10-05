"use client"

import { Badge } from "@/components/ui/badge"
import {
  APPLICANT_STATUS_LABELS,
  APPLICATION_STATUS_LABELS,
  USER_STATUS_LABELS,
  VERIFICATION_LABELS,
} from "@/lib/constants"
import { getValidity } from "@/lib/format"
import { useT } from "@/lib/i18n/client"
import type {
  ApplicantStatus,
  ApplicationStatus,
  UserStatus,
  VerificationStatus,
} from "@/types"

type BadgeVariant = React.ComponentProps<typeof Badge>["variant"]

const APPLICANT_VARIANT: Record<ApplicantStatus, BadgeVariant> = {
  active: "success",
  under_review: "warning",
  archived: "secondary",
}

const USER_VARIANT: Record<UserStatus, BadgeVariant> = {
  active: "success",
  pending: "warning",
  disabled: "secondary",
  rejected: "destructive",
}

const VERIFICATION_VARIANT: Record<VerificationStatus, BadgeVariant> = {
  verified: "success",
  pending: "outline",
  rejected: "destructive",
}

const APPLICATION_VARIANT: Record<ApplicationStatus, BadgeVariant> = {
  draft: "secondary",
  submitted: "outline",
  under_review: "default",
  // 需要申请人行动，用醒目色提示
  supplement_required: "warning",
  approved: "success",
  rejected: "destructive",
  withdrawn: "secondary",
}

export function ApplicantStatusBadge({ status }: { status: ApplicantStatus }) {
  const t = useT()
  return <Badge variant={APPLICANT_VARIANT[status]}>{t(APPLICANT_STATUS_LABELS[status])}</Badge>
}

export function UserStatusBadge({ status }: { status: UserStatus }) {
  const t = useT()
  return <Badge variant={USER_VARIANT[status]}>{t(USER_STATUS_LABELS[status])}</Badge>
}

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const t = useT()
  return <Badge variant={VERIFICATION_VARIANT[status]}>{t(VERIFICATION_LABELS[status])}</Badge>
}

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  const t = useT()
  return <Badge variant={APPLICATION_VARIANT[status]}>{t(APPLICATION_STATUS_LABELS[status])}</Badge>
}

export function ValidityBadge({ expiryDate }: { expiryDate: string | null }) {
  const t = useT()
  const { state, daysLeft } = getValidity(expiryDate)
  switch (state) {
    case "permanent":
      return <Badge variant="secondary">{t("长期有效")}</Badge>
    case "expired":
      return <Badge variant="destructive">{t("已过期 {days} 天", { days: Math.abs(daysLeft!) })}</Badge>
    case "expiring":
      return <Badge variant="warning">{daysLeft === 0 ? t("今日到期") : t("{days} 天后到期", { days: daysLeft! })}</Badge>
    default:
      return <Badge variant="success">{t("有效")}</Badge>
  }
}
