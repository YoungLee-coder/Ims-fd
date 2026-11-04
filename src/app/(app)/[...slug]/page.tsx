import { notFound } from "next/navigation"

/** 兜住职工端未匹配的地址，让 404 渲染在侧边栏外壳内，而不是整页的根 not-found。 */
export default function CatchAll() {
  notFound()
}
