import { APPLICATION_STATUS_LABELS, DECISION_ACTION_LABELS, USER_STATUS_LABELS } from "@/lib/constants"
import type { TFunction } from "@/lib/i18n/translate"
import type { AuditActorType, ID, PermissionCode } from "@/types"

/** 审计日志属于系统管理，能看用户或角色的人即可查阅 */
export const AUDIT_PERMISSIONS: PermissionCode[] = ["user.read", "role.read"]

export const ACTOR_LABELS: Record<AuditActorType, string> = {
  staff: "工作人员",
  portal: "申请人",
  system: "系统",
}

/** 按业务模块分组，筛选下拉框按此顺序展示 */
export const ACTION_GROUPS: { label: string; actions: Record<string, string> }[] = [
  {
    label: "账号与权限",
    actions: {
      "auth.login": "登录",
      "auth.register": "提交账号申请",
      "user.create": "新建账号",
      "user.update": "更新账号",
      "user.status": "变更账号状态",
      "role.create": "新建角色",
      "role.update": "更新角色",
      "role.delete": "删除角色",
    },
  },
  {
    label: "申请人档案",
    actions: {
      "applicant.create": "建立档案",
      "applicant.update": "更新档案",
      "applicant.delete": "删除档案",
    },
  },
  {
    label: "证件管理",
    actions: {
      "document.create": "登记证件",
      "document.update": "修改证件",
      "document.delete": "删除证件",
      "document.verify": "核验证件",
    },
  },
  {
    label: "申请审批",
    actions: {
      "application.submit": "提交申请",
      "application.withdraw": "撤回申请",
      "application.decision": "审批申请",
      "application.document.upload": "代传申请材料",
      "application.document.delete": "删除申请材料",
      "application.document.verify": "核验申请材料",
    },
  },
]

export const ACTION_LABELS: Record<string, string> = Object.assign({}, ...ACTION_GROUPS.map((group) => group.actions))

export function actionLabel(action: string, t: TFunction) {
  return Object.hasOwn(ACTION_LABELS, action) ? t(ACTION_LABELS[action]) : action
}

export const RESOURCE_LABELS: Record<string, string> = {
  user: "账号",
  role: "角色",
  applicant: "申请人档案",
  document: "证件",
  application: "申请",
  application_document: "申请材料",
}

export function resourceLabel(resourceType: string, t: TFunction) {
  return Object.hasOwn(RESOURCE_LABELS, resourceType) ? t(RESOURCE_LABELS[resourceType]) : resourceType
}

/** 能直接打开的对象给出站内链接；已删除的对象打开后会显示“不存在” */
export function resourceHref(resourceType: string, resourceId: ID | null) {
  switch (resourceType) {
    case "applicant":
      return resourceId ? `/applicants/${resourceId}` : null
    case "application":
      return resourceId ? `/applications/${resourceId}` : null
    case "user":
      return "/admin/users"
    case "role":
      return "/admin/roles"
    default:
      return null
  }
}

/** 后端写入 detail 时直接使用了动作与状态代码（如 reject、rejected），展示前换成对应文案。 */
const DETAIL_TOKENS: Record<string, string> = {
  ...APPLICATION_STATUS_LABELS,
  ...USER_STATUS_LABELS,
  ...DECISION_ACTION_LABELS,
}

export function humanizeDetail(detail: string, t: TFunction) {
  return detail.replace(/\b[a-z]+(?:_[a-z]+)*\b/g, (token) =>
    Object.hasOwn(DETAIL_TOKENS, token) ? t(DETAIL_TOKENS[token]) : token
  )
}
