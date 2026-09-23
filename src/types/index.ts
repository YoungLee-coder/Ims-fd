export type ID = string
/** ISO 8601 日期（yyyy-MM-dd） */
export type ISODate = string
/** ISO 8601 时间戳 */
export type ISODateTime = string

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface ListQuery {
  page?: number
  pageSize?: number
  keyword?: string
}

/* ---------- 用户与权限 ---------- */

export type PermissionCode =
  | "applicant.read"
  | "applicant.create"
  | "applicant.update"
  | "applicant.delete"
  | "document.read"
  | "document.create"
  | "document.update"
  | "document.delete"
  | "document.verify"
  | "user.read"
  | "user.manage"
  | "role.read"
  | "role.manage"

export interface Permission {
  code: PermissionCode
  name: string
  description: string
  module: PermissionModule
}

export type PermissionModule = "applicant" | "document" | "user" | "role"

export interface Role {
  id: ID
  code: string
  name: string
  description: string
  permissions: PermissionCode[]
  /** 系统内置角色不可删除，也不可修改权限 */
  builtIn: boolean
  userCount: number
  updatedAt: ISODateTime
}

export type RoleSummary = Pick<Role, "id" | "code" | "name">

export type UserStatus = "pending" | "active" | "disabled" | "rejected"

export interface User {
  id: ID
  username: string
  fullName: string
  employeeId: string
  department: string
  email: string
  phone: string
  status: UserStatus
  roles: RoleSummary[]
  lastLoginAt: ISODateTime | null
  createdAt: ISODateTime
}

export interface CurrentUser extends User {
  permissions: PermissionCode[]
}

export interface LoginPayload {
  username: string
  password: string
}

export interface LoginResult {
  accessToken: string
  expiresIn: number
  user: CurrentUser
}

export interface RegisterPayload {
  fullName: string
  employeeId: string
  department: string
  email: string
  phone: string
  username: string
  password: string
}

export interface CreateUserPayload extends RegisterPayload {
  roleIds: ID[]
}

export interface UpdateUserPayload {
  fullName?: string
  department?: string
  email?: string
  phone?: string
  roleIds?: ID[]
}

export interface UpdateUserStatusPayload {
  status: Exclude<UserStatus, "pending">
  /** 审批通过时一并分配角色 */
  roleIds?: ID[]
  reason?: string
}

export interface RolePayload {
  code: string
  name: string
  description: string
  permissions: PermissionCode[]
}

/* ---------- 申请人档案 ---------- */

export type Sex = "M" | "F" | "X"
export type MaritalStatus = "single" | "married" | "divorced" | "widowed"
export type ApplicantStatus = "active" | "under_review" | "archived"

