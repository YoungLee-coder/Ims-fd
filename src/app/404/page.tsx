import { notFound } from "next/navigation"

/** 可直接访问的 404 地址；放在外壳之外，未登录也能看到，渲染根级 not-found。 */
export default function NotFoundPage() {
  notFound()
}
