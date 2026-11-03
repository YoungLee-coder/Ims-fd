import { format } from "date-fns"
import { z } from "zod"

import { APPLICATION_FLOWS } from "@/features/portal/requirements"
import type { Application, ApplicationDraftPayload } from "@/types"

/* ---------------- 账号 ---------------- */

export const portalLoginSchema = z.object({
  email: z.email("邮箱格式不正确"),
  password: z.string().min(1, "请输入密码"),
})
export type PortalLoginValues = z.infer<typeof portalLoginSchema>

export const portalPasswordRule = z
  .string()
  .min(10, "密码至少 10 位")
  .regex(/[a-z]/, "需包含小写字母")
  .regex(/[A-Z]/, "需包含大写字母")
  .regex(/\d/, "需包含数字")

export const portalRegisterSchema = z
  .object({
    fullName: z.string().trim().min(2, "请输入真实姓名").max(40, "姓名过长"),
    email: z.email("邮箱格式不正确"),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[\d\s-]{7,20}$/, "请输入有效的联系电话"),
    password: portalPasswordRule,
    confirmPassword: z.string().min(1, "请再次输入密码"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "两次输入的密码不一致",
  })
export type PortalRegisterValues = z.infer<typeof portalRegisterSchema>

/* ---------------- 申请单 ---------------- */

export const APPLICATION_TYPES = [
  "visa",
  "residence_permit",
  "residence_extension",
  "permanent_residence",
  "travel_document",
] as const

const today = () => format(new Date(), "yyyy-MM-dd")

/** 姓名需与护照机读区一致，故只接受拉丁字母 */
const latinName = (required: string, tooLong: string) =>
  z
    .string()
    .trim()
    .min(1, required)
    .max(39, tooLong)
    .regex(/^[A-Za-z][A-Za-z\s'-]*$/, "请按护照机读区填写拉丁字母")

export const applicationSchema = z
  .object({
    /* 申请事项 */
    type: z.enum(APPLICATION_TYPES, { error: "请选择申请类型" }),
    purpose: z.string().trim().min(10, "请用至少 10 个字说明申请事由").max(500, "最多 500 个字符"),
    intendedArrivalDate: z.string().min(1, "请选择日期"),
    /** 范围随申请类型变化，见下方 superRefine */
    intendedStayDays: z.string().trim(),

    /* 个人信息 */
    surname: latinName("请输入姓", "姓最多 39 个字符"),
    givenNames: latinName("请输入名", "名最多 39 个字符"),
    nativeName: z.string().trim().max(60, "最多 60 个字符"),
    sex: z.enum(["M", "F", "X"], { error: "请选择性别" }),
    dateOfBirth: z.string().min(1, "请选择出生日期"),
    placeOfBirth: z.string().trim().min(1, "请输入出生地").max(60, "最多 60 个字符"),
    nationality: z.string().min(1, "请选择国籍"),
    maritalStatus: z.enum(["single", "married", "divorced", "widowed"], { error: "请选择婚姻状况" }),
    occupation: z.string().trim().max(60, "最多 60 个字符"),
    address: z.string().trim().max(200, "最多 200 个字符"),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[\d\s-]{7,20}$/, "请输入有效的联系电话"),
    email: z.email("邮箱格式不正确"),

    /* 护照信息 */
    passportNumber: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9]{5,17}$/, "护照号码为 5–17 位字母或数字"),
    passportIssuingCountry: z.string().min(1, "请选择护照签发国家"),
    passportIssuingAuthority: z.string().trim().min(1, "请输入护照签发机关").max(60, "最多 60 个字符"),
    passportIssueDate: z.string().min(1, "请选择护照签发日期"),
    passportExpiryDate: z.string().min(1, "请选择护照有效期至"),
  })
  .refine((v) => !v.dateOfBirth || v.dateOfBirth <= today(), {
    path: ["dateOfBirth"],
    message: "出生日期不能晚于今天",
  })
  .refine((v) => !v.passportIssueDate || v.passportIssueDate <= today(), {
    path: ["passportIssueDate"],
    message: "签发日期不能晚于今天",
  })
  .refine((v) => !v.passportIssueDate || !v.passportExpiryDate || v.passportIssueDate < v.passportExpiryDate, {
    path: ["passportExpiryDate"],
    message: "有效期需晚于签发日期",
  })
  .superRefine(
    (v, ctx) => {
      // 未选类型时由 z.enum 报错，这里只校验与类型相关的规则
      const flow = APPLICATION_FLOWS[v.type]
      if (!flow) return

      const date = v.intendedArrivalDate
      if (date && (flow.date.when === "future" ? date < today() : date > today())) {
        ctx.addIssue({ code: "custom", path: ["intendedArrivalDate"], message: flow.date.message })
      }

      if (flow.stay) {
        const days = Number(v.intendedStayDays)
        if (!/^\d{1,4}$/.test(v.intendedStayDays)) {
          ctx.addIssue({ code: "custom", path: ["intendedStayDays"], message: "请输入天数" })
        } else if (days < flow.stay.min || days > flow.stay.max) {
          ctx.addIssue({ code: "custom", path: ["intendedStayDays"], message: flow.stay.message })
        }
      }

      const expiry = v.passportExpiryDate
      if (!expiry || flow.passport.allowExpired) return
      if (expiry <= today()) {
        ctx.addIssue({ code: "custom", path: ["passportExpiryDate"], message: "护照已过期，请先换发后再提交申请" })
      } else if (flow.passport.afterDateMessage && date && expiry <= date) {
        ctx.addIssue({ code: "custom", path: ["passportExpiryDate"], message: flow.passport.afterDateMessage })
      }
    },
    // 分步校验时后面步骤的字段还空着，默认会跳过对象级校验；这里始终执行，申请事项一步才能及时报错
    { when: () => true }
  )

