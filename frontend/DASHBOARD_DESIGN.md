# Module 10 Dashboard 前端完整设计

## 1. 这不是实时 BI

Module 10 是“Portfolio & Regulatory Analytics”的快照监管分析工作台。它回答的问题是：**在某个已冻结的历史版本中，申请旅程产生了什么结果、为什么，以及能否复现导出。**

因此本前端的首要设计原则不是“数据刷新得多快”，而是“每个数字是否能说清它来自哪个 snapshot”。页面不提供 live-feed refresh、snapshot edit、delete 或 retake-in-place。任何修正都只能 Take snapshot 创建新记录。

本次交付是前端完成版：React/Vite + 本地 Mock 网关；没有编写或改动后端。

## 2. 与现有 frontend 完全一致的视觉原则

保留现有 `src/design-system/` 的 Havn Glass Console：侧栏、玻璃卡片、字体、间距、语义 tone、表格和响应式断点均不改动。

- 复用 `AppShell`、`SideBrand`、`SideNav`、`PageHeader`、`Card`、`Section`、`DataTable`、`MetricTile`、`BarChart`、`Alert`、`EmptyState` 等现有组件。
- 不新增 Tailwind、图标库、图表库、字体、颜色或 CSS framework。
- `src/design-system/**` 不修改；新增布局只写在 `src/styles.css`，并且只使用 `--ds-*` token。
- 每个颜色状态都同时显示文字：COMPLETED/REJECTED/REFERRED/IN_PROGRESS、source、snapshot ID、rule version 不能只靠颜色表达。
- 在宽度 `<900px` 时，Funnel/Pareto、Extract 摘要、Definition 卡从双列变单列；`<720px` 时 Funnel 每行折成两列，14 列 schema 单列显示。

## 3. 信息架构与全局布局

侧栏只开放完成的核心 UC，不把 scheduled snapshots 或 drift compare 做成半成品入口：

```text
Portfolio & Regulatory Analytics
│
├─ Outcome summary                 UC 01
├─ Funnel & decline reasons        UC 02 + UC 03
├─ Regulatory extract              UC 04
├─ Snapshots & drill               UC 05 + UC 06 + UC 08
└─ Counting definitions            UC 07
```

桌面端共享 Shell：

```text
┌────────────── existing AppShell side nav ──────────────┬──────────────────────────────────────────────┐
│ Team 10 · Portfolio & Regulatory Analytics              │ Page title + rule-oriented lede                │
│                                                         │                                                │
│ Outcome summary                                        │ Snapshot context                                │
│ Funnel & decline reasons                               │ From | To | pinned snapshot                     │
│ Regulatory extract                                     │ Apply range | Take snapshot                     │
│ Snapshots & drill                                      │ snapshot ID · period · takenAt · source · rows  │
│ Counting definitions                                   │                                                │
│ Mock API ready · Reload history                        │ current page body                               │
└────────────────────────────────────────────────────────┴──────────────────────────────────────────────┘
```

`Snapshot context` 是所有分析页和快照页共同的视觉锚点；它明确说“frozen rows, never the live journey feed”。没有覆盖快照时，Context 显示 No covering snapshot，内容区显示 gate，而不是假装统计为 0。

## 4. 共享快照上下文与状态流

### 4.1 操作员可控制的内容

1. `From`、`To`：按 `submittedAt` 的报告范围。
2. 可选的 pinned historical snapshot：选择后范围切换到该 snapshot 自身范围。
3. `Apply range`：解除 pin，解析覆盖此范围的最新 snapshot。
4. `Take snapshot`：只在范围已 Apply 时可用；创建期间禁用日期、snapshot selector 和操作按钮，防止同一表单重复提交。

### 4.2 内部状态

`App.jsx` 唯一持有 `range`、`selectionMode`、`selectedSnapshotId`、完整 `snapshot`、analytics bundle 和错误状态。它先解析 snapshot，再并行请求 Summary/Funnel/Reasons/Extract metadata；所有四个结果都带同一个 `snapshotId`。

```text
apply range / select snapshot
        │
        ├─ 清空旧 snapshot 与旧 analytics
        ├─ 递增 context request sequence
        └─ resolveSnapshot(range, optional snapshotId)
                 │
                 ├─ no coverage → No Snapshot Gate
                 └─ detail → 同一 snapshotId 并行请求四个分析结果
                                  │
                                  └─ 请求序号仍是当前值才允许写入界面
```

这样晚到的旧 HTTP/Mock 响应无法把 A 快照的数字覆盖到 B 快照。CSV 下载也只在当前 snapshot 和 Extract metadata 都可用时启用。

### 4.3 不同业务状态

