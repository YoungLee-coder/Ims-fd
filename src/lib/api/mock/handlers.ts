import { ApiError, type HttpMethod, type Query } from "@/lib/api/client"
import { getDb, nextId, persist, type MockApplicant, type MockUser } from "@/lib/api/mock/db"
import { getValidity } from "@/lib/format"
import { PERMISSIONS } from "@/lib/permissions"
import type {
  Applicant,
  ApplicantPayload,
  Attachment,
  CreateUserPayload,
  CurrentUser,
  DashboardSummary,
  DocumentPayload,
  IdentityDocument,
  LoginPayload,
  LoginResult,
  Paginated,
  PermissionCode,
  RegisterPayload,
  Role,
  RolePayload,
  UpdateUserPayload,
  UpdateUserStatusPayload,
  User,
  VerifyDocumentPayload,
} from "@/types"

interface MockRequest {
  method: HttpMethod
  path: string
  query?: Query
  body?: unknown
  token: string | null
}

interface Ctx<B = unknown> {
  params: Record<string, string>
  query: Query
  body: B
  me: MockUser
}

type Handler = (ctx: Ctx<never>) => unknown
interface Route {
  method: HttpMethod
  pattern: string
  handler: Handler
  /** false = 无需登录；数组 = 满足任一权限即可 */
  auth?: false | PermissionCode[]
}

const TOKEN_PREFIX = "mock-token."
const SESSION_SECONDS = 8 * 60 * 60

/* ---------------- helpers ---------------- */

const nowIso = () => new Date().toISOString()
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function notFound(what = "资源"): never {
  throw new ApiError(404, "NOT_FOUND", `${what}不存在或已被删除。`)
}

function conflict(message: string, fieldErrors?: Record<string, string>): never {
  throw new ApiError(409, "CONFLICT", message, fieldErrors)
}

function permissionsOf(user: MockUser): PermissionCode[] {
  const { roles } = getDb()
  const codes = new Set<PermissionCode>()
  for (const role of roles) {
    if (user.roleIds.includes(role.id)) role.permissions.forEach((p) => codes.add(p))
  }
  return [...codes]
}

function toUser(user: MockUser): User {
  const { roles } = getDb()
  const { password: _password, roleIds, ...rest } = user
  return {
    ...rest,
    roles: roles
      .filter((r) => roleIds.includes(r.id))
      .map(({ id, code, name }) => ({ id, code, name })),
  }
}

function toCurrentUser(user: MockUser): CurrentUser {
  return { ...toUser(user), permissions: permissionsOf(user) }
}

function toRole(role: ReturnType<typeof getDb>["roles"][number]): Role {
  const userCount = getDb().users.filter((u) => u.roleIds.includes(role.id)).length
  return { ...role, userCount }
}

function toApplicant(applicant: MockApplicant): Applicant {
  const docs = getDb().documents.filter((d) => d.applicantId === applicant.id)
  return {
    ...applicant,
    documentCount: docs.length,
    attentionCount: docs.filter((d) => {
      const { state } = getValidity(d.expiryDate)
      return state === "expired" || state === "expiring"
    }).length,
  }
}

function paginate<T>(items: T[], query: Query): Paginated<T> {
  const page = Math.max(1, Number(query.page ?? 1))
  const pageSize = Math.max(1, Number(query.pageSize ?? 10))
  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    total: items.length,
    page,
    pageSize,
  }
}

function includes(haystack: string, needle: string) {
  return haystack.toLowerCase().includes(needle.toLowerCase())
}

function findUser(id: string) {
  return getDb().users.find((u) => u.id === id) ?? notFound("用户")
}

function findApplicant(id: string) {
  return getDb().applicants.find((a) => a.id === id) ?? notFound("档案")
}

function findDocument(id: string) {
  return getDb().documents.find((d) => d.id === id) ?? notFound("证件")
}

function assertUniqueUser(payload: { username: string; employeeId: string }, exceptId?: string) {
  const { users } = getDb()
  const fieldErrors: Record<string, string> = {}
  if (users.some((u) => u.id !== exceptId && u.username.toLowerCase() === payload.username.toLowerCase())) {
    fieldErrors.username = "该用户名已被使用"
  }
  if (users.some((u) => u.id !== exceptId && u.employeeId === payload.employeeId)) {
    fieldErrors.employeeId = "该工号已注册"
  }
  if (Object.keys(fieldErrors).length) conflict("账号信息与现有记录冲突。", fieldErrors)
}

