import type { ApplicationDocumentCategory, ApplicationType, Attachment, ID, RequirementKey } from "@/types"

/**
 * 各申请类型的办理规则：申请事项里日期与天数的含义、护照要求，以及需要提交的材料清单。
 * 门户向导、申请详情和工作人员核验共用这一份配置。
 */

export interface DocumentRequirement {
  key: RequirementKey
  label: string
  /** 告诉申请人要交什么、什么情况下需要 */
  description: string
  required: boolean
  /** 映射到工作人员核验用的粗分类 */
  category: ApplicationDocumentCategory
}

export interface ApplicationFlow {
  type: ApplicationType
  /** 一般办理时限，仅作提示 */
  processingTime: string
  purposePlaceholder: string
  /** 对应 intendedArrivalDate：签证是计划入境日，居留许可是实际入境日 */
  date: {
    label: string
    description: string
    /** future：不能早于今天；past：不能晚于今天 */
    when: "future" | "past"
    message: string
  }
  /** 对应 intendedStayDays；为 null 时不填写（永久居留无期限） */
  stay: {
    label: string
    description: string
    placeholder: string
    min: number
    max: number
    message: string
  } | null
  passport: {
    title: string
    description: string
    /** 旅行证件的申请人原护照多已遗失或过期，不校验有效期 */
    allowExpired: boolean
    /** 护照有效期需晚于上面的日期时给出的提示；为 null 时不比较 */
    afterDateMessage: string | null
  }
  documents: DocumentRequirement[]
}

const PASSPORT_BIO: DocumentRequirement = {
  key: "passport_bio",
  label: "护照资料页",
  description: "彩色扫描或拍照，四角完整、字迹清晰，含机读区。",
  required: true,
  category: "passport_scan",
}

const PHOTO: DocumentRequirement = {
  key: "photo",
  label: "证件照片",
  description: "近 6 个月内白底免冠彩色照片，JPG 或 PNG。",
  required: true,
  category: "photo",
}

const ADDRESS_PROOF: DocumentRequirement = {
  key: "address_proof",
  label: "境内住址证明",
  description: "房屋租赁合同、房产证明或住宿登记表。",
  required: true,
  category: "supporting",
}

const HEALTH_CHECK: DocumentRequirement = {
  key: "health_check",
  label: "体检证明",
  description: "指定医疗机构出具的 6 个月内健康检查报告。",
  required: true,
  category: "supporting",
}

const OTHER: DocumentRequirement = {
  key: "other",
  label: "其他补充材料",
  description: "清单以外、有助于说明申请事由的其他文件。",
  required: false,
  category: "other",
}

