# 按申请类型的办理流程与材料清单

五种申请类型要交的材料、日期含义和期限范围都不一样。门户向导、申请详情和工作人员核验共用一份配置：

| 文件 | 内容 |
| --- | --- |
| `src/features/portal/requirements.ts` | 各类型的办理规则（`APPLICATION_FLOWS`）与材料清单、附件归属工具函数 |
| `src/features/portal/schemas.ts` | 申请表单校验，日期、天数和护照有效期按类型校验 |
| `src/features/portal/application-wizard.tsx` | 六步申请向导 |
| `src/features/portal/requirement-checklist.tsx` | 申请详情里按清单分组的材料 |

## 向导步骤

申请类型 → 申请事项 → 个人信息 → 护照信息 → 申请材料 → 确认提交

- **申请类型**：每张卡片显示必交材料项数和办理时限；选中后在下方列出该类型需准备的全部材料，申请人可以先备齐再往下填。
- **申请事项**：申请事由的示例、日期和天数字段的名称与范围随类型变化（见下表）。
- **护照信息**：旅行证件填写的是遗失、损毁或过期的原护照，不校验有效期。
- **申请材料**：按清单逐项上传，每项可传多份；必交材料没传齐不能进入下一步，也不能提交。
- **确认提交**：按区块核对，每个区块可一键跳回修改；材料区块列出每项的份数。

填完申请事项后每一步都会保存草稿，草稿 ID 写进地址栏（`?draft=`），刷新后可以接着填。桌面端左侧是固定的步骤导航和材料进度，移动端换成顶部进度条。

## 申请事项字段

后端字段不变，`intendedArrivalDate` 和 `intendedStayDays` 的含义按类型解释：

| 类型 | `intendedArrivalDate` | `intendedStayDays` | 护照有效期 |
| --- | --- | --- | --- |
| 签证申请 | 计划入境日期，不早于今天 | 拟停留天数，1–180 | 未过期，且晚于计划入境日期 |
| 居留许可申请 | 入境日期，不晚于今天 | 拟居留天数，91–1825 | 未过期 |
| 居留许可延期 | 延期起始日期，不早于今天 | 申请延期天数，1–1825 | 未过期，且晚于延期起始日期 |
| 永久居留申请 | 首次入境日期，不晚于今天 | 不填写，提交为 `0`，显示为“不限期” | 未过期 |
| 旅行证件申请 | 计划出行日期，不早于今天 | 预计行程天数，1–90 | 不校验（原护照可能已过期） |

## 材料清单

“必交”缺一不可，“选交”按说明中的情形提交。每种类型最后都有一项选交的“其他补充材料”。

| 清单项 `requirement` | 签证 | 居留许可 | 延期 | 永久居留 | 旅行证件 |
| --- | --- | --- | --- | --- | --- |
| `passport_bio` 护照资料页 | 必交 | 必交 | 必交 | 必交 | — |
| `photo` 证件照片 | 必交 | 必交 | 必交 | 必交 | 必交 |
| `itinerary` 行程单 / 行程安排 | 必交 | — | — | — | 选交 |
| `accommodation` 住宿证明 | 必交 | — | — | — | — |
| `financial_proof` 资金证明 | 必交 | — | — | — | — |
| `invitation` 邀请函 | 选交 | — | — | — | — |
| `insurance` 旅行医疗保险 | 选交 | — | — | — | — |
| `entry_record` 签证及入境记录页 | — | 必交 | — | — | — |
| `purpose_proof` 居留事由证明 | — | 必交 | — | — | — |
| `address_proof` 境内住址证明 | — | 必交 | 必交 | 必交 | — |
| `health_check` 体检证明 | — | 必交 | — | 必交 | — |
| `criminal_record` 无犯罪记录证明 | — | 选交 | — | 必交 | — |
| `current_permit` 现持居留许可 | — | — | 必交 | — | — |
| `continuation_proof` 居留事由持续证明 | — | — | 必交 | — | — |
| `tax_record` 纳税或社保缴纳记录 | — | — | 选交 | — | — |
| `residence_history` 历年居留许可 | — | — | — | 必交 | — |
| `income_proof` 收入及纳税证明 | — | — | — | 必交 | — |
| `family_proof` 亲属关系证明 | — | — | — | 选交 | — |
| `loss_report` 遗失报案或损毁证明 | — | — | — | — | 必交 |
| `identity_proof` 国籍身份证明 | — | — | — | — | 必交 |
| `passport_copy` 原护照资料页 | — | — | — | — | 选交 |
| `other` 其他补充材料 | 选交 | 选交 | 选交 | 选交 | 选交 |

上传上限不变：单个文件 10 MB，全部材料合计 10 份。

切换申请类型后，不在新清单里的材料会显示在“其他补充材料”下，类型一步会提示申请人重新核对。

## 后端接口约定

后端 Imd-bd 已按下面的约定实现（迁移 `0005_application_requirements.sql`，规则在其 `src/requirements.ts`，需与本仓库的配置保持一致）。后端未升级时前端仍能使用，差别见“兼容旧版后端”。

| 接口 | 变化 |
| --- | --- |
| `POST /portal/applications/:id/attachments` | `multipart/form-data` 新增字段 `requirement`（清单项 key）和 `category`。后端保存 `requirement`，`category` 按清单项决定；`requirement` 不属于该申请类型时返回 400 |
| `GET /portal/applications/:id`、`GET /applications/:id` | `attachments[].requirement` 返回清单项 key |
| `GET /applications/:id/documents` | `ApplicationDocument.requirement` 返回清单项 key，`category` 取上传时传入的值 |
| `POST /portal/applications/:id/submit` | 按上表校验日期、天数和护照有效期；有材料带 `requirement` 时核对必交材料，缺失返回 `fieldErrors.attachments`，前端会跳回材料一步 |

## 兼容旧版后端

旧版后端忽略 `requirement`，也不返回它。前端上传成功后会把“附件 ID → 清单项”记在本机 `localStorage`（键 `ims_portal_requirements:<申请 ID>`），因此：

- 同一浏览器里，向导和申请详情都能把材料放回原来的清单项，必交材料校验照常生效。
- 换了浏览器或设备后读不到归属，材料都显示在“其他补充材料”里；申请详情退回为普通附件列表，不显示“未上传”。
- 工作人员端只有在后端返回 `requirement` 时才显示清单项名称和“缺少必交材料”提示，否则沿用原来的分类标签。
