# 审批工作流

申请提交后要经过「受理 → 初审 → 终审 → 办结」四个环节。初审和终审由不同的工作人员完成，每一次决定都会留下一条审批意见记录。

相关代码：

| 文件 | 内容 |
| --- | --- |
| `src/features/applications/workflow.ts` | 各状态下可做的决定、所需权限、双人复核判断 |
| `src/features/applications/approval-history.tsx` | 审批进度条与审批意见记录 |
| `src/features/applications/decision-dialog.tsx` | 填写审批意见并提交决定 |
| `src/features/applications/staff-application-detail.tsx` | 申请详情页，把以上内容组合起来 |

## 流程

```
            start_review              pass_first_review
submitted ───────────────▶ 初审 ─────────────────────▶ 终审 ──── approve ───▶ approved
    ▲                       │  ▲                        │
    │                       │  └─ return_to_first_review┘
    │   start_review        │                           │
supplement_required ◀───────┴── request_supplement ─────┤
                            │                           │
                            └──────── reject ───────────┴────────────────▶ rejected
```

「初审」「终审」都是 `under_review` 状态，用 `approvalLevel` 区分：

| 状态 | `approvalLevel` | 可做的决定 | 所需权限 |
| --- | --- | --- | --- |
| `submitted` / `supplement_required` | `null` | 开始审核 `start_review` | `application.review` |
| `under_review` | `first_review` | 初审通过 `pass_first_review`、要求补件、驳回 | `application.review` |
| `under_review` | `final_review` | 通过并建档 `approve`、退回初审 `return_to_first_review`、要求补件、驳回 | `application.approve` |
| 其他 | `null` | 无 | — |

- 要求补件后申请回到 `supplement_required`，申请人补交材料后需要重新「开始审核」，从初审重新走起。
- 退回初审只改变层级，状态仍是 `under_review`。

## 审批意见

- 「要求补件」「驳回」「退回初审」必须填写意见，其余决定意见可留空。
- 每次决定都会生成一条 `ApprovalRecord`：层级、决定、审批人、时间、意见。详情页按时间倒序展示，不可编辑或删除。
- 「要求补件」「驳回」「通过并建档」的意见同时写入 `reviewNote`，申请人在门户能看到；「开始审核」「初审通过」「退回初审」的意见只在内部可见。

## 双人复核

同一份申请的初审人不能再做终审。判断依据是最近一条 `pass_first_review` 记录的 `actorId`：如果退回初审后由另一个人重新初审，以新的初审人为准。

前端会在当前用户就是初审人时禁用终审按钮并给出提示，但这只是提示，**后端必须自行校验**，否则绕过前端直接调接口就能一个人走完两级。

## 与材料核验的关系

「初审通过」和「通过并建档」要求申请材料全部核验通过。还有未核验或被驳回的材料时，这两个按钮不可用，页面会提示剩余数量。材料核验见 [document-verification.md](./document-verification.md)。

## 后端接口约定

决定接口沿用原来的 `POST /applications/:id/decision`，`action` 新增两个取值：

```jsonc
// 请求
{ "action": "pass_first_review", "note": "护照与照片一致，同意提交终审" }
```

后端需要：

1. 在 `Application` 上返回 `approvalLevel`（`"first_review" | "final_review" | null`）和 `approvals`（`ApprovalRecord[]`，按时间正序）。
2. 按上表校验「状态 + 层级 + 权限」，不允许的组合返回 409。
3. 终审时校验操作人不是最近一次初审人，违反时返回 403。
4. 「初审通过」「通过」前校验材料已全部核验，否则返回 409。
5. 在 `GET /permissions` 和角色数据里加入 `application.review`、`application.approve`。

`ApprovalRecord` 结构：

```ts
interface ApprovalRecord {
  id: string
  level: "first_review" | "final_review" | null // 开始审核时为 null
  action: ApplicationDecisionAction
  note: string
  actorId: string
  actorName: string
  at: string // ISO 8601
}
```

## 兼容旧版后端

前端以「`approvals` 字段是否存在」判断后端是否支持多级审批：

- 不存在：按原来的单级流程展示（开始审核 → 通过 / 补件 / 驳回），权限沿用 `applicant.update`，不显示审批流程卡片。
- 存在：启用上面的多级流程。

这样前后端可以分开上线，先发前端不会影响现有功能。
