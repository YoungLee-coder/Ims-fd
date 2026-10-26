# 通知

申请状态变化、审批流转、材料核验和账号审核时，系统会提醒相关的人：页头铃铛里的站内通知，以及可选的邮件提醒。工作人员和申请人各收各的，互不相通。

相关代码：

| 文件 | 内容 |
| --- | --- |
| `src/features/notifications/notification-bell.tsx` | 页头铃铛：未读数、最近 8 条、全部标为已读 |
| `src/features/notifications/notification-center.tsx` | 通知页：全部 / 未读筛选、邮件提醒开关 |
| `src/features/notifications/notification-item.tsx` | 单条通知（铃铛和通知页共用） |
| `src/features/notifications/api.ts` | 列表、标为已读、全部已读、邮件提醒设置 |
| `src/app/(app)/notifications/page.tsx` | 工作人员通知页 `/notifications` |
| `src/app/portal/(app)/notifications/page.tsx` | 申请人通知页 `/portal/notifications` |

## 使用说明

### 铃铛

- 内部系统在页头右侧，门户在「新建申请」按钮左侧。有未读通知时铃铛上显示红色数字，超过 9 条显示「9+」。
- 点开后列出最近 8 条，未读的加粗并带红点。
- **点击一条通知**：标为已读，并跳到相关页面（例如申请详情、待审核账号列表）。没有相关页面的通知只标为已读。
- 「全部标为已读」一次清空未读；「查看全部通知」进入通知页。
- 通知每分钟自动刷新一次，不需要手动刷新页面。

### 通知页

工作人员访问 `/notifications`，申请人访问 `/portal/notifications`，也可以从铃铛底部进入。

- 「全部」「未读」切换显示范围，「未读」后面括号里是未读数。
- 保留最近 50 条，更早的不再显示。
- 点击单条的效果和铃铛里一样。

### 邮件提醒

通知页顶部的「邮件提醒」开关控制是否把站内通知同时发到账号邮箱，默认开启。

- 开关下方显示接收邮箱，即账号注册时填写的邮箱。账号没有邮箱时开关不可用，只能收站内通知。
- 关闭后只影响之后的通知，已经排队的邮件仍会发出。
- 邮件是否真正发出取决于后端是否配置了邮件网关（见下文）。没有配置时开关照常保存，但只有站内通知。

## 什么时候会收到通知

| 事件 | 谁收到 | 点击后跳到 |
| --- | --- | --- |
| 有人提交了工作人员账号申请 | 有「管理用户」权限的工作人员 | 用户管理（待审核） |
| 账号申请通过审核 | 该工作人员 | 工作台 |
| 申请人提交申请 | 有「初审申请」权限的工作人员 | 申请详情 |
| 申请初审通过 | 有「终审申请」权限的工作人员，初审人本人除外 | 申请详情 |
| 申请被退回初审 | 最近一次初审通过的人 | 申请详情 |
| 审核中的申请被申请人撤回 | 有「初审申请」权限的工作人员 | 申请详情 |
| 申请被受理、要求补件、通过、驳回 | 申请人 | 门户申请详情 |
| 申请材料核验被驳回 | 申请人 | 门户申请详情 |

通知标题跟随界面语言翻译，正文里的申请编号、审批意见、驳回原因保持原文。每条通知左侧的图标表示类别：申请、材料、账号、系统。

## 后端接口约定

工作人员和门户各一套，门户路径前加 `/portal`：

| 接口 | 说明 |
| --- | --- |
| `GET /notifications` | 最近 50 条，新的在前；`?unread=true` 只返回未读 |
| `POST /notifications/:id/read` | 标为已读，`204` |
| `POST /notifications/read-all` | 全部标为已读，`204` |
| `GET /notifications/preferences` | `{ emailEnabled, email }` |
| `PUT /notifications/preferences` | `{ emailEnabled: boolean }`，返回更新后的设置 |

```ts
interface AppNotification {
  id: string
  title: string
  body: string
  category: "application" | "document" | "account" | "system"
  link: string | null // 前端站内路径，例如 /applications/ap-001
  readAt: string | null
  createdAt: string
}
```

### 邮件投递

后端把每条需要发邮件的通知写入 `email_outbox` 队列，配置 `MAIL_WEBHOOK_URL` 后在写操作结束时和每 5 分钟的定时任务里投递：

```http
POST {MAIL_WEBHOOK_URL}
Authorization: Bearer {MAIL_WEBHOOK_TOKEN}
Content-Type: application/json

{ "to": "...", "subject": "通知标题", "text": "通知正文", "from": "{MAIL_FROM}" }
```

网关返回 2xx 算发送成功，失败会重试，5 次后放弃。`MAIL_WEBHOOK_TOKEN`、`MAIL_FROM` 可选。部署方法见后端 README。
