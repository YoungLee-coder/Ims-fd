import { NextResponse, type NextRequest } from "next/server"

import { PORTAL_BASE_PATH, PORTAL_SESSION_COOKIE, SESSION_COOKIE } from "@/lib/config"

/** 内部职工系统的公开页 */
const STAFF_PUBLIC_PATHS = ["/login", "/register"]
/** 申请人门户的公开页 */
const PORTAL_PUBLIC_PATHS = [`${PORTAL_BASE_PATH}/login`, `${PORTAL_BASE_PATH}/register`]

function isUnder(pathname: string, base: string) {
  return pathname === base || pathname.startsWith(`${base}/`)
}

function matches(pathname: string, paths: string[]) {
  return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

/**
 * 仅做乐观跳转：真正的鉴权由后端基于各自登录域的 token 完成。
 * 内部职工会话（ims_session）与申请人门户会话（ims_portal_session）互不影响，
 * 同一个浏览器可以同时持有两者。
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  if (isUnder(pathname, PORTAL_BASE_PATH)) {
    const hasPortalSession = request.cookies.has(PORTAL_SESSION_COOKIE)
    const isPortalPublic = matches(pathname, PORTAL_PUBLIC_PATHS)

    if (!hasPortalSession && !isPortalPublic) {
      const url = new URL(`${PORTAL_BASE_PATH}/login`, request.url)
      if (pathname !== PORTAL_BASE_PATH) url.searchParams.set("next", pathname + search)
      return NextResponse.redirect(url)
    }

    if (hasPortalSession && isPortalPublic) {
      return NextResponse.redirect(new URL(`${PORTAL_BASE_PATH}/applications`, request.url))
    }

    return NextResponse.next()
  }

  const hasSession = request.cookies.has(SESSION_COOKIE)
  const isPublic = matches(pathname, STAFF_PUBLIC_PATHS)

  if (!hasSession && !isPublic) {
    const url = new URL("/login", request.url)
    if (pathname !== "/") url.searchParams.set("next", pathname + search)
    return NextResponse.redirect(url)
  }

  if (hasSession && (isPublic || pathname === "/")) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
}
