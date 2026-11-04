import { NotFoundState } from "@/components/error-state"

export default function NotFound() {
  return (
    <main id="main-content" className="flex flex-1 items-center justify-center p-6">
      <NotFoundState showEntries />
    </main>
  )
}