| 场景 | 界面行为 |
|---|---|
| 没有覆盖 snapshot / 409 | 不显示数字、图或 CSV；说明绝不回退 live feed；提供 Take snapshot。 |
| 有 snapshot，但范围内没有 journeys | 200 的正常结果：全零 KPI、空 Pareto、仅 header CSV。 |
| 当前日期包含在范围内 | Summary 显示 Partial day warning。 |
| 创建 snapshot 中 | 禁止重复创建和改变 Context。 |
| 创建失败 / 502 | 在所有带 Context 的页面显示 “No partial data was persisted”；history 不插入失败记录。 |
| snapshot 404 | 清除 pin，回到 history/latest coverage，不保留旧图表。 |
| 400 日期或 snapshot-period mismatch | 保留输入，显示错误，不加载旧上下文数据。 |
| 分析服务/网络 5xx | Error gate；不会把先前 snapshot 的分析值留在新范围中。 |
| Drill 尚未搜索 | 不发 rows API，显示引导 EmptyState。 |
| Drill 名称补全失败 | 业务行仍显示，姓名 `—`，提供 Retry names。 |

## 5. 五个页面的完整设计

### A. Outcome summary（UC 01）

```text
PageHeader: Outcome summary
  “counts by journey status · snapshot-served · counted by submittedAt”

Snapshot Context

Portfolio outcomes                                      [aside: how did we do?]
┌─────────────┬─────────────┬────────────┬────────────┬─────────────┐
│ Total       │ Completed   │ Rejected   │ Referred   │ In progress │
│ 192         │ 143 · 74.5% │ 36 · 18.8% │ 10 · 5.2%  │ 3 · 1.6%    │
└─────────────┴─────────────┴────────────┴────────────┴─────────────┘

Answered by snap-... · period · generatedAt · Outcome Summary rule v1
```

必须显示 total 和全部四种状态；指标旁显示占 total 的百分比。工作窗口 `2026-07-01 → 2026-07-14` 的 Mock 验收值为 `192 / 143 / 36 / 10 / 3`。页面标题右侧可直接跳到 Snapshots & drill；没有 snapshot 时不显示 KPI。

### B. Funnel & decline reasons（UC 02 + UC 03）

同一页、同一 Context，避免 Funnel 与 Pareto 来自不同 snapshot：

```text
PageHeader + Snapshot Context

┌────────────────────────────────────── 7/12 ─────────────────────────────────────┬────────────────── 5/12 ──────────────────┐
│ STEP FUNNEL                                                                        │ DECLINE REASONS                             │
│ Verification  Reached 200 ██████████  Passed 191 █████████▌  Drop 9                │ horizontal Pareto bars (top 10)              │
│ Eligibility   Reached 191 █████████▌  Passed 184 █████████▏  Drop 7                │ Rank | reason code | count                  │
│ ... eight server-ordered saga steps ...                                            │ 1    | CRE_INCOME_BELOW_MINIMUM | 9          │
│ Card          Reached 144 ███████▏    Passed 143 ███████▏   Drop 1                 │ 2    | VER_MISSING_FIELD       | 5          │
└───────────────────────────────────────────────────────────────────────────────────┴────────────────────────────────────────────┘
```

Funnel 不使用本地固定排序：服务端提供的 8 步及顺序原样渲染，未知步骤也保留。每行有 Step、Reached、Passed、Drop-off。Pareto 保留服务端 `count desc, code asc` 排序和未知 reason code；图和表最多显示 10 条，真实总数仍传给表格 footnote。

完整 fixture 可核对 `Verification 200/191`、`Card 144/143`、第一/第二原因 `CRE_INCOME_BELOW_MINIMUM = 9`、`VER_MISSING_FIELD = 5`。两个 Section 都显示当时的 rule version。

### C. Regulatory extract（UC 04）

```text
PageHeader + Snapshot Context

PUBLISHED CSV CONTRACT                                  [decided journeys only]
┌───────────────────────────────┬─────────────────────────────────────────┐
│ Snapshot ID                    │ [Download CSV]                          │
│ Period                         │ [View 14 columns]                       │
│ Decided rows                   │ same snapshot + same period = same bytes │
│ generated_at (= takenAt)       │                                         │
│ Extract rule vN                │                                         │
└───────────────────────────────┴─────────────────────────────────────────┘

展开时按固定顺序展示 14 个 column tags
```

页面显示 179 decided rows（默认工作窗口）、snapshot ID、period、generatedAt、rule version 和内容类型。下载行为只调用 `api.downloadExtract` 并把服务端 Blob 交给浏览器；前端不读取 CSV 再生成文件。14 列顺序由 `EXTRACT_COLUMNS` 常量与 Definition 页共同展示。

### D. Snapshots & drill（UC 05 + UC 06 + UC 08）

```text
PageHeader + 可编辑 Snapshot Context（Take snapshot 在这里也可执行）

┌──────────── selected snapshot audit ────────────┬────────── newest-first snapshot history ─────────┐
│ snapshot ID · source                             │ Snapshot ID | taken at | period | rows | source   │
│ takenAt · period · frozen rows · served count     │            | served                               │
│ [COMPLETED 143] [REJECTED 36] ...                 │ row click → selected audit                        │
│ Rules at snapshot time: OUTCOME_SUMMARY v1 ...    │ max 10 rows + true total footnote                 │
└──────────────────────────────────────────────────┴─────────────────────────────────────────────────┘

JOURNEY DRILL
[application ID or applicant name] [status] [Search]
empty until search; then ≤10 frozen rows
ID | applicant name | status | submitted | decided | product | channel | requested | granted | APR | duration | reason
```

