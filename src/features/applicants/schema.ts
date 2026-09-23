import { format } from "date-fns"
import { z } from "zod"

import type { Applicant, ApplicantPayload } from "@/types"

const latinName = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `请输入${label}`)
    .max(39, `${label}最多 39 个字符`)
    .regex(/^[A-Za-z][A-Za-z\s'-]*$/, "请按护照机读区填写拉丁字母")

export const applicantSchema = z.object({
  surname: latinName("姓"),
  givenNames: latinName("名"),
  nativeName: z.string().trim().max(60, "最多 60 个字符"),
  sex: z.enum(["M", "F", "X"], { error: "请选择性别" }),
  dateOfBirth: z
    .string()
    .min(1, "请选择出生日期")
    .refine((d) => d <= format(new Date(), "yyyy-MM-dd"), "出生日期不能晚于今天"),
  placeOfBirth: z.string().trim().min(1, "请输入出生地").max(60, "最多 60 个字符"),
  nationality: z.string().min(1, "请选择国籍"),
  maritalStatus: z.enum(["single", "married", "divorced", "widowed"], { error: "请选择婚姻状况" }),
  occupation: z.string().trim().max(60, "最多 60 个字符"),
  phone: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\+?[\d\s-]{7,20}$/.test(v), "请输入有效的电话号码"),
  email: z.union([z.literal(""), z.email("邮箱格式不正确")]),
  address: z.string().trim().max(200, "最多 200 个字符"),
  remarks: z.string().trim().max(500, "最多 500 个字符"),
  status: z.enum(["active", "under_review", "archived"]),
})

export type ApplicantFormValues = z.infer<typeof applicantSchema>

export function toFormValues(applicant?: Applicant): Partial<ApplicantFormValues> {
  if (!applicant) {
    return {
      surname: "",
      givenNames: "",
      nativeName: "",
      dateOfBirth: "",
      placeOfBirth: "",
      nationality: "",
      maritalStatus: "single",
      occupation: "",
      phone: "",
      email: "",
      address: "",
      remarks: "",
      status: "active",
    }
  }
  const { surname, givenNames, nativeName, sex, dateOfBirth, placeOfBirth, nationality, maritalStatus } = applicant
  const { occupation, phone, email, address, remarks, status } = applicant
  return {
    surname,
    givenNames,
    nativeName,
    sex,
    dateOfBirth,
    placeOfBirth,
    nationality,
    maritalStatus,
    occupation,
    phone,
    email,
    address,
    remarks,
    status,
  }
}

export function toPayload(values: ApplicantFormValues): ApplicantPayload {
  return {
    ...values,
    surname: values.surname.toUpperCase().replace(/\s+/g, " "),
    givenNames: values.givenNames.toUpperCase().replace(/\s+/g, " "),
  }
}