export type ApplicationFormValues = z.infer<typeof applicationSchema>

const EMPTY_FORM: ApplicationFormValues = {
  // 尚未选择时用空串占位，提交校验时会由 z.enum 报出“请选择申请类型”
  type: "" as ApplicationFormValues["type"],
  purpose: "",
  intendedArrivalDate: "",
  intendedStayDays: "",
  surname: "",
  givenNames: "",
  nativeName: "",
  sex: "X",
  dateOfBirth: "",
  placeOfBirth: "",
  nationality: "",
  maritalStatus: "single",
  occupation: "",
  address: "",
  phone: "",
  email: "",
  passportNumber: "",
  passportIssuingCountry: "",
  passportIssuingAuthority: "",
  passportIssueDate: "",
  passportExpiryDate: "",
}

export function toApplicationFormValues(application?: Application): ApplicationFormValues {
  if (!application) return { ...EMPTY_FORM }
  return {
    type: application.type,
    purpose: application.purpose,
    intendedArrivalDate: application.intendedArrivalDate,
    intendedStayDays: application.intendedStayDays ? String(application.intendedStayDays) : "",
    surname: application.surname,
    givenNames: application.givenNames,
    nativeName: application.nativeName,
    sex: application.sex,
    dateOfBirth: application.dateOfBirth,
    placeOfBirth: application.placeOfBirth,
    nationality: application.nationality,
    maritalStatus: application.maritalStatus,
    occupation: application.occupation,
    address: application.address,
    phone: application.phone,
    email: application.email,
    passportNumber: application.passportNumber,
    passportIssuingCountry: application.passportIssuingCountry,
    passportIssuingAuthority: application.passportIssuingAuthority,
    passportIssueDate: application.passportIssueDate,
    passportExpiryDate: application.passportExpiryDate,
  }
}

export function toDraftPayload(values: ApplicationFormValues): ApplicationDraftPayload {
  return {
    ...values,
    surname: values.surname.toUpperCase().replace(/\s+/g, " "),
    givenNames: values.givenNames.toUpperCase().replace(/\s+/g, " "),
    // 永久居留没有停留期限，记为 0
    intendedStayDays: APPLICATION_FLOWS[values.type]?.stay ? Number(values.intendedStayDays) || 0 : 0,
  }
}

/** 分步向导每一步需要校验的字段：类型 → 申请事项 → 个人信息 → 护照 → 材料 → 确认 */
export const STEP_FIELDS: (keyof ApplicationFormValues)[][] = [
  ["type"],
  ["purpose", "intendedArrivalDate", "intendedStayDays"],
  [
    "surname",
    "givenNames",
    "nativeName",
    "sex",
    "dateOfBirth",
    "placeOfBirth",
    "nationality",
    "maritalStatus",
    "occupation",
    "address",
    "phone",
    "email",
  ],
  [
    "passportNumber",
    "passportIssuingCountry",
    "passportIssuingAuthority",
    "passportIssueDate",
    "passportExpiryDate",
  ],
  [],
  [],
]
