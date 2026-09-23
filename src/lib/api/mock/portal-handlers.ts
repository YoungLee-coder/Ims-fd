import { ApiError, type HttpMethod, type Query } from "@/lib/api/client"
import { getDb, nextId, persist, type MockApplicantAccount } from "@/lib/api/mock/db"
import type {
  ApplicantAccount,
  ApplicantLoginPayload,
  ApplicantLoginResult,
  ApplicantRegisterPayload,
  Application,
  ApplicationDraftPayload,
  ApplicationStatus,
  Attachment,
} from "@/types"

/**
 * 申请人门户的 Mock 实现，与内部职工 Mock（handlers.ts）完全独立：
 * 独立的 token 前缀、独立的账号表、独立的路由表。
 */

interface PortalRequest {
  method: HttpMethod
  path: string
  query?: Query
  body?: unknown
  token: string | null
}

interface PortalCtx<B = unknown> {
  params: Record<string, string>
  query: Query
  body: B
  account: MockApplicantAccount
}

type Handler = (ctx: PortalCtx<never>) => unknown

interface PortalRoute {
  method: HttpMethod
  pattern: string
  handler: Handler
  /** false = 无需登录 */
  auth?: false
}

const PORTAL_TOKEN_PREFIX = "mock-portal-token."
const PORTAL_SESSION_SECONDS = 8 * 60 * 60

/** 提交时必填的字段，缺失则拒绝受理 */
const REQUIRED_ON_SUBMIT: [keyof Application, string][] = [
  ["type", "请选择申请类型"],
  ["purpose", "请填写申请事由"],
  ["intendedArrivalDate", "请选择计划入境日期"],
  ["surname", "请填写姓"],
  ["givenNames", "请填写名"],
  ["sex", "请选择性别"],
  ["dateOfBirth", "请选择出生日期"],
  ["placeOfBirth", "请填写出生地"],
  ["nationality", "请选择国籍"],
  ["maritalStatus", "请选择婚姻状况"],
  ["passportNumber", "请填写护照号码"],
  ["passportIssuingCountry", "请选择护照签发国家"],
  ["passportIssueDate", "请选择护照签发日期"],
  ["passportExpiryDate", "请选择护照有效期至"],
]

/** 草稿允许申请人自行填写的字段，用于过滤请求体。 */
const DRAFT_FIELDS: (keyof ApplicationDraftPayload)[] = [
  "type",
  "purpose",
  "intendedArrivalDate",
  "intendedStayDays",
  "surname",
  "givenNames",
  "nativeName",
  "sex",
  "dateOfBirth",
  "placeOfBirth",
  "nationality",
  "maritalStatus",
  "occupation",
  "address",
  "phone",
  "email",
  "passportNumber",
  "passportIssuingCountry",
  "passportIssuingAuthority",
  "passportIssueDate",
  "passportExpiryDate",
]

/* ---------------- helpers ---------------- */

const nowIso = () => new Date().toISOString()
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function notFound(what = "资源"): never {
  throw new ApiError(404, "NOT_FOUND", `${what}不存在或已被删除。`)
}

function conflict(message: string, fieldErrors?: Record<string, string>): never {
  throw new ApiError(409, "CONFLICT", message, fieldErrors)
}

function forbidden(message: string): never {
  throw new ApiError(403, "FORBIDDEN", message)
}

function toAccount(account: MockApplicantAccount): ApplicantAccount {
  const { password: _password, ...rest } = account
  return rest
}

/** 只允许访问属于当前账号的申请，越权一律按不存在处理。 */
function findOwnApplication(id: string, account: MockApplicantAccount) {
  const application = getDb().applications.find((a) => a.id === id)
  if (!application || application.accountId !== account.id) notFound("申请")
  return application
}

function assertDraft(application: Application) {
  if (application.status !== "draft") {
    conflict("申请已提交，不能再修改。如需变更请先撤回申请或联系受理机关。")
  }
}

function nextApplicationNo() {
  const db = getDb()
  const year = new Date().getFullYear()
  let serial = 148 + db.applications.filter((a) => a.applicationNo).length * 59 + (db.seq % 97)
  let no = `APP-${year}-${serial.toString().padStart(6, "0")}`
  while (db.applications.some((a) => a.applicationNo === no)) {
    serial += 1
    no = `APP-${year}-${serial.toString().padStart(6, "0")}`
  }
  return no
}

function pushTimeline(application: Application, status: ApplicationStatus, note: string, actor: string | null) {
  application.status = status
  application.timeline.push({ status, note, actor, at: nowIso() })
  application.updatedAt = nowIso()
}

