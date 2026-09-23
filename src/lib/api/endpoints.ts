import type { ID } from "@/types"

/**
 * 后端 REST 接口清单（相对 NEXT_PUBLIC_API_BASE_URL）。
 * 请求/响应结构见 src/types；错误统一返回 { code, message, fieldErrors? }。
 */
export const endpoints = {
  auth: {
    /** POST LoginPayload -> LoginResult */
    login: "/auth/login",
    /** POST RegisterPayload -> User（status = pending，需管理员审核） */
    register: "/auth/register",
    /** POST -> 204 */
    logout: "/auth/logout",
    /** GET -> CurrentUser */
    me: "/auth/me",
  },
  users: {
    /** GET ?keyword&status&page&pageSize -> Paginated<User>；POST CreateUserPayload -> User */
    list: "/users",
    /** GET -> User；PATCH UpdateUserPayload -> User */
    detail: (id: ID) => `/users/${id}`,
    /** PUT UpdateUserStatusPayload -> User（审批 / 停用 / 启用） */
    status: (id: ID) => `/users/${id}/status`,
  },
  roles: {
    /** GET -> Role[]；POST RolePayload -> Role */
    list: "/roles",
    /** PUT RolePayload -> Role；DELETE -> 204 */
    detail: (id: ID) => `/roles/${id}`,
  },
  permissions: {
    /** GET -> Permission[] */
    list: "/permissions",
  },
  applicants: {
    /** GET ApplicantQuery -> Paginated<Applicant>；POST ApplicantPayload -> Applicant */
    list: "/applicants",
    /** GET -> Applicant；PUT ApplicantPayload -> Applicant；DELETE -> 204 */
    detail: (id: ID) => `/applicants/${id}`,
    /** GET -> IdentityDocument[]；POST DocumentPayload -> IdentityDocument */
    documents: (id: ID) => `/applicants/${id}/documents`,
  },
  documents: {
    /** PUT DocumentPayload -> IdentityDocument；DELETE -> 204 */
    detail: (id: ID) => `/documents/${id}`,
    /** PUT VerifyDocumentPayload -> IdentityDocument */
    verification: (id: ID) => `/documents/${id}/verification`,
    /** POST multipart/form-data（字段 files[]）-> Attachment[] */
    attachments: (id: ID) => `/documents/${id}/attachments`,
    /** DELETE -> 204 */
    attachment: (id: ID, attachmentId: ID) => `/documents/${id}/attachments/${attachmentId}`,
  },
  dashboard: {
    /** GET -> DashboardSummary */
    summary: "/dashboard/summary",
  },
  /**
   * 申请人门户。与内部接口使用各自独立的登录域，
   * 申请人只能读写属于本人账号的申请。
   */
  portal: {
    auth: {
      /** POST ApplicantRegisterPayload -> ApplicantLoginResult（注册成功后直接登录） */
      register: "/portal/auth/register",
      /** POST ApplicantLoginPayload -> ApplicantLoginResult */
      login: "/portal/auth/login",
      /** POST -> 204 */
      logout: "/portal/auth/logout",
      /** GET -> ApplicantAccount */
      me: "/portal/auth/me",
    },
    applications: {
      /** GET ApplicationQuery -> Application[]（按更新时间倒序） */
      list: "/portal/applications",
      /** POST Partial<ApplicationDraftPayload> -> Application（创建草稿，可只带已填字段） */
      create: "/portal/applications",
      /** GET -> Application；PUT Partial<ApplicationDraftPayload> -> Application（仅草稿可改） */
      detail: (id: ID) => `/portal/applications/${id}`,
      /** POST -> Application（草稿提交为待受理并生成申请编号） */
      submit: (id: ID) => `/portal/applications/${id}/submit`,
      /** POST -> Application（受理前由申请人撤回） */
      withdraw: (id: ID) => `/portal/applications/${id}/withdraw`,
      /** POST multipart/form-data（字段 files[]）-> Attachment[]，仅草稿可上传 */
      attachments: (id: ID) => `/portal/applications/${id}/attachments`,
      /** DELETE -> 204 */
      attachment: (id: ID, attachmentId: ID) => `/portal/applications/${id}/attachments/${attachmentId}`,
    },
  },
} as const