export const APPLICATION_FLOWS: Record<ApplicationType, ApplicationFlow> = {
  visa: {
    type: "visa",
    processingTime: "约 5–10 个工作日",
    purposePlaceholder: "请说明入境事由与行程，例如：应某公司邀请赴境内洽谈合作，停留两周。",
    date: {
      label: "计划入境日期",
      description: "签证自签发之日起 3 个月内有效",
      when: "future",
      message: "计划入境日期不能早于今天",
    },
    stay: {
      label: "拟停留天数",
      description: "1–180 天",
      placeholder: "30",
      min: 1,
      max: 180,
      message: "签证停留天数需在 1–180 之间",
    },
    passport: {
      title: "护照信息",
      description: "请填写现行有效的护照，有效期需覆盖整个停留期。",
      allowExpired: false,
      afterDateMessage: "护照有效期需晚于计划入境日期",
    },
    documents: [
      PASSPORT_BIO,
      PHOTO,
      {
        key: "itinerary",
        label: "行程单或往返机票预订",
        description: "列明入境、离境日期与航班信息。",
        required: true,
        category: "supporting",
      },
      {
        key: "accommodation",
        label: "住宿证明",
        description: "酒店预订确认单，或境内邀请人的住址证明。",
        required: true,
        category: "supporting",
      },
      {
        key: "financial_proof",
        label: "资金证明",
        description: "近 3 个月银行流水或存款证明，足以覆盖停留期间开支。",
        required: true,
        category: "supporting",
      },
      {
        key: "invitation",
        label: "邀请函",
        description: "商务、探亲或访友事由需提供邀请方出具的邀请函。",
        required: false,
        category: "supporting",
      },
      {
        key: "insurance",
        label: "旅行医疗保险",
        description: "保额与保障期覆盖停留期间的保险单。",
        required: false,
        category: "supporting",
      },
      OTHER,
    ],
  },

  residence_permit: {
    type: "residence_permit",
    processingTime: "约 15 个工作日",
    purposePlaceholder: "请说明居留事由，例如：受聘于某公司任软件工程师，劳动合同期两年。",
    date: {
      label: "入境日期",
      description: "本次入境时护照上的入境章日期",
      when: "past",
      message: "入境日期不能晚于今天",
    },
    stay: {
      label: "拟居留天数",
      description: "91–1825 天，按劳动合同、录取通知等确定",
      placeholder: "365",
      min: 91,
      max: 1825,
      message: "居留天数需在 91–1825 之间",
    },
    passport: {
      title: "护照信息",
      description: "请填写本次入境所持护照。",
      allowExpired: false,
      afterDateMessage: null,
    },
    documents: [
      PASSPORT_BIO,
      PHOTO,
      {
        key: "entry_record",
        label: "签证及入境记录页",
        description: "护照内有效签证页与最近一次入境章所在页。",
        required: true,
        category: "passport_scan",
      },
      {
        key: "purpose_proof",
        label: "居留事由证明",
        description: "工作许可与劳动合同、学校录取通知书或亲属关系证明。",
        required: true,
        category: "supporting",
      },
      ADDRESS_PROOF,
      HEALTH_CHECK,
      {
        key: "criminal_record",
        label: "无犯罪记录证明",
        description: "工作类居留需提供，经认证的原籍国证明。",
        required: false,
        category: "supporting",
      },
      OTHER,
    ],
  },

  residence_extension: {
    type: "residence_extension",
    processingTime: "约 7–10 个工作日",
    purposePlaceholder: "请说明延期原因，例如：劳动合同续签至 2028 年 6 月，申请居留许可延期一年。",
    date: {
      label: "延期起始日期",
      description: "一般为现持居留许可的到期次日",
      when: "future",
      message: "延期起始日期不能早于今天",
    },
    stay: {
      label: "申请延期天数",
      description: "1–1825 天",
      placeholder: "365",
      min: 1,
      max: 1825,
      message: "延期天数需在 1–1825 之间",
    },
    passport: {
      title: "护照信息",
      description: "请填写现行有效的护照，有效期需晚于延期起始日期。",
      allowExpired: false,
      afterDateMessage: "护照有效期需晚于延期起始日期",
    },
    documents: [
      PASSPORT_BIO,
      PHOTO,
      {
        key: "current_permit",
        label: "现持居留许可",
        description: "居留许可页或居留卡正反面。",
        required: true,
        category: "passport_scan",
      },
      {
        key: "continuation_proof",
        label: "居留事由持续证明",
        description: "在职证明、续签的劳动合同、在读证明等。",
        required: true,
        category: "supporting",
      },
      ADDRESS_PROOF,
      {
        key: "tax_record",
        label: "纳税或社保缴纳记录",
        description: "工作类居留建议提供最近 12 个月的记录。",
        required: false,
        category: "supporting",
      },
      OTHER,
    ],
  },

  permanent_residence: {
    type: "permanent_residence",
    processingTime: "约 90 个工作日",
    purposePlaceholder: "请说明申请依据，例如：在境内连续工作居留满 5 年，有稳定收入与住所。",
    date: {
      label: "首次入境日期",
      description: "连续居留起算的入境日期",
      when: "past",
      message: "首次入境日期不能晚于今天",
    },
    stay: null,
    passport: {
      title: "护照信息",
      description: "请填写现行有效的护照。",
      allowExpired: false,
      afterDateMessage: null,
    },
    documents: [
      PASSPORT_BIO,
      PHOTO,
      {
        key: "residence_history",
        label: "历年居留许可",
        description: "连续居留期间的全部居留许可页，可分多份上传。",
        required: true,
        category: "passport_scan",
      },
      {
        key: "income_proof",
        label: "收入及纳税证明",
        description: "近 3 年的完税证明或收入证明。",
        required: true,
        category: "supporting",
      },
      {
        key: "criminal_record",
        label: "无犯罪记录证明",
        description: "原籍国及境内公安机关出具的证明。",
        required: true,
        category: "supporting",
      },
      HEALTH_CHECK,
      ADDRESS_PROOF,
      {
        key: "family_proof",
        label: "亲属关系证明",
        description: "以投靠亲属为由申请时提供结婚证、出生证明等。",
        required: false,
        category: "supporting",
      },
      OTHER,
    ],
  },

  travel_document: {
    type: "travel_document",
    processingTime: "约 3–5 个工作日",
    purposePlaceholder: "请说明护照遗失、损毁或过期的经过，以及出行安排。",
    date: {
      label: "计划出行日期",
      description: "旅行证件签发后 6 个月内有效",
      when: "future",
      message: "计划出行日期不能早于今天",
    },
    stay: {
      label: "预计行程天数",
      description: "1–90 天",
      placeholder: "14",
      min: 1,
      max: 90,
      message: "行程天数需在 1–90 之间",
    },
    passport: {
      title: "原护照信息",
      description: "请填写遗失、损毁或过期的原护照；记不清签发机关可填写签发城市。",
      allowExpired: true,
      afterDateMessage: null,
    },
    documents: [
      {
        key: "loss_report",
        label: "遗失报案或损毁证明",
        description: "公安机关出具的遗失报案回执，或损毁护照的照片。",
        required: true,
        category: "supporting",
      },
      {
        key: "identity_proof",
        label: "国籍身份证明",
        description: "身份证、出生证明或原护照复印件等能证明国籍的文件。",
        required: true,
        category: "supporting",
      },
      PHOTO,
      {
        key: "passport_copy",
        label: "原护照资料页",
        description: "如有原护照复印件或照片，请一并提供。",
        required: false,
        category: "passport_scan",
      },
      {
        key: "itinerary",
        label: "行程安排",
        description: "机票预订或其他能说明出行计划的文件。",
        required: false,
        category: "supporting",
      },
      OTHER,
    ],
  },
}

