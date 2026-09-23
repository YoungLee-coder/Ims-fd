import { addDays, format, subDays, subHours, subMinutes } from "date-fns"

import { PERMISSIONS } from "@/lib/permissions"
import type {
  Applicant,
  ApplicantAccount,
  Application,
  ApplicationStatus,
  ApplicationTimelineEntry,
  Attachment,
  DocumentType,
  ID,
  IdentityDocument,
  PermissionCode,
  Role,
  User,
  VerificationStatus,
} from "@/types"

export interface MockUser extends Omit<User, "roles"> {
  password: string
  roleIds: ID[]
}
export type MockRole = Omit<Role, "userCount">
export type MockApplicant = Omit<Applicant, "documentCount" | "attentionCount">
/** 门户账号：在 ApplicantAccount 之上多存一个明文密码（仅 Mock 使用）。 */
export interface MockApplicantAccount extends ApplicantAccount {
  password: string
}

export interface MockDb {
  users: MockUser[]
  roles: MockRole[]
  applicants: MockApplicant[]
  documents: IdentityDocument[]
  /** 申请人门户账号 */
  applicantAccounts: MockApplicantAccount[]
  /** 申请人提交的申请单 */
  applications: Application[]
  seq: number
}

/** 结构变更时提升版本号，旧数据会自动作废并重新播种。 */
const STORAGE_KEY = "ims.mockdb.v2"
let cache: MockDb | null = null

export function getDb(): MockDb {
  if (cache) return cache
  const raw = window.localStorage.getItem(STORAGE_KEY)
  cache = raw ? (JSON.parse(raw) as MockDb) : seed()
  persist()
  return cache
}

export function persist() {
  if (cache) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
}

export function resetMockDb() {
  window.localStorage.removeItem(STORAGE_KEY)
  cache = null
}