/** 新建草稿：未提供的字段一律留空，不阻塞申请人分步填写。 */
function emptyDraft(type: ApplicationDraftPayload["type"]): Omit<Application, "id" | "accountId" | "createdAt"> {
  return {
    applicationNo: null,
    type,
    status: "draft",
    purpose: "",
    intendedArrivalDate: "",
    intendedStayDays: 30,
    surname: "",
    givenNames: "",
    nativeName: "",
    sex: "X",
    dateOfBirth: "",
    placeOfBirth: "",
    nationality: "",
    maritalStatus: "single",
    occupation: "",
    address: "",
    phone: "",
    email: "",
    passportNumber: "",
    passportIssuingCountry: "",
    passportIssuingAuthority: "",
    passportIssueDate: "",
    passportExpiryDate: "",
    attachments: [],
    reviewNote: "",
    fileNo: null,
    timeline: [],
    submittedAt: null,
    updatedAt: nowIso(),
  }
}

function applyDraft(application: Application, patch: Partial<ApplicationDraftPayload>) {
  const target = application as unknown as Record<string, unknown>
  for (const field of DRAFT_FIELDS) {
    const value = patch[field]
    // 逐字段赋值，避免请求体携带 accountId / status 等受控字段
    if (value !== undefined && value !== null) target[field] = value
  }
  application.updatedAt = nowIso()
}

/* ---------------- routes ---------------- */

const routes: PortalRoute[] = [
  {
    method: "POST",
    pattern: "/portal/auth/register",
    auth: false,
    handler: ({ body }: PortalCtx<ApplicantRegisterPayload>): ApplicantLoginResult => {
      const db = getDb()
      const email = body.email.trim().toLowerCase()
      if (db.applicantAccounts.some((a) => a.email.toLowerCase() === email)) {
        conflict("该邮箱已注册，请直接登录或使用其他邮箱。", { email: "该邮箱已注册" })
      }
      const account: MockApplicantAccount = {
        id: nextId("pa"),
        email,
        fullName: body.fullName.trim(),
        phone: body.phone.trim(),
        password: body.password,
        status: "active",
        lastLoginAt: nowIso(),
        createdAt: nowIso(),
      }
      db.applicantAccounts.push(account)
      persist()
      // 注册成功后直接建立会话，申请人无需重复登录
      return {
        accessToken: PORTAL_TOKEN_PREFIX + account.id,
        expiresIn: PORTAL_SESSION_SECONDS,
        account: toAccount(account),
      }
    },
  },
  {
    method: "POST",
    pattern: "/portal/auth/login",
    auth: false,
    handler: ({ body }: PortalCtx<ApplicantLoginPayload>): ApplicantLoginResult => {
      const email = body.email.trim().toLowerCase()
      const account = getDb().applicantAccounts.find((a) => a.email.toLowerCase() === email)
      if (!account || account.password !== body.password) {
        throw new ApiError(401, "INVALID_CREDENTIALS", "邮箱或密码错误。")
      }
      if (account.status === "disabled") forbidden("账号已停用，请联系受理机关。")
      account.lastLoginAt = nowIso()
      persist()
      return {
        accessToken: PORTAL_TOKEN_PREFIX + account.id,
        expiresIn: PORTAL_SESSION_SECONDS,
        account: toAccount(account),
      }
    },
  },
  { method: "POST", pattern: "/portal/auth/logout", auth: false, handler: () => undefined },
  { method: "GET", pattern: "/portal/auth/me", handler: ({ account }) => toAccount(account) },

  /* 申请单 */
  {
    method: "GET",
    pattern: "/portal/applications",
    handler: ({ query, account }): Application[] => {
      const status = query.status ? String(query.status) : ""
      return getDb()
        .applications.filter((a) => a.accountId === account.id)
        .filter((a) => !status || a.status === status)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    },
  },
  {
    method: "POST",
    pattern: "/portal/applications",
    handler: ({ body, account }): Application => {
      const db = getDb()
      const patch = (body ?? {}) as Partial<ApplicationDraftPayload>
      const application: Application = {
        ...emptyDraft(patch.type ?? "visa"),
        id: nextId("ap"),
        accountId: account.id,
        createdAt: nowIso(),
      }
      applyDraft(application, patch)
      application.timeline.push({ status: "draft", note: "申请已创建为草稿。", actor: null, at: nowIso() })
      db.applications.push(application)
      persist()
      return application
    },
  },
  {
    method: "GET",
    pattern: "/portal/applications/:id",
    handler: ({ params, account }) => findOwnApplication(params.id, account),
  },
  {
    method: "PUT",
    pattern: "/portal/applications/:id",
    handler: ({ params, body, account }): Application => {
      const application = findOwnApplication(params.id, account)
      assertDraft(application)
      applyDraft(application, (body ?? {}) as Partial<ApplicationDraftPayload>)
      persist()
      return application
    },
  },
  {
    method: "POST",
    pattern: "/portal/applications/:id/submit",
    handler: ({ params, account }): Application => {
      const application = findOwnApplication(params.id, account)
      assertDraft(application)

      const fieldErrors: Record<string, string> = {}
      for (const [field, message] of REQUIRED_ON_SUBMIT) {
        if (!application[field]) fieldErrors[field] = message
      }
      if (!application.attachments.length) fieldErrors.attachments = "请至少上传一份申请材料"
      if (Object.keys(fieldErrors).length) {
        throw new ApiError(400, "VALIDATION_FAILED", "申请信息不完整，请补全后再提交。", fieldErrors)
      }

      application.applicationNo = nextApplicationNo()
      application.submittedAt = nowIso()
      application.reviewNote = ""
      pushTimeline(application, "submitted", "申请人提交申请，等待受理。", null)
      persist()
      return application
    },
  },
  {
    method: "POST",
    pattern: "/portal/applications/:id/withdraw",
    handler: ({ params, account }): Application => {
      const application = findOwnApplication(params.id, account)
      if (application.status === "draft") conflict("草稿无需撤回，可直接删除。")
      if (!["submitted", "under_review", "supplement_required"].includes(application.status)) {
        conflict("该申请已进入终态，无法撤回。")
      }
      pushTimeline(application, "withdrawn", "申请人主动撤回申请。", null)
      persist()
      return application
    },
  },
  {
    method: "DELETE",
    pattern: "/portal/applications/:id",
    handler: ({ params, account }) => {
      const db = getDb()
      const application = findOwnApplication(params.id, account)
      assertDraft(application)
      db.applications = db.applications.filter((a) => a.id !== application.id)
      persist()
    },
  },

  /* 材料 */
  {
    method: "POST",
    pattern: "/portal/applications/:id/attachments",
    handler: ({ params, body, account }: PortalCtx<FormData>): Attachment[] => {
      const application = findOwnApplication(params.id, account)
      assertDraft(application)
      const files = body.getAll("files").filter((f): f is File => f instanceof File)
      const added = files.map<Attachment>((file) => ({
        id: nextId("f"),
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        url: "#",
        uploadedAt: nowIso(),
      }))
      application.attachments.push(...added)
      application.updatedAt = nowIso()
      persist()
      return added
    },
  },
  {
    method: "DELETE",
    pattern: "/portal/applications/:id/attachments/:attachmentId",
    handler: ({ params, account }) => {
      const application = findOwnApplication(params.id, account)
      assertDraft(application)
      application.attachments = application.attachments.filter((a) => a.id !== params.attachmentId)
      application.updatedAt = nowIso()
      persist()
    },
  },
]

