import { notFound } from "next/navigation"

/** 兜住门户未匹配的地址，让 404 渲染在门户外壳内，而不是职工端的外壳里。 */
export default function PortalCatchAll() {
  notFound()
}
