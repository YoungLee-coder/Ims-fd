import type { Application, ApplicationDecisionAction, ApprovalLevel, ID, PermissionCode } from "@/types"

/** 需要填写意见的决定：申请人或下一级审批人要看到理由。 */
export const NOTE_REQUIRED_ACTIONS = new Set<ApplicationDecisionAction>([
  "request_supplement",
  "reject",
  "return_to_first_review",
])

/** 后端返回 approvals 时启用多级审批；旧版后端只有单级审批。 */
export function isMultiLevel(application: Application) {
  return application.approvals !== undefined
}

/**
 * 当前这一级审批：受理阶段与初审归 application.review，终审归 application.approve。
 * 旧版单级流程沿用 applicant.update。
 */
export function currentLevel(application: Application): ApprovalLevel | null {
  if (application.status !== "under_review") return null
  return application.approvalLevel ?? "first_review"
}

export interface WorkflowStep {
  level: ApprovalLevel | null
  actions: ApplicationDecisionAction[]
  permission: PermissionCode
}

export function workflowStep(application: Application): WorkflowStep {
  if (!isMultiLevel(application)) {
    return { level: null, actions: legacyActions(application), permission: "applicant.update" }
  }
  const level = currentLevel(application)
  switch (application.status) {
    case "submitted":
    case "supplement_required":
      return { level: null, actions: ["start_review"], permission: "application.review" }
    case "under_review":
      return level === "final_review"
        ? {
            level,
            actions: ["approve", "return_to_first_review", "request_supplement", "reject"],
            permission: "application.approve",
          }
        : {
            level: "first_review",
            actions: ["pass_first_review", "request_supplement", "reject"],
            permission: "application.review",
          }
    default:
      return { level: null, actions: [], permission: "application.review" }
  }
}

function legacyActions(application: Application): ApplicationDecisionAction[] {
  switch (application.status) {
    case "submitted":
    case "supplement_required":
      return ["start_review"]
    case "under_review":
      return ["approve", "request_supplement", "reject"]
    default:
      return []
  }
}

/**
 * 同一份申请的初审人不能再做终审（双人复核）。后端同样校验，这里只是提前提示。
 * 取最近一次初审通过的记录，退回初审后重新初审的人才算数。
 */
export function firstReviewer(application: Application): { id: ID; name: string } | null {
  const record = [...(application.approvals ?? [])]
    .reverse()
    .find((item) => item.action === "pass_first_review")
  return record ? { id: record.actorId, name: record.actorName } : null
}

export type ProgressStage = "intake" | "first_review" | "final_review" | "done"

/** 进度条上的位置：已办结（通过 / 驳回 / 撤回）统一落在最后一格。 */
export function progressStage(application: Application): ProgressStage {
  switch (application.status) {
    case "draft":
    case "submitted":
    case "supplement_required":
      return "intake"
    case "under_review":
      return currentLevel(application) ?? "first_review"
    default:
      return "done"
  }
}
