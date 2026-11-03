# 审计日志

系统里每一次写操作（登录、建档、改证件、审批申请、调整账号与角色……）都会留下一条记录：**谁、在什么时候、对什么对象、做了什么**。记录只增不改，用于事后追责、内部督察和合规检查。

相关代码：

| 文件 | 内容 |
| --- | --- |
| `src/features/audit/audit-log-list.tsx` | 审计日志页：检索、筛选、详情抽屉、导出 CSV |
| `src/features/audit/audit-trail.tsx` | 单个对象的操作记录（档案详情、申请详情共用） |
| `src/features/audit/labels.ts` | 动作、操作人类型、对象类型的文案，对象的站内链接，查阅权限 |
| `src/features/audit/api.ts` | 分页查询、按筛选逐页导出、判断后端是否忽略了筛选参数 |
| `src/app/(app)/admin/audit/page.tsx` | 审计日志页 `/admin/audit` |

## 谁能查看

有「查看用户」或「查看角色」权限的工作人员，即系统管理员和督察人员。侧边栏「系统管理 → 审计日志」进入。没有权限的人看不到菜单，详情页里也不显示「操作记录」。

申请人在门户里看不到审计日志；他们能看到的是申请详情里的办理进度时间线。

## 使用说明

### 审计日志页

- 按时间倒序列出，每页 12 条。每条显示时间、操作人（及其类型：工作人员 / 申请人 / 系统）、动作、对象类型和说明。
- **关键词**：匹配操作人姓名、动作和说明。
- **操作人类型**、**动作**：动作按模块分组（账号与权限、申请人档案、证件管理、申请审批）。
- **日期范围**：起止日期都包含当天，可以只填一头。
- 所有筛选条件和页码都写在地址栏里，复制链接就能把同样的视图发给别人。「清除筛选」一键复原。

### 记录详情

点击任意一行打开详情抽屉，显示完整说明、操作人 ID、动作代码、对象类型与对象 ID、记录编号。

- 对象是档案或申请时，对象 ID 可以点击直接打开；对象已被删除时会显示“不存在”，记录本身仍然保留。
- 「查看该对象的全部记录」把列表筛选到这一个对象，用来追溯它从创建到现在经过了哪些人的手。

### 详情页里的操作记录

- **申请详情**（`/applications/:id`）右侧栏下方有「操作记录」卡片，列出这份申请最近 8 条记录。
- **档案详情**（`/applicants/:id`）多了「操作记录」标签页（`?tab=history`），列出最近 20 条。
- 记录更多时底部有「查看全部 N 条记录」，跳到筛选好的审计日志页。

### 导出 CSV

页头「导出 CSV」按**当前筛选条件**导出，不受分页限制，最多 5000 条（超出时只导出最近的 5000 条并提示，可缩小日期范围分批导出）。文件带 BOM，Excel 直接打开不乱码。

列：时间、操作人、操作人类型、操作人 ID、动作、动作代码、对象类型、对象 ID、说明。动作和说明按当前界面语言输出，动作代码保持原文，方便程序处理。

## 动作与对象

| 动作代码 | 文案 | 对象类型 |
| --- | --- | --- |
| `auth.login` / `auth.register` | 登录 / 提交账号申请 | `user` |
| `user.create` / `user.update` / `user.status` | 新建账号 / 更新账号 / 变更账号状态 | `user` |
| `role.create` / `role.update` / `role.delete` | 新建 / 更新 / 删除角色 | `role` |
| `applicant.create` / `applicant.update` / `applicant.delete` | 建立 / 更新 / 删除档案 | `applicant` |
| `document.create` / `document.update` / `document.delete` / `document.verify` | 登记 / 修改 / 删除 / 核验证件 | `document` |
| `application.submit` / `application.withdraw` | 提交 / 撤回申请 | `application` |
| `application.decision` | 审批申请（受理、初审、终审、补件、驳回等） | `application` |
| `application.document.upload` / `.delete` / `.verify` | 代传 / 删除 / 核验申请材料 | `application` |

前端不认识的动作代码和对象类型原样显示，不影响列表和导出。新增动作时在 `labels.ts` 的 `ACTION_GROUPS` 补一行文案即可出现在筛选下拉框里。

说明（`detail`）里的状态和动作代码（如 `rejected`、`pass_first_review`）会替换为当前语言的文案再展示。

## 后端接口约定

```
GET /audit-logs?page&pageSize&keyword&actorType&action&resourceType&resourceId&from&to
-> Paginated<AuditLog>
```

| 参数 | 说明 |
| --- | --- |
| `keyword` | 模糊匹配操作人姓名、动作代码和说明 |
| `actorType` | `staff` / `portal` / `system` |
| `action` | 完整动作代码，精确匹配 |
| `resourceType`、`resourceId` | 精确匹配；详情页的操作记录两个都传 |
| `from`、`to` | `yyyy-MM-dd`，按机构所在时区，含当天 |

```ts
interface AuditLog {
  id: string
  actorType: "staff" | "portal" | "system"
  actorId: string | null
  actorName: string // 写入时的姓名快照，账号改名或删除后仍可追溯
  action: string
  resourceType: string
  resourceId: string | null
  detail: string
  createdAt: string
}
```

要求：

- 日志**只能追加**，不提供修改和删除接口；删除业务数据时不级联删除对应日志。
- 和业务写操作放在同一个事务里写入，业务失败则不留记录，日志写入失败则业务回滚。
- 记录失败的登录尝试时 `actorId` 为空，`actorName` 记录尝试使用的用户名。
- 访问权限与前端一致：`user.read` 或 `role.read`。

### 后端尚未支持筛选参数时

前端会检查返回的记录是否满足所传的 `actorType`、`action`、`resourceType`、`resourceId`。只要有一条不满足，就认为后端忽略了这些参数：

- 审计日志页顶部提示「部分筛选条件未生效」，列表照常显示；
- 详情页的「操作记录」改为提示到审计日志页按关键词检索，不会把别的对象的记录误显示成这个对象的。

日期范围因为存在时区换算误差，不参与这项检查。
