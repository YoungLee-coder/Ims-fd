import type { TFunction } from "@/lib/i18n/translate"
import type {
  ApplicantStatus,
  ApplicationDecisionAction,
  ApplicationStatus,
  ApplicationType,
  DocumentType,
  MaritalStatus,
  Sex,
  UserStatus,
  VerificationStatus,
} from "@/types"

export const COUNTRIES: { code: string; name: string }[] = [
  { code: "UTO", name: "本国" },
  { code: "AUS", name: "澳大利亚" },
  { code: "BRA", name: "巴西" },
  { code: "CAN", name: "加拿大" },
  { code: "CHN", name: "中国" },
  { code: "DEU", name: "德国" },
  { code: "EGY", name: "埃及" },
  { code: "FRA", name: "法国" },
  { code: "GBR", name: "英国" },
  { code: "IDN", name: "印度尼西亚" },
  { code: "IND", name: "印度" },
  { code: "JPN", name: "日本" },
  { code: "KOR", name: "韩国" },
  { code: "MEX", name: "墨西哥" },
  { code: "NGA", name: "尼日利亚" },
  { code: "PAK", name: "巴基斯坦" },
  { code: "PHL", name: "菲律宾" },
  { code: "RUS", name: "俄罗斯" },
  { code: "SWE", name: "瑞典" },
  { code: "THA", name: "泰国" },
  { code: "USA", name: "美国" },
  { code: "VNM", name: "越南" },
]

export function countryName(code: string, t: TFunction) {
  const name = COUNTRIES.find((c) => c.code === code)?.name
  return name ? t(name) : code
}

export const DEPARTMENTS = [
  "签证审批处",
  "出入境边防检查处",
  "居留管理处",
  "档案信息中心",
  "信息技术处",
  "督察审计处",
]

export const SEX_LABELS: Record<Sex, string> = {
  M: "男",
  F: "女",
  X: "未指明",
}

export const MARITAL_LABELS: Record<MaritalStatus, string> = {
  single: "未婚",
  married: "已婚",
  divorced: "离异",
  widowed: "丧偶",
}

export const APPLICANT_STATUS_LABELS: Record<ApplicantStatus, string> = {
  active: "在档",
  under_review: "审查中",
  archived: "已归档",
}

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  pending: "待审核",
  active: "正常",
  disabled: "已停用",
  rejected: "已驳回",
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  passport: "护照",
  visa: "签证",
  residence_permit: "居留许可",
  national_id: "身份证",
  travel_document: "旅行证件",
  birth_certificate: "出生证明",
}

export const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  pending: "待核验",
  verified: "已核验",
  rejected: "已驳回",
}

/** 证件剩余有效期低于该天数即提示 */
export const EXPIRY_WARNING_DAYS = 180

export const ATTACHMENT_ACCEPT = ".pdf,.jpg,.jpeg,.png"
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024
export const ATTACHMENT_MAX_COUNT = 10

/* ---------- 申请人门户 ---------- */

export const APPLICATION_TYPE_LABELS: Record<ApplicationType, string> = {
  visa: "签证申请",
  residence_permit: "居留许可申请",
  residence_extension: "居留许可延期",
  permanent_residence: "永久居留申请",
  travel_document: "旅行证件申请",
}

export const APPLICATION_TYPE_HINTS: Record<ApplicationType, string> = {
  visa: "入境前申请的签证，适用于旅游、商务、工作、学习等事由。",
  residence_permit: "入境后需在境内停留 90 天以上时申请居留许可。",
  residence_extension: "居留许可到期前 30 日内申请延期。",
  permanent_residence: "在境内连续居留满规定年限后申请永久居留资格。",
  travel_document: "护照遗失、损毁或过期时申请一次性出入境旅行证件。",
}

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  draft: "草稿",
  submitted: "待受理",
  under_review: "审核中",
  supplement_required: "待补件",
  approved: "已通过",
  rejected: "已驳回",
  withdrawn: "已撤回",
}

/** 已提交、尚可由申请人撤回的状态 */
export const WITHDRAWABLE_STATUSES: ApplicationStatus[] = [
  "submitted",
  "under_review",
  "supplement_required",
]

export const DECISION_ACTION_LABELS: Record<ApplicationDecisionAction, string> = {
  start_review: "开始审核",
  request_supplement: "要求补件",
  approve: "通过并建档",
  reject: "驳回",
}

/** 已进入受理流程、申请人不可再编辑的状态 */
export const LOCKED_STATUSES: ApplicationStatus[] = [
  "submitted",
  "under_review",
  "supplement_required",
  "approved",
  "rejected",
]