function assertUniqueDocument(payload: DocumentPayload, exceptId?: string) {
  const dup = getDb().documents.some(
    (d) =>
      d.id !== exceptId &&
      d.type === payload.type &&
      d.issuingCountry === payload.issuingCountry &&
      d.number.toUpperCase() === payload.number.toUpperCase()
  )
  if (dup) conflict("同一签发国家下已登记相同号码的证件。", { number: "证件号码重复" })
}

/* ---------------- routes ---------------- */

const routes: Route[] = [
  /* auth */
  {
    method: "POST",
    pattern: "/auth/login",
    auth: false,
    handler: ({ body }: Ctx<LoginPayload>): LoginResult => {
      const user = getDb().users.find((u) => u.username.toLowerCase() === body.username.trim().toLowerCase())
      if (!user || user.password !== body.password) {
        throw new ApiError(401, "INVALID_CREDENTIALS", "用户名或密码错误。")
      }
      if (user.status === "pending") throw new ApiError(403, "ACCOUNT_PENDING", "账号正在审核中，审核通过后即可登录。")
      if (user.status === "disabled") throw new ApiError(403, "ACCOUNT_DISABLED", "账号已停用，请联系系统管理员。")
      if (user.status === "rejected") throw new ApiError(403, "ACCOUNT_REJECTED", "注册申请未通过审核，请联系所在部门。")
      user.lastLoginAt = nowIso()
      persist()
      return { accessToken: TOKEN_PREFIX + user.id, expiresIn: SESSION_SECONDS, user: toCurrentUser(user) }
    },
  },
  {
    method: "POST",
    pattern: "/auth/register",
    auth: false,
    handler: ({ body }: Ctx<RegisterPayload>): User => {
      assertUniqueUser(body)
      const user: MockUser = {
        ...body,
        id: nextId("u"),
        status: "pending",
        roleIds: [],
        lastLoginAt: null,
        createdAt: nowIso(),
      }
      getDb().users.push(user)
      persist()
      return toUser(user)
    },
  },
  { method: "POST", pattern: "/auth/logout", auth: false, handler: () => undefined },
  { method: "GET", pattern: "/auth/me", handler: ({ me }) => toCurrentUser(me) },

  /* users */
  {
    method: "GET",
    pattern: "/users",
    auth: ["user.read", "user.manage"],
    handler: ({ query }): Paginated<User> => {
      const keyword = String(query.keyword ?? "").trim()
      const status = query.status ? String(query.status) : ""
      const list = getDb()
        .users.filter((u) => !status || u.status === status)
        .filter(
          (u) =>
            !keyword ||
            [u.fullName, u.username, u.employeeId, u.email, u.department].some((f) => includes(f, keyword))
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(toUser)
      return paginate(list, query)
    },
  },
  {
    method: "POST",
    pattern: "/users",
    auth: ["user.manage"],
    handler: ({ body }: Ctx<CreateUserPayload>): User => {
      assertUniqueUser(body)
      const { roleIds, ...rest } = body
      const user: MockUser = {
        ...rest,
        id: nextId("u"),
        status: "active",
        roleIds,
        lastLoginAt: null,
        createdAt: nowIso(),
      }
      getDb().users.push(user)
      persist()
      return toUser(user)
    },
  },
  {
    method: "GET",
    pattern: "/users/:id",
    auth: ["user.read", "user.manage"],
    handler: ({ params }) => toUser(findUser(params.id)),
  },
  {
    method: "PATCH",
    pattern: "/users/:id",
    auth: ["user.manage"],
    handler: ({ params, body }: Ctx<UpdateUserPayload>): User => {
      const user = findUser(params.id)
      Object.assign(user, body)
      persist()
      return toUser(user)
    },
  },
  {
    method: "PUT",
    pattern: "/users/:id/status",
    auth: ["user.manage"],
    handler: ({ params, body, me }: Ctx<UpdateUserStatusPayload>): User => {
      const user = findUser(params.id)
      if (user.id === me.id && body.status !== "active") {
        throw new ApiError(400, "SELF_LOCKOUT", "不能停用当前登录的账号。")
      }
      user.status = body.status
      if (body.roleIds) user.roleIds = body.roleIds
      persist()
      return toUser(user)
    },
  },

  /* roles & permissions */
  { method: "GET", pattern: "/permissions", handler: () => PERMISSIONS },
  {
    method: "GET",
    pattern: "/roles",
    handler: (): Role[] => getDb().roles.map(toRole),
  },
  {
    method: "POST",
    pattern: "/roles",
    auth: ["role.manage"],
    handler: ({ body }: Ctx<RolePayload>): Role => {
      if (getDb().roles.some((r) => r.code === body.code)) {
        conflict("角色编码已存在。", { code: "角色编码已存在" })
      }
      const role = { ...body, id: nextId("r"), builtIn: false, updatedAt: nowIso() }
      getDb().roles.push(role)
      persist()
      return toRole(role)
    },
  },
  {
    method: "PUT",
    pattern: "/roles/:id",
    auth: ["role.manage"],
    handler: ({ params, body }: Ctx<RolePayload>): Role => {
      const role = getDb().roles.find((r) => r.id === params.id) ?? notFound("角色")
      if (role.builtIn) throw new ApiError(400, "BUILT_IN_ROLE", "系统内置角色不可修改。")
      if (getDb().roles.some((r) => r.id !== role.id && r.code === body.code)) {
        conflict("角色编码已存在。", { code: "角色编码已存在" })
      }
      Object.assign(role, body, { updatedAt: nowIso() })
      persist()
      return toRole(role)
    },
  },
  {
    method: "DELETE",
    pattern: "/roles/:id",
    auth: ["role.manage"],
    handler: ({ params }) => {
      const db = getDb()
      const role = db.roles.find((r) => r.id === params.id) ?? notFound("角色")
      if (role.builtIn) throw new ApiError(400, "BUILT_IN_ROLE", "系统内置角色不可删除。")
      if (toRole(role).userCount > 0) conflict("仍有用户持有该角色，请先调整这些用户的角色。")
      db.roles = db.roles.filter((r) => r.id !== role.id)
      persist()
    },
  },

  /* applicants */
  {
    method: "GET",
    pattern: "/applicants",
    auth: ["applicant.read"],
    handler: ({ query }): Paginated<Applicant> => {
      const db = getDb()
      const keyword = String(query.keyword ?? "").trim()
      const status = query.status ? String(query.status) : ""
      const nationality = query.nationality ? String(query.nationality) : ""
      const list = db.applicants
        .filter((a) => !status || a.status === status)
        .filter((a) => !nationality || a.nationality === nationality)
        .filter((a) => {
          if (!keyword) return true
          const docNumbers = db.documents.filter((d) => d.applicantId === a.id).map((d) => d.number)
          return [a.fileNo, a.surname, a.givenNames, a.nativeName, `${a.surname} ${a.givenNames}`, ...docNumbers].some(
            (f) => includes(f, keyword)
          )
        })
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map(toApplicant)
      return paginate(list, query)
    },
  },
  {
    method: "POST",
    pattern: "/applicants",
    auth: ["applicant.create"],
    handler: ({ body }: Ctx<ApplicantPayload>): Applicant => {
      const db = getDb()
      const serial = (4817 + (db.applicants.length + 1) * 173 + db.seq).toString().padStart(6, "0")
      const applicant: MockApplicant = {
        ...body,
        id: nextId("a"),
        fileNo: `A-${new Date().getFullYear()}-${serial}`,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }
      db.applicants.push(applicant)
      persist()
      return toApplicant(applicant)
    },
  },
  {
    method: "GET",
    pattern: "/applicants/:id",
    auth: ["applicant.read"],
    handler: ({ params }) => toApplicant(findApplicant(params.id)),
  },
  {
    method: "PUT",
    pattern: "/applicants/:id",
    auth: ["applicant.update"],
    handler: ({ params, body }: Ctx<ApplicantPayload>): Applicant => {
      const applicant = findApplicant(params.id)
      Object.assign(applicant, body, { updatedAt: nowIso() })
      persist()
      return toApplicant(applicant)
    },
  },
  {
    method: "DELETE",
    pattern: "/applicants/:id",
    auth: ["applicant.delete"],
    handler: ({ params }) => {
      const db = getDb()
      findApplicant(params.id)
      db.applicants = db.applicants.filter((a) => a.id !== params.id)
      db.documents = db.documents.filter((d) => d.applicantId !== params.id)
      persist()
    },
  },

  /* documents */
  {
    method: "GET",
    pattern: "/applicants/:id/documents",
    auth: ["document.read"],
    handler: ({ params }): IdentityDocument[] => {
      findApplicant(params.id)
      return getDb()
        .documents.filter((d) => d.applicantId === params.id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    },
  },
  {
    method: "POST",
    pattern: "/applicants/:id/documents",
    auth: ["document.create"],
    handler: ({ params, body }: Ctx<DocumentPayload>): IdentityDocument => {
      const applicant = findApplicant(params.id)
      assertUniqueDocument(body)
      const doc: IdentityDocument = {
        ...body,
        id: nextId("d"),
        applicantId: applicant.id,
        verification: "pending",
        verificationNote: "",
        verifiedBy: null,
        verifiedAt: null,
        attachments: [],
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }
      getDb().documents.push(doc)
      applicant.updatedAt = nowIso()
      persist()
      return doc
    },
  },
  {
    method: "PUT",
    pattern: "/documents/:id",
    auth: ["document.update"],
    handler: ({ params, body }: Ctx<DocumentPayload>): IdentityDocument => {
      const doc = findDocument(params.id)
      assertUniqueDocument(body, doc.id)
      Object.assign(doc, body, {
        verification: "pending",
        verificationNote: "",
        verifiedBy: null,
        verifiedAt: null,
        updatedAt: nowIso(),
      })
      persist()
      return doc
    },
  },
  {
    method: "DELETE",
    pattern: "/documents/:id",
    auth: ["document.delete"],
    handler: ({ params }) => {
      const db = getDb()
      findDocument(params.id)
      db.documents = db.documents.filter((d) => d.id !== params.id)
      persist()
    },
  },
  {
    method: "PUT",
    pattern: "/documents/:id/verification",
    auth: ["document.verify"],
    handler: ({ params, body, me }: Ctx<VerifyDocumentPayload>): IdentityDocument => {
      const doc = findDocument(params.id)
      Object.assign(doc, {
        verification: body.verification,
        verificationNote: body.note,
        verifiedBy: me.fullName,
        verifiedAt: nowIso(),
        updatedAt: nowIso(),
      })
      persist()
      return doc
    },
  },
  {
    method: "POST",
    pattern: "/documents/:id/attachments",
    auth: ["document.create", "document.update"],
    handler: ({ params, body }: Ctx<FormData>): Attachment[] => {
      const doc = findDocument(params.id)
      const files = body.getAll("files").filter((f): f is File => f instanceof File)
      const added = files.map<Attachment>((file) => ({
        id: nextId("f"),
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        url: "#",
        uploadedAt: nowIso(),
      }))
      doc.attachments.push(...added)
      doc.updatedAt = nowIso()
      persist()
      return added
    },
  },
  {
    method: "DELETE",
    pattern: "/documents/:id/attachments/:attachmentId",
    auth: ["document.update"],
    handler: ({ params }) => {
      const doc = findDocument(params.id)
      doc.attachments = doc.attachments.filter((a) => a.id !== params.attachmentId)
      persist()
    },
  },

  /* dashboard */
  {
    method: "GET",
    pattern: "/dashboard/summary",
    handler: (): DashboardSummary => {
      const db = getDb()
      const expiring = db.documents
        .map((d) => ({ d, v: getValidity(d.expiryDate) }))
        .filter(({ v }) => v.state === "expiring" || v.state === "expired")
        .sort((a, b) => (a.v.daysLeft ?? 0) - (b.v.daysLeft ?? 0))
      return {
        applicantTotal: db.applicants.filter((a) => a.status !== "archived").length,
        underReview: db.applicants.filter((a) => a.status === "under_review").length,
        pendingVerification: db.documents.filter((d) => d.verification === "pending").length,
        expiringSoon: expiring.length,
        pendingAccounts: db.users.filter((u) => u.status === "pending").length,
        expiringDocuments: expiring.slice(0, 6).map(({ d }) => {
          const a = db.applicants.find((x) => x.id === d.applicantId)!
          return {
            documentId: d.id,
            applicantId: a.id,
            applicantName: `${a.surname} ${a.givenNames}`,
            fileNo: a.fileNo,
            type: d.type,
            number: d.number,
            expiryDate: d.expiryDate!,
          }
        }),
      }
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

export async function handleMockRequest<T>(req: MockRequest): Promise<T> {
  await sleep(180 + Math.random() * 320)

  for (const route of routes) {
    if (route.method !== req.method) continue
    const params = match(route.pattern, req.path)
    if (!params) continue

    let me = null as MockUser | null
    if (route.auth !== false) {
      const userId = req.token?.startsWith(TOKEN_PREFIX) ? req.token.slice(TOKEN_PREFIX.length) : null
      me = getDb().users.find((u) => u.id === userId && u.status === "active") ?? null
      if (!me) throw new ApiError(401, "UNAUTHENTICATED", "登录已失效，请重新登录。")
      if (route.auth?.length) {
        const granted = permissionsOf(me)
        if (!route.auth.some((p) => granted.includes(p))) {
          throw new ApiError(403, "FORBIDDEN", "当前账号没有执行此操作的权限。")
        }
      }
    }

    const body = req.body instanceof FormData ? req.body : structuredClone(req.body)
    const result = (route.handler as Handler)({ params, query: req.query ?? {}, body: body as never, me: me! })
    return (result === undefined ? undefined : structuredClone(result)) as T
  }

  throw new ApiError(404, "ROUTE_NOT_FOUND", `Mock 未实现接口：${req.method} ${req.path}`)
}