export function nextId(prefix: string) {
  const db = getDb()
  db.seq += 1
  return `${prefix}-${db.seq.toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

/* ---------------- seed ---------------- */

const now = () => new Date()
const iso = (d: Date) => d.toISOString()
const day = (d: Date) => format(d, "yyyy-MM-dd")

function seed(): MockDb {
  const all = PERMISSIONS.map((p) => p.code)
  const roleSeed = (
    id: string,
    code: string,
    name: string,
    description: string,
    permissions: PermissionCode[],
    builtIn = false
  ): MockRole => ({ id, code, name, description, permissions, builtIn, updatedAt: iso(subDays(now(), 41)) })

  const roles: MockRole[] = [
    roleSeed("r-admin", "SYS_ADMIN", "系统管理员", "拥有全部权限，负责账号、角色与系统配置。", all, true),
    roleSeed("r-visa", "VISA_OFFICER", "签证审核官", "受理签证申请，维护申请人档案并核验证件。", [
      "applicant.read",
      "applicant.create",
      "applicant.update",
      "document.read",
      "document.create",
      "document.update",
      "document.verify",
    ]),
    roleSeed("r-archive", "ARCHIVIST", "档案管理员", "负责档案建立、归档与证件扫描件管理。", [
      "applicant.read",
      "applicant.create",
      "applicant.update",
      "applicant.delete",
      "document.read",
      "document.create",
      "document.update",
      "document.delete",
    ]),
    roleSeed("r-border", "BORDER_OFFICER", "边检官员", "口岸查验时调阅档案并核验证件。", [
      "applicant.read",
      "document.read",
      "document.verify",
    ]),
    roleSeed("r-audit", "AUDITOR", "督察审计员", "只读访问业务数据与账号配置，用于合规审计。", [
      "applicant.read",
      "document.read",
      "user.read",
      "role.read",
    ]),
  ]

  const userSeed = (
    id: string,
    username: string,
    fullName: string,
    employeeId: string,
    department: string,
    roleIds: ID[],
    status: MockUser["status"],
    lastLoginAt: Date | null,
    password = "Officer@2026"
  ): MockUser => ({
    id,
    username,
    fullName,
    employeeId,
    department,
    email: `${username}@nia.gov.example`,
    phone: `+000 ${employeeId.slice(1, 4)} ${employeeId.slice(-4)} 0${id.slice(-1)}`,
    status,
    roleIds,
    password,
    lastLoginAt: lastLoginAt ? iso(lastLoginAt) : null,
    createdAt: iso(subDays(now(), 200 - Number(id.slice(-1)) * 23)),
  })

  const users: MockUser[] = [
    userSeed("u-001", "admin", "林书远", "E10231", "信息技术处", ["r-admin"], "active", subMinutes(now(), 37), "Admin@2026"),
    userSeed("u-002", "zhou.anlan", "周安澜", "E20417", "签证审批处", ["r-visa"], "active", subHours(now(), 5)),
    userSeed("u-003", "he.muqing", "何沐青", "E30562", "档案信息中心", ["r-archive"], "active", subDays(now(), 2)),
    userSeed("u-004", "song.zhiwei", "宋知微", "E40115", "督察审计处", ["r-audit"], "active", subDays(now(), 9)),
    userSeed("u-005", "han.yizhou", "韩亦舟", "E20988", "签证审批处", [], "pending", null),
    userSeed("u-006", "tao.jingshu", "陶静姝", "E11873", "出入境边防检查处", ["r-border"], "disabled", subDays(now(), 64)),
  ]

  const applicantSeed = (
    n: number,
    data: Omit<MockApplicant, "id" | "fileNo" | "createdAt" | "updatedAt" | "phone" | "email" | "address" | "remarks"> &
      Partial<Pick<MockApplicant, "phone" | "email" | "address" | "remarks">>
  ): MockApplicant => ({
    id: `a-${n.toString().padStart(3, "0")}`,
    fileNo: `A-2026-${(4817 + n * 173).toString().padStart(6, "0")}`,
    phone: "",
    email: "",
    address: "",
    remarks: "",
    ...data,
    createdAt: iso(subDays(now(), 120 - n * 9)),
    updatedAt: iso(subDays(now(), 30 - n * 2.7)),
  })

  const applicants: MockApplicant[] = [
    applicantSeed(1, {
      surname: "MEHTA",
      givenNames: "PRIYA",
      nativeName: "प्रिया मेहता",
      sex: "F",
      dateOfBirth: "1991-03-14",
      placeOfBirth: "Pune",
      nationality: "IND",
      maritalStatus: "married",
      occupation: "软件工程师",
      phone: "+91 98204 31766",
      email: "priya.mehta@fastmail.in",
      address: "滨江区云栖路 118 号 3 单元 1202",
      remarks: "工作签证续签，雇主已提交在职证明。",
      status: "under_review",
    }),
    applicantSeed(2, {
      surname: "OKAFOR",
      givenNames: "NIA CHIAMAKA",
      nativeName: "",
      sex: "F",
      dateOfBirth: "1996-11-02",
      placeOfBirth: "Enugu",
      nationality: "NGA",
      maritalStatus: "single",
      occupation: "医学研究员",
      phone: "+234 803 417 2290",
      email: "nia.okafor@proton.me",
      address: "高新区学府路 27 号研究生公寓 B 座 614",
      status: "active",
    }),
    applicantSeed(3, {
      surname: "ERIKSSON",
      givenNames: "LARS JOHAN",
      nativeName: "",
      sex: "M",
      dateOfBirth: "1978-06-21",
      placeOfBirth: "Uppsala",
      nationality: "SWE",
      maritalStatus: "divorced",
      occupation: "船舶工程顾问",
      phone: "+46 70 318 42 96",
      email: "lars.eriksson@mariteq.se",
      address: "港湾新区海晏路 9 号",
      remarks: "护照已过期，已通知本人于 30 日内换发。",
      status: "active",
    }),
    applicantSeed(4, {
      surname: "NGUYEN",
      givenNames: "THI LAN",
      nativeName: "Nguyễn Thị Lan",
      sex: "F",
      dateOfBirth: "1988-09-30",
      placeOfBirth: "Hải Phòng",
      nationality: "VNM",
      maritalStatus: "married",
      occupation: "餐饮经营者",
      phone: "+84 912 604 318",
      address: "老城区桂花巷 43 号",
      status: "active",
    }),
    applicantSeed(5, {
      surname: "TANAKA",
      givenNames: "HARUTO",
      nativeName: "田中 陽翔",
      sex: "M",
      dateOfBirth: "2001-01-17",
      placeOfBirth: "札幌",
      nationality: "JPN",
      maritalStatus: "single",
      occupation: "留学生",
      email: "haruto.tanaka@uni-mail.jp",
      address: "大学城北区 7 栋 402",
      remarks: "学生签证，需补交学校注册证明。",
      status: "under_review",
    }),
    applicantSeed(6, {
      surname: "SOUZA",
      givenNames: "ANA BEATRIZ",
      nativeName: "",
      sex: "F",
      dateOfBirth: "1993-05-08",
      placeOfBirth: "Recife",
      nationality: "BRA",
      maritalStatus: "married",
      occupation: "建筑设计师",
      phone: "+55 81 99731 2046",
      email: "anabeatriz.souza@estudio-mar.com.br",
      status: "active",
    }),
    applicantSeed(7, {
      surname: "FAROUK",
      givenNames: "OMAR HASSAN",
      nativeName: "عمر حسن فاروق",
      sex: "M",
      dateOfBirth: "1985-12-03",
      placeOfBirth: "Alexandria",
      nationality: "EGY",
      maritalStatus: "married",
      occupation: "进出口贸易",
      remarks: "已离境，档案于上季度归档。",
      status: "archived",
    }),
    applicantSeed(8, {
      surname: "KIM",
      givenNames: "SEOYEON",
      nativeName: "김서연",
      sex: "F",
      dateOfBirth: "1999-07-26",
      placeOfBirth: "釜山",
      nationality: "KOR",
      maritalStatus: "single",
      occupation: "语言教师",
      phone: "+82 10 4817 3629",
      status: "active",
    }),
    applicantSeed(9, {
      surname: "BRANDT",
      givenNames: "MAXIMILIAN",
      nativeName: "",
      sex: "M",
      dateOfBirth: "1982-02-11",
      placeOfBirth: "Leipzig",
      nationality: "DEU",
      maritalStatus: "married",
      occupation: "汽车工程师",
      email: "m.brandt@kraftwerk-auto.de",
      address: "经开区永和路 210 号 5 幢",
      status: "active",
    }),
    applicantSeed(10, {
      surname: "RAHMAN",
      givenNames: "AISHA",
      nativeName: "عائشہ رحمان",
      sex: "F",
      dateOfBirth: "1994-10-19",
      placeOfBirth: "Lahore",
      nationality: "PAK",
      maritalStatus: "single",
      occupation: "护士",
      phone: "+92 300 814 2276",
      status: "under_review",
    }),
  ]

  let docN = 0
  const docSeed = (
    applicantId: ID,
    type: DocumentType,
    number: string,
    issuingCountry: string,
    issuingAuthority: string,
    issuedDaysAgo: number,
    expiresInDays: number | null,
    verification: VerificationStatus,
    attachmentNames: string[] = []
  ): IdentityDocument => {
    docN += 1
    const id = `d-${docN.toString().padStart(3, "0")}`
    const created = subDays(now(), Math.min(issuedDaysAgo, 90))
    const attachments: Attachment[] = attachmentNames.map((fileName, i) => ({
      id: `${id}-f${i + 1}`,
      fileName,
      mimeType: fileName.endsWith(".pdf") ? "application/pdf" : "image/jpeg",
      size: 180_000 + ((docN * 7919 + i * 104_729) % 2_400_000),
      url: "#",
      uploadedAt: iso(created),
    }))
    return {
      id,
      applicantId,
      type,
      number,
      issuingCountry,
      issuingAuthority,
      issueDate: day(subDays(now(), issuedDaysAgo)),
      expiryDate: expiresInDays === null ? null : day(addDays(now(), expiresInDays)),
      verification,
      verificationNote: verification === "rejected" ? "照片页与申报信息不一致，需本人到场复核。" : "",
      verifiedBy: verification === "pending" ? null : "周安澜",
      verifiedAt: verification === "pending" ? null : iso(subDays(created, -1)),
      attachments,
      createdAt: iso(created),
      updatedAt: iso(created),
    }
  }

  const documents: IdentityDocument[] = [
    docSeed("a-001", "passport", "Z4817326", "IND", "Regional Passport Office, Pune", 1540, 2112, "verified", ["passport-bio-page.jpg"]),
    docSeed("a-001", "visa", "V26-0048172", "UTO", "签证审批处", 301, 64, "pending", ["employment-letter.pdf"]),
    docSeed("a-002", "passport", "A09718254", "NGA", "Nigeria Immigration Service", 1210, 1437, "verified", ["passport-scan.pdf"]),
    docSeed("a-002", "residence_permit", "RP-2025-019384", "UTO", "居留管理处", 420, 311, "verified"),
    docSeed("a-003", "passport", "91438270", "SWE", "Polismyndigheten", 1838, -12, "verified", ["pass-uppsala.jpg"]),
    docSeed("a-003", "residence_permit", "RP-2024-007731", "UTO", "居留管理处", 610, 813, "verified"),
    docSeed("a-004", "passport", "C2847193", "VNM", "Cục Quản lý xuất nhập cảnh", 3510, 141, "verified", ["ho-chieu.jpg"]),
    docSeed("a-005", "passport", "TK4829175", "JPN", "外務省", 705, 2947, "pending", ["passport.jpg", "enrollment-certificate.pdf"]),
    docSeed("a-005", "visa", "V26-0061405", "UTO", "签证审批处", 270, 95, "pending"),
    docSeed("a-006", "passport", "FX583014", "BRA", "Polícia Federal", 1680, 1971, "verified"),
    docSeed("a-007", "passport", "A21983476", "EGY", "Passports, Emigration and Nationality Administration", 2580, -203, "verified"),
    docSeed("a-008", "passport", "M38201947", "KOR", "외교부", 1100, 2452, "verified", ["passport-kim.jpg"]),
    docSeed("a-008", "visa", "V25-0193366", "UTO", "签证审批处", 330, 402, "rejected"),
    docSeed("a-009", "passport", "C4J7R2X91", "DEU", "Stadt Leipzig", 2840, 811, "verified"),
    docSeed("a-009", "residence_permit", "RP-2023-002815", "UTO", "居留管理处", 1070, 26, "verified", ["permit-front.jpg", "permit-back.jpg"]),
    docSeed("a-010", "passport", "BM7364821", "PAK", "Directorate General of Immigration & Passports", 1320, 1903, "pending", ["passport-aisha.jpg"]),
    docSeed("a-010", "birth_certificate", "LHR-1994-118307", "PAK", "Lahore Metropolitan Corporation", 11300, null, "pending"),
  ]

  /* ---------- 申请人门户种子 ---------- */

  const accountSeed = (
    id: string,
    email: string,
    name: string,
    phone: string,
    createdDaysAgo: number,
    lastLoginHoursAgo: number | null
  ): MockApplicantAccount => ({
    id,
    email,
    fullName: name,
    phone,
    password: "Applicant@2026",
    status: "active",
    lastLoginAt: lastLoginHoursAgo === null ? null : iso(subHours(now(), lastLoginHoursAgo)),
    createdAt: iso(subDays(now(), createdDaysAgo)),
  })

  const applicantAccounts: MockApplicantAccount[] = [
    accountSeed("pa-001", "priya.mehta@fastmail.in", "Priya Mehta", "+91 98204 31766", 96, 5),
    accountSeed("pa-002", "lars.eriksson@mariteq.se", "Lars Johan Eriksson", "+46 70 318 42 96", 141, 51),
    accountSeed("pa-003", "haruto.tanaka@uni-mail.jp", "Haruto Tanaka", "+81 90 7712 4480", 4, 2),
  ]

  const attach = (id: string, fileName: string, size: number, daysAgo: number): Attachment => ({
    id,
    fileName,
    mimeType: fileName.endsWith(".pdf") ? "application/pdf" : "image/jpeg",
    size,
    url: "#",
    uploadedAt: iso(subDays(now(), daysAgo)),
  })

  /** 种子里的时间线用“几天前”书写，播种时再换算成绝对时间。 */
  interface AppSeed extends Omit<Application, "timeline" | "createdAt" | "updatedAt"> {
    createdDaysAgo: number
    timeline: { status: ApplicationStatus; note: string; actor: string | null; daysAgo: number }[]
  }

  const appSeed = (s: AppSeed): Application => {
    const { createdDaysAgo, timeline, ...rest } = s
    return {
      ...rest,
      createdAt: iso(subDays(now(), createdDaysAgo)),
      // 最近一次流转时间即更新时间
      updatedAt: iso(subDays(now(), Math.min(...timeline.map((t) => t.daysAgo), createdDaysAgo))),
      timeline: timeline.map<ApplicationTimelineEntry>((t) => ({
        status: t.status,
        note: t.note,
        actor: t.actor,
        at: iso(subDays(now(), t.daysAgo)),
      })),
    }
  }

  const applications: Application[] = [
    appSeed({
      id: "ap-001",
      applicationNo: "APP-2026-000148",
      accountId: "pa-001",
      type: "residence_extension",
      status: "under_review",
      purpose: "受雇于滨江云栖科技有限公司，居留许可将于 60 日后到期，申请延期两年。",
      intendedArrivalDate: day(subDays(now(), 300)),
      intendedStayDays: 730,
      surname: "MEHTA",
      givenNames: "PRIYA",
      nativeName: "प्रिया मेहता",
      sex: "F",
      dateOfBirth: "1991-03-14",
      placeOfBirth: "Pune",
      nationality: "IND",
      maritalStatus: "married",
      occupation: "软件工程师",
      address: "滨江区云栖路 118 号 3 单元 1202",
      phone: "+91 98204 31766",
      email: "priya.mehta@fastmail.in",
      passportNumber: "Z4817326",
      passportIssuingCountry: "IND",
      passportIssuingAuthority: "Regional Passport Office, Pune",
      passportIssueDate: day(subDays(now(), 1540)),
      passportExpiryDate: day(addDays(now(), 2112)),
      attachments: [
        attach("ap-001-f1", "passport-bio-page.jpg", 1_284_300, 12),
        attach("ap-001-f2", "employment-contract.pdf", 842_100, 12),
        attach("ap-001-f3", "residence-permit-front.jpg", 964_800, 12),
      ],
      reviewNote: "",
      fileNo: null,
      submittedAt: iso(subDays(now(), 12)),
      createdDaysAgo: 13,
      timeline: [
        { status: "draft", note: "申请已创建为草稿。", actor: null, daysAgo: 13 },
        { status: "submitted", note: "申请人提交申请，等待受理。", actor: null, daysAgo: 12 },
        { status: "under_review", note: "已受理，转居留管理处审核。", actor: "周安澜", daysAgo: 9 },
      ],
    }),
    appSeed({
      id: "ap-002",
      applicationNo: "APP-2026-000207",
      accountId: "pa-001",
      type: "visa",
      status: "supplement_required",
      purpose: "为配偶申请探亲签证，计划停留 90 日。",
      intendedArrivalDate: day(addDays(now(), 45)),
      intendedStayDays: 90,
      surname: "MEHTA",
      givenNames: "PRIYA",
      nativeName: "प्रिया मेहता",
      sex: "F",
      dateOfBirth: "1991-03-14",
      placeOfBirth: "Pune",
      nationality: "IND",
      maritalStatus: "married",
      occupation: "软件工程师",
      address: "滨江区云栖路 118 号 3 单元 1202",
      phone: "+91 98204 31766",
      email: "priya.mehta@fastmail.in",
      passportNumber: "Z4817326",
      passportIssuingCountry: "IND",
      passportIssuingAuthority: "Regional Passport Office, Pune",
      passportIssueDate: day(subDays(now(), 1540)),
      passportExpiryDate: day(addDays(now(), 2112)),
      attachments: [attach("ap-002-f1", "invitation-letter.pdf", 512_400, 6)],
      reviewNote: "请补交亲属关系公证书（附翻译件）扫描件，并于 15 日内重新提交。",
      fileNo: null,
      submittedAt: iso(subDays(now(), 7)),
      createdDaysAgo: 8,
      timeline: [
        { status: "draft", note: "申请已创建为草稿。", actor: null, daysAgo: 8 },
        { status: "submitted", note: "申请人提交申请，等待受理。", actor: null, daysAgo: 7 },
        { status: "under_review", note: "已受理，转签证审批处审核。", actor: "周安澜", daysAgo: 5 },
        { status: "supplement_required", note: "材料不齐，已通知申请人补件。", actor: "周安澜", daysAgo: 3 },
      ],
    }),
    appSeed({
      id: "ap-003",
      applicationNo: "APP-2025-000932",
      accountId: "pa-002",
      type: "permanent_residence",
      status: "approved",
      purpose: "在境内连续居留满五年，申请永久居留资格。",
      intendedArrivalDate: day(subDays(now(), 1825)),
      intendedStayDays: 3650,
      surname: "ERIKSSON",
      givenNames: "LARS JOHAN",
      nativeName: "",
      sex: "M",
      dateOfBirth: "1978-06-21",
      placeOfBirth: "Uppsala",
      nationality: "SWE",
      maritalStatus: "divorced",
      occupation: "船舶工程顾问",
      address: "港湾新区海晏路 9 号",
      phone: "+46 70 318 42 96",
      email: "lars.eriksson@mariteq.se",
      passportNumber: "91438270",
      passportIssuingCountry: "SWE",
      passportIssuingAuthority: "Polismyndigheten",
      passportIssueDate: day(subDays(now(), 1838)),
      passportExpiryDate: day(addDays(now(), 1090)),
      attachments: [
        attach("ap-003-f1", "tax-records-2021-2025.pdf", 2_140_900, 64),
        attach("ap-003-f2", "pass-uppsala.jpg", 1_402_600, 64),
      ],
      reviewNote: "材料齐全，符合永久居留条件，已准予受理并建立档案。",
      fileNo: "A-2026-004990",
      submittedAt: iso(subDays(now(), 63)),
      createdDaysAgo: 66,
      timeline: [
        { status: "draft", note: "申请已创建为草稿。", actor: null, daysAgo: 66 },
        { status: "submitted", note: "申请人提交申请，等待受理。", actor: null, daysAgo: 63 },
        { status: "under_review", note: "已受理，转居留管理处审核。", actor: "周安澜", daysAgo: 58 },
        { status: "approved", note: "审核通过，已建立申请人档案。", actor: "周安澜", daysAgo: 41 },
      ],
    }),
    appSeed({
      id: "ap-004",
      applicationNo: "APP-2026-000311",
      accountId: "pa-002",
      type: "travel_document",
      status: "rejected",
      purpose: "因护照即将到期，申请一次性旅行证件回国换发。",
      intendedArrivalDate: day(subDays(now(), 20)),
      intendedStayDays: 30,
      surname: "ERIKSSON",
      givenNames: "LARS JOHAN",
      nativeName: "",
      sex: "M",
      dateOfBirth: "1978-06-21",
      placeOfBirth: "Uppsala",
      nationality: "SWE",
      maritalStatus: "divorced",
      occupation: "船舶工程顾问",
      address: "港湾新区海晏路 9 号",
      phone: "+46 70 318 42 96",
      email: "lars.eriksson@mariteq.se",
      passportNumber: "91438270",
      passportIssuingCountry: "SWE",
      passportIssuingAuthority: "Polismyndigheten",
      passportIssueDate: day(subDays(now(), 1838)),
      passportExpiryDate: day(addDays(now(), 1090)),
      attachments: [attach("ap-004-f1", "passport-page.jpg", 903_200, 24)],
      reviewNote: "所持护照仍在有效期内，不符合旅行证件签发条件，建议向所属国使领馆申请换发。",
      fileNo: null,
      submittedAt: iso(subDays(now(), 23)),
      createdDaysAgo: 24,
      timeline: [
        { status: "draft", note: "申请已创建为草稿。", actor: null, daysAgo: 24 },
        { status: "submitted", note: "申请人提交申请，等待受理。", actor: null, daysAgo: 23 },
        { status: "under_review", note: "已受理，转出入境边防检查处审核。", actor: "周安澜", daysAgo: 21 },
        { status: "rejected", note: "不符合签发条件，申请不予受理。", actor: "周安澜", daysAgo: 18 },
      ],
    }),
    appSeed({
      id: "ap-005",
      applicationNo: null,
      accountId: "pa-003",
      type: "residence_permit",
      status: "draft",
      purpose: "在境内高校攻读本科，申请与学习期限一致的居留许可。",
      intendedArrivalDate: day(addDays(now(), 30)),
      intendedStayDays: 1460,
      surname: "TANAKA",
      givenNames: "HARUTO",
      nativeName: "田中 陽翔",
      sex: "M",
      dateOfBirth: "2001-01-17",
      placeOfBirth: "札幌",
      nationality: "JPN",
      maritalStatus: "single",
      occupation: "留学生",
      address: "大学城北区 7 栋 402",
      phone: "+81 90 7712 4480",
      email: "haruto.tanaka@uni-mail.jp",
      passportNumber: "TK4829175",
      passportIssuingCountry: "JPN",
      passportIssuingAuthority: "外務省",
      passportIssueDate: day(subDays(now(), 705)),
      passportExpiryDate: day(addDays(now(), 2947)),
      attachments: [attach("ap-005-f1", "enrollment-certificate.pdf", 331_700, 2)],
      reviewNote: "",
      fileNo: null,
      submittedAt: null,
      createdDaysAgo: 2,
      timeline: [{ status: "draft", note: "申请已创建为草稿。", actor: null, daysAgo: 2 }],
    }),
  ]

  return { users, roles, applicants, documents, applicantAccounts, applications, seq: 100 }
}
