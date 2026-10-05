"use client"

import { CheckIcon, LanguagesIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useLocale, useSetLocale, useT } from "@/lib/i18n/client"
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/config"

export function LocaleSwitcher({ variant = "ghost" }: { variant?: "ghost" | "outline" }) {
  const t = useT()
  const locale = useLocale()
  const setLocale = useSetLocale()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size="icon" aria-label={t("切换语言")} title={t("切换语言")}>
          <LanguagesIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALES.map((l) => (
          <DropdownMenuItem key={l} onSelect={() => setLocale(l)}>
            {LOCALE_LABELS[l]}
            {l === locale && <CheckIcon className="ml-auto" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