Take snapshot 的文本明确警示：新操作复制当前 feed 的范围，成功后不可变；502 绝不留下半成品。History 没有编辑、删除、refresh 或 retake 按钮。

Drill 初始不请求。一次查询带 `limit=10`；无分页。行展示与 extract 对应的业务字段，`journeyDurationHours` 使用与 CSV 相同的服务端派生规则；period/generation 信息由页面上方的 Snapshot Context 提供。姓名是可见行的 render-time hydration，不属于 snapshot row。切换 snapshot 时立即清空先前 Drill 和姓名，in-flight search/hydration 的晚到响应会被 request sequence 丢弃。

### E. Counting definitions（UC 07）

```text
PageHeader: “rules explain what the code computes · versions are insert-only”

CURRENT RULEBOOK
┌────────────────────────┬────────────────────────┐
│ OUTCOME_SUMMARY · vN    │ FUNNEL · vN            │
│ definition text         │ definition text         │
├────────────────────────┼────────────────────────┤
│ DECLINE_REASONS · vN    │ EXTRACT · vN           │
│ definition text         │ text + ordered 14 cols │
└────────────────────────┴────────────────────────┘
```

页面是只读 rulebook：显示 key、version、effectiveFrom 和文本，使用户能从 UI 回答 “How do you count?”。Definition 发布需要权限模型，当前不显示编辑/删除/发布入口；历史 snapshot detail 显示其冻结时 `definitionVersions`，避免用今天的 definition 解释旧报表。

## 6. 前端文件与修改位置

| 文件 | 完成内容 |
|---|---|
| `src/App.jsx` | 五页状态导航、共享 range/snapshot、请求序号、防陈旧响应、全局 error/no-snapshot/take-error 管理。 |
| `src/api.js` | 唯一的数据边界；当前导出 Mock，真实后端仅替换这里。 |
| `src/dashboard/mockData.js` | snapshot 隔离的 Mock fixtures；不是生产监管计算。 |
| `src/dashboard/constants.js` | status filters 与严格的 14-column contract。 |
| `src/dashboard/format.js` | UTC、金额、百分比和 Blob 下载展示工具。 |
| `src/components/AnalyticsContextBar.jsx` | 日期、pin、provenance、Take snapshot、校验与错误提示。 |
| `src/components/OutcomeSummaryScreen.jsx` | UC 01 KPI 和 partial-day 状态。 |
| `src/components/FunnelDeclineScreen.jsx` | UC 02/03 的共享 Context、双度量 Funnel、top-10 Pareto。 |
| `src/components/FunnelChart.jsx` | 应用层 Funnel 绘制，只用 design tokens。 |
| `src/components/RegulatoryExtractScreen.jsx` | UC 04 metadata、14-column 契约、原始 Blob 下载。 |
| `src/components/SnapshotWorkspaceScreen.jsx` | UC 05/06/08 的 history、detail、Drill 与 retry hydration。 |
| `src/components/DefinitionsScreen.jsx` | UC 07 只读规则版。 |
| `src/status.js` | 模块业务词汇到现有 five-tone system 的唯一映射。 |
| `src/styles.css` | Context、7:5 分栏、Funnel、Extract、Definition 和响应式布局；不碰 design-system。 |
| `API_CONTRACT.md` | 每个网关/API、transport shape、错误码与后端接入要求。 |

旧的实时 placeholder `RequestsScreen.jsx` 已删除，不会轮询 `/applications`。

## 7. Mock 模式与验收数据

Mock 的目的只是让前端可完整演示，不是浏览器端替代后端。它为每个 snapshot 保留独立冻结行集合；Summary、Reasons、Drill 和 CSV 都从同一 snapshot/range 推导。

| 场景 | 验收结果 |
|---|---|
| 2026-07-01 → 2026-07-14 | 192 = 143 COMPLETED + 36 REJECTED + 10 REFERRED + 3 IN_PROGRESS |
| 同窗口 CSV | 14 列 header + 179 条 decided records，稳定按 `submitted_at, application_id` 排序 |
| 2026-07-01 → 2026-07-10 | 126 = 94 + 22 + 7 + 3 |
| 对空 June 范围 Take snapshot | 全零结果、header-only CSV、Drill 不泄漏其他 snapshot 的行 |
| app-1001 | Maria Shah · requested 3000 · granted 2800 · APR 24.9 |
| app-1048 | 第一次临时姓名 hydration 故意不可用，用于演示 `—` + Retry names；不会影响冻结行 |

Mock 与真实 fresh boot 一样从 `{items: [], total: 0}` 开始；先执行 Take snapshot 后即可演示全部验收数据与历史/Drill 流程。

## 8. 明确不做的内容

- 不编写、改动或假设后端业务实现。
- 不增加 schedule、snapshot compare/drift 的半成品 UI。
- 不增加趋势图、产品/渠道分段、实时监控等规格外分析。
- 不把 applicant name 或 CSV 持久化到浏览器。
- 不从实时 feed 补报表；无 snapshot 时宁可显示 gate。

真实 API 的完整 transport contract、normalization 和接入检查详见 [API_CONTRACT.md](API_CONTRACT.md)。