export function requiredDocuments(type: ApplicationType) {
  return APPLICATION_FLOWS[type].documents.filter((doc) => doc.required)
}

/* ---------------- 附件归属 ---------------- */

/**
 * 附件属于清单里的哪一项。后端未返回 requirement 时，退回到本机记录的上传归属，
 * 都没有则归为“其他补充材料”。
 */
export function requirementOf(attachment: Attachment, local: Record<ID, RequirementKey> = {}): RequirementKey {
  return attachment.requirement ?? local[attachment.id] ?? "other"
}

/** 按清单项分组；不在当前类型清单里的附件（如切换了申请类型）归入“其他补充材料” */
export function groupAttachments(type: ApplicationType, attachments: Attachment[], local: Record<ID, RequirementKey> = {}) {
  const keys = new Set(APPLICATION_FLOWS[type].documents.map((doc) => doc.key))
  const groups = new Map<RequirementKey, Attachment[]>()
  for (const attachment of attachments) {
    const key = requirementOf(attachment, local)
    const slot = keys.has(key) ? key : "other"
    groups.set(slot, [...(groups.get(slot) ?? []), attachment])
  }
  return groups
}

/** 尚未上传的必交材料 */
export function missingDocuments(type: ApplicationType, groups: Map<RequirementKey, Attachment[]>) {
  return requiredDocuments(type).filter((doc) => !groups.get(doc.key)?.length)
}

const STORAGE_PREFIX = "ims_portal_requirements:"

/** 本机记录的附件归属，供尚未支持 requirement 字段的后端使用 */
export function readLocalRequirements(applicationId: ID): Record<ID, RequirementKey> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_PREFIX + applicationId) ?? "{}")
  } catch {
    return {}
  }
}

export function writeLocalRequirements(applicationId: ID, entries: Record<ID, RequirementKey>) {
  try {
    const next = { ...readLocalRequirements(applicationId), ...entries }
    localStorage.setItem(STORAGE_PREFIX + applicationId, JSON.stringify(next))
  } catch {
    // 隐私模式等无法写入时忽略，附件会显示在“其他补充材料”
  }
}
