import { PORTAL_SESSION_COOKIE, SESSION_COOKIE } from "@/lib/config"

const TOKEN_KEY = "ims.accessToken"
const PORTAL_TOKEN_KEY = "ims.portalAccessToken"

function readToken(key: string) {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(key)
}

function writeCookie(name: string, value: string, maxAge: number) {
  // max-age=0 在部分浏览器里不会删掉已有 Cookie，再带上过去的 expires 才能保证清掉。
  const expires = maxAge <= 0 ? "; expires=Thu, 01 Jan 1970 00:00:00 GMT" : ""
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; samesite=lax${expires}`
}

/* ---------- 内部职工会话 ---------- */

export function getToken() {
  return readToken(TOKEN_KEY)
}

export function setSession(token: string, expiresIn: number) {
  window.localStorage.setItem(TOKEN_KEY, token)
  writeCookie(SESSION_COOKIE, "1", expiresIn)
}

export function clearSession() {
  window.localStorage.removeItem(TOKEN_KEY)
  writeCookie(SESSION_COOKIE, "", 0)
}

/* ---------- 申请人门户会话 ---------- */

export function getPortalToken() {
  return readToken(PORTAL_TOKEN_KEY)
}

export function setPortalSession(token: string, expiresIn: number) {
  window.localStorage.setItem(PORTAL_TOKEN_KEY, token)
  writeCookie(PORTAL_SESSION_COOKIE, "1", expiresIn)
}

export function clearPortalSession() {
  window.localStorage.removeItem(PORTAL_TOKEN_KEY)
  writeCookie(PORTAL_SESSION_COOKIE, "", 0)
}

/**
 * 其他标签页登出或换了账号时通知当前页。storage 事件只在其他标签页触发，
 * 本页自己的登录登出不会回调。
 */
export function watchSession(realm: "staff" | "portal", onChange: (token: string | null) => void) {
  const key = realm === "staff" ? TOKEN_KEY : PORTAL_TOKEN_KEY
  const listener = (event: StorageEvent) => {
    // key 为 null 表示整个 localStorage 被清空
    if (event.key !== null && event.key !== key) return
    onChange(window.localStorage.getItem(key))
  }
  window.addEventListener("storage", listener)
  return () => window.removeEventListener("storage", listener)
}
