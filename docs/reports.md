# 报表与统计

面向管理员和审批负责人的办理情况统计：申请量、通过率、平均处理时长、在办积压，以及按时间、状态、申请类型和审批人拆开的明细。

相关代码：

| 文件 | 内容 |
| --- | --- |
| `src/features/reports/report-view.tsx` | 报表页：范围筛选、关键指标、趋势图、状态分布、审批工作量、按类型统计、CSV 导出 |
| `src/features/reports/api.ts` | `useReports(enabled, { from, to })` |
| `src/app/(app)/reports/page.tsx` | 路由 `/reports`，需要 `applicant.read` |

## 使用说明

### 进入报表

侧边栏「概览 → 报表与统计」，或直接访问 `/reports`。需要 `applicant.read` 权限；没有权限的账号看不到菜单，直接访问会显示「没有访问权限」。

工作台上的「申请办理」三个数字（申请总量、通过率、平均处理天数）是全部时间的汇总，想按时间段看就进报表页。

### 选择统计范围

页面顶部按钮切换范围，默认「近 30 天」：

| 选项 | 范围 |
| --- | --- |
| 近 7 天 / 近 30 天 / 近 90 天 | 含今天往前数 |
| 今年 | 1 月 1 日到今天 |
| 全部 | 从最早一份申请到今天 |
| 自定义 | 手动填开始、结束日期，均含当天；开始日期晚于结束日期时不会查询 |

右侧会显示后端实际使用的起止日期和数据生成时间。切换范围时旧数据先半透明保留，新数据到达后替换。

### 读懂各个区块

**关键指标**

| 指标 | 说明 |
| --- | --- |
| 申请量 | 申请日期在范围内的申请数，下方小字是其中已提交的份数（其余是草稿） |
| 通过率 | 已通过 ÷（已通过 + 已驳回）；范围内还没有办结的申请时显示「—」 |
| 平均处理时长 | 从提交到通过或驳回的平均天数，保留一位小数 |
| 在办申请 | **当前**待受理、审核中、待补件的申请数，不受范围影响 |

在办申请里有提交超过 15 天、仍待受理或审核中的，数字变成黄色，并显示「N 份超过 15 天未办结」，点击跳到申请受理列表。待补件在等申请人，不算超期。

**办理趋势**

- 柱子是提交量，折线是办结量（通过 + 驳回）。
- 范围不超过 62 天按日显示，更长按月显示；没有数据的日期或月份显示为 0，不会跳过。
- 鼠标悬停或用 Tab 键聚焦某一列，可以看到当天（当月）的提交、通过、驳回数。

**状态分布**：范围内申请当前所处的状态，按办理流程排序（草稿 → 待受理 → 审核中 → 待补件 → 已通过 → 已驳回 → 已撤回）。

**审批工作量**：范围内每位工作人员作出的审批决定数，以及其中「通过并建档」「驳回」的次数。决定数包含开始审核、初审通过、退回初审、要求补件等所有决定，最多列 20 人。

**按申请类型**：每种申请类型的申请量、通过、驳回、通过率、平均处理时长。

### 导出

点击右上角「导出 CSV」，下载 `report-<开始日期>-<结束日期>.csv`，内容依次为汇总指标、按类型统计、趋势明细。文件带 UTF-8 BOM，Excel 直接打开中文不会乱码。导出的是当前页面上的数据，不会重新查询。

## 统计口径

- **申请日期**：已提交的申请取提交时间，草稿取创建时间。申请量、状态分布、按类型统计都按申请日期筛选。
- **办结日期**：申请变为已通过或已驳回的时间（后端 `decided_at`），之后再改动申请不会影响它。趋势图里的通过、驳回按办结日期归入区间，所以某天的办结量可能来自更早提交的申请。
- **时区**：后端按 UTC 日期统计，北京时间 0:00–8:00 提交的申请会算在前一天。
- **撤回**：已撤回的申请计入申请量和状态分布，不计入通过率和平均处理时长。

## 后端接口约定

`GET /reports?from=yyyy-MM-dd&to=yyyy-MM-dd`，两个参数都可省略。不传参数时统计全部申请，工作台和侧边栏「申请受理」的待受理徽标用的就是这种调用。

```ts
interface ReportSummary {
  range: { from: string; to: string }
  granularity: "day" | "month"
  applicationTotal: number
  submittedTotal: number
  approvedTotal: number
  rejectedTotal: number
  approvalRate: number | null
  averageProcessingDays: number | null
  byStatus: Partial<Record<ApplicationStatus, number>>
  byType: Partial<Record<ApplicationType, number>>
  types: { type; total; approved; rejected; approvalRate; averageProcessingDays }[]
  trend: { period: string; submitted: number; approved: number; rejected: number }[]
  reviewers: { actorId; actorName; decisions; approved; rejected }[]
  backlog: { total: number; overdue: number; slaDays: number }
  generatedAt: string
}
```

日期格式错误或 `from` 晚于 `to` 时返回 `400 VALIDATION_FAILED`，页面会显示「报表加载失败」和错误原因。完整字段说明见后端 `API.md`。
