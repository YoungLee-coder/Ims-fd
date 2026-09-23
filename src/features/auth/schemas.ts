import { z } from "zod"

export const loginSchema = z.object({
  username: z.string().trim().min(1, "请输入用户名"),
  password: z.string().min(1, "请输入密码"),
})
export type LoginValues = z.infer<typeof loginSchema>

export const passwordRule = z
  .string()
  .min(10, "密码至少 10 位")
  .regex(/[a-z]/, "需包含小写字母")
  .regex(/[A-Z]/, "需包含大写字母")
  .regex(/\d/, "需包含数字")

export const accountFields = {
  fullName: z.string().trim().min(2, "请输入真实姓名").max(40, "姓名过长"),
  employeeId: z
    .string()
    .trim()
    .regex(/^E\d{5}$/, "工号格式为 E + 5 位数字，例如 E20417"),
  department: z.string().min(1, "请选择所属部门"),
  email: z.email("邮箱格式不正确"),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s-]{7,20}$/, "请输入有效的联系电话"),
  username: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9._]{3,31}$/, "4–32 位，小写字母开头，可含数字、点和下划线"),
}

export const registerSchema = z
  .object({
    ...accountFields,
    password: passwordRule,
    confirmPassword: z.string().min(1, "请再次输入密码"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "两次输入的密码不一致",
  })
export type RegisterValues = z.infer<typeof registerSchema>
