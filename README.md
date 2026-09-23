# IMS 前端 · 移民管理系统

移民局内部业务系统的前端，基于 Next.js 16（App Router）+ React 19 + Tailwind CSS v4 + shadcn/ui。

## 启动

```bash
pnpm install
cp .env.example .env.local   # 可选，默认即使用 Mock
pnpm dev
```

打开 http://localhost:3000 。Mock 模式下登录页列出演示账号，点击即可填入：

| 用户名 | 密码 | 角色 |
| --- | --- | --- |
| admin | Admin@2026 | 系统管理员 |
| zhou.anlan | Officer@2026 | 签证审核官 |
| song.zhiwei | Officer@2026 | 督察审计员（只读） |
| han.yizhou | Officer@2026 | 待审核账号（无法登录） |

Mock 数据保存在浏览器 localStorage，可在侧边栏用户菜单中“重置演示数据”。

## 申请人门户

面向申请人的自助服务门户挂在 `/portal`，与内部系统共用同一套前端工程，但**账号表、会话与路由都完全隔离**：

| 地址 | 说明 |
| --- | --- |
| `/portal/register` | 注册申请人账号（姓名 / 邮箱 / 手机 / 密码），注册成功即登录 |
| `/portal/login` | 申请人登录（邮箱 + 密码） |
| `/portal/applications` | 我的申请：草稿与办理进度 |
| `/portal/applications/new` | 新建申请（五步向导） |
| `/portal/applications/:id` | 申请详情与办理进度时间线 |

演示账号（Mock 模式下登录页可直接点选，密码均为 `Applicant@2026`）：

| 邮箱 | 演示数据 |
| --- | --- |
| priya.mehta@fastmail.in | 审核中、待补件各一份 |
| lars.eriksson@mariteq.se | 已通过（含档案编号）、已驳回各一份 |
| haruto.tanaka@uni-mail.jp | 一份未提交的草稿 |

### 申请人办事流程

1. **注册账号** → 自动登录并进入门户。
2. **新建申请** → 按向导填写：申请类型 → 个人信息 → 护照信息 → 申请材料 → 确认提交。
   - 走到「申请材料」前会自动把已填内容存为草稿，因此材料上传、中途离开都不会丢数据。
   - 校验不通过时服务端会返回逐字段错误，并自动跳回出错的步骤。
3. **提交** → 生成申请编号，状态变为「待受理」，进入受理机关的审核流程。
4. **查看进度** → 详情页按时间线展示每次状态流转、受理意见与关联档案编号。
5. **补充或撤回** → 「待补件」时按受理意见补交材料；受理前可自行撤回，草稿可直接删除。

状态机：`draft`（草稿）→ `submitted`（待受理）→ `under_review`（审核中）→ `approved` / `rejected`；
中途可因材料不齐转 `supplement_required`（待补件），申请人可在受理前转 `withdrawn`（已撤回）。
处于草稿以外的状态时，申请人不能再修改申请内容。

## 已完成模块

- 用户与权限：登录、账号申请（注册后待审核）、用户管理（审批 / 停用 / 分配角色）、角色与权限矩阵
- 申请人档案：档案列表（检索 / 筛选 / 分页）、新建与编辑、个人信息详情
- 证件管理：证件登记与编辑、扫描件上传、有效期提醒、核验通过 / 驳回
- 工作台：业务概况与证件到期提醒
- 申请人门户：注册 / 登录、五步申请向导与材料上传、我的申请、申请详情与进度时间线、撤回与删除草稿

> 受理端（工作人员审批申请单、通过后建立申请人档案并回填档案编号）尚未实现。
> 当前提交后仅生成状态为「待受理」的申请单，等待后续接入。

## 对接后端

所有接口集中在 `src/lib/api/endpoints.ts`，请求与响应类型在 `src/types/index.ts`。

1. 设置 `NEXT_PUBLIC_API_MOCK=false` 与 `NEXT_PUBLIC_API_BASE_URL`。
2. 后端约定：
   - 鉴权：`POST /auth/login` 返回 `accessToken`，之后请求携带 `Authorization: Bearer <token>`；401 时前端自动跳转登录页。
   - 错误体：`{ code, message, fieldErrors? }`，`fieldErrors` 会回填到对应表单字段。
   - 分页：`?page&pageSize`，返回 `{ items, total, page, pageSize }`。
   - 附件：`POST /documents/:id/attachments`，`multipart/form-data`，字段名 `files`。
3. `GET /auth/me` 需返回 `permissions`（权限码数组），前端据此控制菜单、页面和按钮。权限码清单见 `src/lib/permissions.ts`。
4. 门户是一套**独立的登录域**，令牌与内部系统互不通用：

   | 接口 | 说明 |
   | --- | --- |
   | `POST /portal/auth/register` | `ApplicantRegisterPayload -> ApplicantLoginResult`，注册成功即返回令牌 |
   | `POST /portal/auth/login` | `ApplicantLoginPayload -> ApplicantLoginResult` |
   | `GET /portal/auth/me` | `-> ApplicantAccount` |
   | `GET /portal/applications` | `?status` → `Application[]`（按更新时间倒序） |
   | `POST /portal/applications` | `Partial<ApplicationDraftPayload> -> Application`，创建草稿 |
   | `GET` / `PUT /portal/applications/:id` | 详情 / 更新草稿（仅 `draft` 可改） |
   | `POST /portal/applications/:id/submit` | 提交，生成 `applicationNo` 并转 `submitted` |
   | `POST /portal/applications/:id/withdraw` | 受理前撤回 |
   | `POST /portal/applications/:id/attachments` | `multipart/form-data`，字段名 `files` |

   后台必须自行校验 `accountId` 归属：越权访问他人申请时应返回 **404**（而非 403），前端据此按“不存在”处理。

`src/proxy.ts` 仅根据 `ims_session`（内部）与 `ims_portal_session`（门户）两个 Cookie 做乐观跳转，真正的鉴权必须由后端完成。生产环境建议由后端下发 httpOnly Cookie 取代 localStorage 中的 token。

## 目录

```
src/
  app/(auth)/          工作人员登录、账号申请
  app/(app)/           需登录的业务页面（侧边栏布局）
  app/portal/(auth)/   申请人注册、登录
  app/portal/(app)/    申请人门户（我的申请、申请向导、申请详情）
  features/<模块>/     各模块的接口、hooks、表单与视图
  components/          布局外壳、通用表单字段、状态徽标、shadcn/ui
  lib/api/             请求客户端、接口清单、Mock 实现
```

请求客户端按登录域分成 `api`（内部）与 `portalApi`（门户）两个实例，分别读取各自的 token；
401 时只会清理并跳转自己这一侧的会话，因此同一个浏览器可以同时登录内部系统与门户。

## 上线前需替换

- `src/lib/config.ts`：机构名称、ICAO 国家代码（当前为样例代码 `UTO`）。
- `src/components/brand.tsx`：机构标识占位，替换为正式国徽 / 局徽 SVG。
- `src/lib/constants.ts`：国家与部门列表。
