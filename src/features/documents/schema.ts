import { format } from "date-fns"
import { z } from "zod"

import type { DocumentPayload, IdentityDocument } from "@/types"

/** 无固定有效期的证件类型 */
export const NO_EXPIRY_TYPES = ["birth_certificate"] as const

export const documentSchema = z
  .object({
    type: z.enum(["passport", "visa", "residence_permit", "national_id", "travel_document", "birth_certificate"], {
      error: "请选择证件类型",
    }),
    number: z
      .string()
      .trim()
      .min(3, "请输入证件号码")
      .max(30, "证件号码最多 30 位")
      .regex(/^[A-Za-z0-9-]+$/, "仅限字母、数字和连字符"),
    issuingCountry: z.string().min(1, "请选择签发国家"),
    issuingAuthority: z.string().trim().min(1, "请输入签发机关").max(80, "最多 80 个字符"),
    issueDate: z
      .string()
      .min(1, "请选择签发日期")
      .refine((d) => d <= format(new Date(), "yyyy-MM-dd"), "签发日期不能晚于今天"),
    expiryDate: z.string(),
  })
  .superRefine((v, ctx) => {
    const noExpiry = (NO_EXPIRY_TYPES as readonly string[]).includes(v.type)
    if (!noExpiry && !v.expiryDate) {
      ctx.addIssue({ code: "custom", path: ["expiryDate"], message: "请选择有效期截止日期" })
    }
    if (v.expiryDate && v.issueDate && v.expiryDate <= v.issueDate) {
      ctx.addIssue({ code: "custom", path: ["expiryDate"], message: "有效期须晚于签发日期" })
    }
  })

export type DocumentFormValues = z.infer<typeof documentSchema>

export function toDocumentFormValues(doc?: IdentityDocument): Partial<DocumentFormValues> {
  if (!doc) {
    return { number: "", issuingCountry: "", issuingAuthority: "", issueDate: "", expiryDate: "" }
  }
  return {
    type: doc.type,
    number: doc.number,
    issuingCountry: doc.issuingCountry,
    issuingAuthority: doc.issuingAuthority,
    issueDate: doc.issueDate,
    expiryDate: doc.expiryDate ?? "",
  }
}

export function toDocumentPayload(v: DocumentFormValues): DocumentPayload {
  return { ...v, number: v.number.toUpperCase(), expiryDate: v.expiryDate || null }
}
