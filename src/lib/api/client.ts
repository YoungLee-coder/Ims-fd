import { PORTAL_BASE_PATH, appConfig } from "@/lib/config"
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config"
import { translate } from "@/lib/i18n/translate"
import {
  clearPortalSession,
  clearSession,
  getPortalToken,
  getToken,
} from "@/lib/api/session"

/** 非 React 上下文（请求层、表单校验）读取当前界面语言；根布局已把它写在 <html lang>。 */
export function currentLocale() {
  if (typeof document === "undefined") return DEFAULT_LOCALE
  const lang = document.documentElement.lang
  return isLocale(lang) ? lang : DEFAULT_LOCALE
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fieldErrors?: Record<string, string>
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

export type Query = Record<string, string | number | boolean | undefined | null>

/** 内部职工接口与申请人门户接口分属两个登录域，各自持有独立的 token。 */
export type ApiRealm = "staff" | "portal"

export interface RequestOptions {
  method?: HttpMethod
  query?: Query
  body?: unknown
  signal?: AbortSignal
  realm?: ApiRealm
}

const REALM_CONFIG: Record<
  ApiRealm,
  { loginPath: string; publicPaths: string[]; getToken: () => string | null; clear: () => void }
> = {
  staff: {
    loginPath: "/login",
    publicPaths: ["/auth/login", "/auth/register"],
    getToken: getToken,
    clear: clearSession,
  },
  portal: {
    loginPath: `${PORTAL_BASE_PATH}/login`,
    publicPaths: ["/portal/auth/login", "/portal/auth/register"],
    getToken: getPortalToken,
    clear: clearPortalSession,
  },
}

function buildUrl(path: string, query?: Query) {
  const url = new URL(appConfig.apiBaseUrl + path, window.location.origin)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value))
    }
  }
  return url
}

let loginRedirectStarted = false

function redirectToLogin(realm: ApiRealm, path: string) {
  const { loginPath, publicPaths, clear } = REALM_CONFIG[realm]
  // 登录/注册接口自身的 401 是业务错误（凭据错误等），交给表单展示
  if (publicPaths.includes(path)) return
  if (typeof window === "undefined" || loginRedirectStarted) return
  if (window.location.pathname === loginPath) return
  loginRedirectStarted = true
  clear()
  const next = window.location.pathname + window.location.search
  // 整页跳转以丢弃所有客户端缓存。只跳一次，避免 Cookie 未清干净时和 proxy 对打。
  window.location.replace(`${loginPath}?next=${encodeURIComponent(next)}`)
}

/** Cookie 还在但本地没有令牌时调用：清掉乐观会话并只跳一次登录页。 */
export function leaveToLogin(realm: ApiRealm) {
  redirectToLogin(realm, "/")
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const realm = options.realm ?? "staff"
  const method = options.method ?? "GET"
  const token = REALM_CONFIG[realm].getToken()
  const isFormData = options.body instanceof FormData
  const headers: Record<string, string> = { Accept: "application/json" }
  if (token) headers.Authorization = `Bearer ${token}`
  if (options.body !== undefined && !isFormData) headers["Content-Type"] = "application/json"

  const response = await fetch(buildUrl(path, options.query), {
    method,
    headers,
    credentials: "include",
    signal: options.signal,
    body:
      options.body === undefined
        ? undefined
        : isFormData
          ? (options.body as FormData)
          : JSON.stringify(options.body),
  })

  if (response.status === 401) redirectToLogin(realm, path)

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new ApiError(
      response.status,
      payload?.code ?? "HTTP_ERROR",
      payload?.message ?? translate(currentLocale(), "请求失败（{status}）", { status: response.status }),
      payload?.fieldErrors
    )
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

function createApi(realm: ApiRealm) {
  return {
    get: <T>(path: string, query?: Query, signal?: AbortSignal) =>
      request<T>(path, { query, signal, realm }),
    post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body, realm }),
    put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body, realm }),
    patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body, realm }),
    delete: <T = void>(path: string) => request<T>(path, { method: "DELETE", realm }),
  }
}

/** 内部职工接口 */
export const api = createApi("staff")
/** 申请人门户接口 */
export const portalApi = createApi("portal")

export function errorMessage(error: unknown) {
  const locale = currentLocale()
  if (error instanceof Error) return translate(locale, error.message)
  return translate(locale, "发生未知错误，请稍后重试。")
}
