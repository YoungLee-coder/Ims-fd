import { PORTAL_BASE_PATH } from "@/lib/config"

const BASE = "http://internal.invalid"

function isUnder(pathname: string, base: string) {
  return pathname === base || pathname.startsWith(`${base}/`)
}

/**
 * 把登录页的 next 参数规范成站内路径。按 URL 规则解析而不是比前缀：
 * 浏览器会把 "/\evil.com"、"/%09/evil.com" 之类的写法当成外站地址。
 */
function sameOriginPath(next: string | null) {
  if (!next) return null
  try {
    const url = new URL(next, BASE)
    return url.origin === BASE ? url : null
  } catch {
    return null
  }
}

/** 职工登录后只能回到后台页面，不能被带去门户或登录页。 */
export function safeStaffNext(next: string | null) {
  const fallback = "/dashboard"
  const url = sameOriginPath(next)
  if (!url) return fallback
  const { pathname } = url
  if (isUnder(pathname, PORTAL_BASE_PATH) || isUnder(pathname, "/login") || isUnder(pathname, "/register")) {
    return fallback
  }
  return pathname + url.search + url.hash
}

/** 申请人登录后只能回到门户内部页面。 */
export function safePortalNext(next: string | null) {
  const fallback = `${PORTAL_BASE_PATH}/applications`
  const url = sameOriginPath(next)
  if (!url) return fallback
  const { pathname } = url
  if (
    !isUnder(pathname, PORTAL_BASE_PATH) ||
    isUnder(pathname, `${PORTAL_BASE_PATH}/login`) ||
    isUnder(pathname, `${PORTAL_BASE_PATH}/register`)
  ) {
    return fallback
  }
  return pathname + url.search + url.hash
}