export interface Applicant {
  id: ID
  /** 档案编号，由后端生成 */
  fileNo: string
  surname: string
  givenNames: string
  /** 原文姓名（护照非拉丁文字部分） */
  nativeName: string
  sex: Sex
  dateOfBirth: ISODate
  placeOfBirth: string
  nationality: string
  maritalStatus: MaritalStatus
  occupation: string
  phone: string
  email: string
  address: string
  remarks: string
  status: ApplicantStatus
  documentCount: number
  /** 180 天内到期或已过期的证件数 */
  attentionCount: number
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export type ApplicantPayload = Omit<
  Applicant,
  "id" | "fileNo" | "documentCount" | "attentionCount" | "createdAt" | "updatedAt"
>

export interface ApplicantQuery extends ListQuery {
  status?: ApplicantStatus
  nationality?: string
}

/* ---------- 证件 ---------- */

export type DocumentType =
  | "passport"
  | "visa"
  | "residence_permit"
  | "national_id"
  | "travel_document"
  | "birth_certificate"

export type VerificationStatus = "pending" | "verified" | "rejected"

export interface Attachment {
  id: ID
  fileName: string
  mimeType: string
  size: number
  url: string
  uploadedAt: ISODateTime
}

export interface IdentityDocument {
  id: ID
  applicantId: ID
  type: DocumentType
  number: string
  issuingCountry: string
  issuingAuthority: string
  issueDate: ISODate
  /** 出生证明等无有效期的证件为 null */
  expiryDate: ISODate | null
  verification: VerificationStatus
  verificationNote: string
  verifiedBy: string | null
  verifiedAt: ISODateTime | null
  attachments: Attachment[]
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export type DocumentPayload = Pick<
  IdentityDocument,
  "type" | "number" | "issuingCountry" | "issuingAuthority" | "issueDate" | "expiryDate"
>

export interface VerifyDocumentPayload {
  verification: Exclude<VerificationStatus, "pending">
  note: string
}

/* ---------- 工作台 ---------- */

export interface ExpiringDocument {
  documentId: ID
  applicantId: ID
  applicantName: string
  fileNo: string
  type: DocumentType
  number: string
  expiryDate: ISODate
}

export interface DashboardSummary {
  applicantTotal: number
  underReview: number
  pendingVerification: number
  expiringSoon: number
  pendingAccounts: number
  expiringDocuments: ExpiringDocument[]
}

/* ---------- 申请人门户 ---------- */

/**
 * 申请人自助注册的门户账号。与内部职工 User 完全分离：
 * 不持有角色与权限，只能访问本人提交的申请。
 */
export type ApplicantAccountStatus = "active" | "disabled"

export interface ApplicantAccount {
  id: ID
  /** 登录邮箱，门户内唯一 */
  email: string
  fullName: string
  phone: string
  status: ApplicantAccountStatus
  lastLoginAt: ISODateTime | null
  createdAt: ISODateTime
}

export interface ApplicantRegisterPayload {
  fullName: string
  email: string
  phone: string
  password: string
}

export interface ApplicantLoginPayload {
  email: string
  password: string
}

export interface ApplicantLoginResult {
  accessToken: string
  expiresIn: number
  account: ApplicantAccount
}

export type ApplicationType =
  | "visa"
  | "residence_permit"
  | "residence_extension"
  | "permanent_residence"
  | "travel_document"

export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "supplement_required"
  | "approved"
  | "rejected"
  | "withdrawn"

export interface ApplicationTimelineEntry {
  status: ApplicationStatus
  note: string
  at: ISODateTime
  /** 操作人；申请人本人操作为 null */
  actor: string | null
}

export interface Application {
  id: ID
  /** 申请编号，提交后由系统生成；草稿为 null */
  applicationNo: string | null
  accountId: ID
  type: ApplicationType
  status: ApplicationStatus

  /* 申请事项 */
  purpose: string
  intendedArrivalDate: ISODate
  intendedStayDays: number

  /* 申请人个人信息（提交时快照） */
  surname: string
  givenNames: string
  nativeName: string
  sex: Sex
  dateOfBirth: ISODate
  placeOfBirth: string
  nationality: string
  maritalStatus: MaritalStatus
  occupation: string
  address: string
  phone: string
  email: string

  /* 护照信息 */
  passportNumber: string
  passportIssuingCountry: string
  passportIssuingAuthority: string
  passportIssueDate: ISODate
  passportExpiryDate: ISODate

  /* 材料 */
  attachments: Attachment[]

  /* 受理结果 */
  reviewNote: string
  /** 受理通过并建档后回填的档案编号，未建档为 null */
  fileNo: string | null
  timeline: ApplicationTimelineEntry[]
  submittedAt: ISODateTime | null
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

/** 草稿阶段允许申请人自行填写的字段 */
export type ApplicationDraftPayload = Omit<
  Application,
  | "id"
  | "applicationNo"
  | "accountId"
  | "status"
  | "attachments"
  | "reviewNote"
  | "fileNo"
  | "timeline"
  | "submittedAt"
  | "createdAt"
  | "updatedAt"
>

export interface ApplicationQuery {
  status?: ApplicationStatus
}