/* ---------------- dispatcher ---------------- */

function match(pattern: string, path: string) {
  const p = pattern.split("/")
  const s = path.split("/")
  if (p.length !== s.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(":")) params[p[i].slice(1)] = decodeURIComponent(s[i])
    else if (p[i] !== s[i]) return null
  }
  return params
}

export async function handlePortalMockRequest<T>(req: PortalRequest): Promise<T> {
  await sleep(180 + Math.random() * 320)

  for (const route of routes) {
    if (route.method !== req.method) continue
    const params = match(route.pattern, req.path)
    if (!params) continue

    let account = null as MockApplicantAccount | null
    if (route.auth !== false) {
      const id = req.token?.startsWith(PORTAL_TOKEN_PREFIX) ? req.token.slice(PORTAL_TOKEN_PREFIX.length) : null
      account = (id ? getDb().applicantAccounts.find((a) => a.id === id) : null) ?? null
      if (!account) throw new ApiError(401, "UNAUTHENTICATED", "登录已失效，请重新登录。")
      if (account.status === "disabled") forbidden("账号已停用，请联系受理机关。")
    }

    const body = req.body instanceof FormData ? req.body : structuredClone(req.body)
    const result = (route.handler as Handler)({
      params,
      query: req.query ?? {},
      body: body as never,
      account: account!,
    })
    return (result === undefined ? undefined : structuredClone(result)) as T
  }

  throw new ApiError(404, "ROUTE_NOT_FOUND", `Mock 未实现接口：${req.method} ${req.path}`)
}
