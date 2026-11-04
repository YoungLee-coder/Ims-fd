"use client"

import { useState } from "react"
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "next-themes"
import { toast } from "sonner"

import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { errorMessage, isRetryableError } from "@/lib/api/client"
import { LocaleProvider } from "@/lib/i18n/client"
import type { Locale } from "@/lib/i18n/config"

export function Providers({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          // 首次加载失败由各页面的错误态展示；已有数据时的后台刷新失败页面上看不到，用 toast 提示
          onError: (error, query) => {
            if (query.state.data !== undefined) toast.error(errorMessage(error), { id: "query-refetch-error" })
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            refetchOnWindowFocus: false,
            retry: (count, error) => isRetryableError(error) && count < 2,
          },
        },
      })
  )

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <LocaleProvider locale={locale}>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider delayDuration={300}>
            {children}
            <Toaster position="top-center" />
          </TooltipProvider>
        </QueryClientProvider>
      </LocaleProvider>
    </ThemeProvider>
  )
}
