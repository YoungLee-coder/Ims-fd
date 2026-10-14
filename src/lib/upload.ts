import { ATTACHMENT_MAX_BYTES, ATTACHMENT_MAX_COUNT } from "@/lib/constants"
import type { TFunction } from "@/lib/i18n/translate"

/** 允许的扩展名及其文件头（magic number）。只看扩展名或 MIME 都可以被改名绕过。 */
const SIGNATURES: Record<string, number[][]> = {
  pdf: [[0x25, 0x50, 0x44, 0x46]],
  jpg: [[0xff, 0xd8, 0xff]],
  jpeg: [[0xff, 0xd8, 0xff]],
  png: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
}

export type UploadRejectionReason = "format" | "signature" | "empty" | "size" | "duplicate"

export interface UploadRejection {
  name: string
  reason: UploadRejectionReason
}

export interface UploadCheck {
  accepted: File[]
  rejected: UploadRejection[]
  /** 加上已有文件后超过份数上限；此时 accepted 不应上传 */
  overLimit: boolean
}

function extension(name: string) {
  const dot = name.lastIndexOf(".")
  return dot < 0 ? "" : name.slice(dot + 1).toLowerCase()
}

async function matchesSignature(file: File, ext: string) {
  const expected = SIGNATURES[ext]
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer())
  return expected.some((bytes) => bytes.every((byte, index) => head[index] === byte))
}

/**
 * 上传前在浏览器端校验格式与大小：扩展名、文件头、空文件、10 MB 上限、同名重复与份数上限。
 * 调用方须先 Array.from(input.files) 再清空 input，FileList 会随 input 一起被清空。
 */
export async function checkUploads(
  files: File[],
  { existingNames = [], maxCount = ATTACHMENT_MAX_COUNT }: { existingNames?: string[]; maxCount?: number } = {}
): Promise<UploadCheck> {
  const accepted: File[] = []
  const rejected: UploadRejection[] = []
  const seen = new Set(existingNames.map((name) => name.toLowerCase()))

  for (const file of files) {
    const ext = extension(file.name)
    let reason: UploadRejectionReason | null = null
    if (!(ext in SIGNATURES)) reason = "format"
    else if (file.size === 0) reason = "empty"
    else if (file.size > ATTACHMENT_MAX_BYTES) reason = "size"
    else if (seen.has(file.name.toLowerCase())) reason = "duplicate"
    else if (!(await matchesSignature(file, ext))) reason = "signature"

    if (reason) rejected.push({ name: file.name, reason })
    else {
      accepted.push(file)
      seen.add(file.name.toLowerCase())
    }
  }

  return { accepted, rejected, overLimit: existingNames.length + accepted.length > maxCount }
}

const REASON_MESSAGES: Record<UploadRejectionReason, string> = {
  format: "{name}：格式不支持",
  signature: "{name}：文件内容与扩展名不符",
  empty: "{name}：文件为空",
  size: "{name}：超过 10 MB",
  duplicate: "{name}：已有同名文件",
}

/** 把校验结果拼成一句提示；没有问题时返回 null。 */
export function describeUploadCheck(t: TFunction, check: UploadCheck, maxCount = ATTACHMENT_MAX_COUNT) {
  if (check.overLimit) return t("最多上传 {ATTACHMENT_MAX_COUNT} 份材料", { ATTACHMENT_MAX_COUNT: maxCount })
  if (check.rejected.length === 0) return null
  return check.rejected.map((item) => t(REASON_MESSAGES[item.reason], { name: item.name })).join(t("；"))
}
