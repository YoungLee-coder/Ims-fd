export const appConfig = {
  agencyName: "国家移民管理局",
  agencyNameEn: "National Immigration Administration",
  systemName: "移民管理系统",
  systemCode: "IMS",
  /** ICAO 9303 三位国家代码。UTO 是 ICAO 样例证件使用的虚构国家代码，上线前替换为本国代码。 */
  countryCode: "UTO",
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/v1",
  useMock: process.env.NEXT_PUBLIC_API_MOCK !== "false",
} as const

/** Proxy 仅用它做乐观跳转判断；真实鉴权由后端基于 token 完成。 */
export const SESSION_COOKIE = "ims_session"

/** 申请人门户会话，与内部职工会话完全隔离，两者可同时存在。 */
export const PORTAL_SESSION_COOKIE = "ims_portal_session"

/** 门户路由前缀，公开页与受保护页都在其下。 */
export const PORTAL_BASE_PATH = "/portal"
