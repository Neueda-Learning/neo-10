# Module 10 Dashboard 前端 API 契约

## 目的与边界

本文件是前端与将来后端联调时的唯一 API 说明。当前代码刻意只运行前端 Mock：`src/api.js` 指向 `src/dashboard/mockData.js`，**没有实现或要求任何后端代码**。

页面组件不能直接 `fetch`，只能调用 `api` 网关。未来接入真实服务时，只替换 `src/api.js` 的实现；页面、快照选择逻辑和图表组件不变。

所有 HTTP 路由以下列模块前缀为准：`/api/v1`。`/health`、`/info` 沿用现有 module shell 路由。

## 不可违反的全局规则

- 任何统计、漏斗、拒绝原因和 CSV 都必须由冻结的 snapshot 回答，绝不能回退到实时 journey feed。
- 日期是 ISO `YYYY-MM-DD`；时间是 UTC ISO-8601。
- 每个分析响应必须能确认 `snapshotId`、`takenAt`/`generatedAt` 和 definition version。
- 快照只创建，不编辑、不删除、不原地刷新；修正等于创建新的 snapshot。
- CSV 是服务端的原始字节流。前端只下载 Blob，不能解析、重排或重新计算。
- Drill row 不携带 `applicantName`；姓名只在当前最多 10 个可见行上临时补全，不能写入 snapshot、localStorage、CSV 或全局缓存。
- 所有列表必须返回真实 `total`，以便前端诚实显示最多 10 条的限制。
- JSON 错误统一采用：

```json
{
  "code": "SNAPSHOT_NOT_FOUND",
  "message": "Snapshot snap-000001 does not exist",
  "details": []
}
```

## 前端网关（`src/api.js`）

这是组件实际依赖的内部接口，不等于每一项都是一个 HTTP endpoint。

| 网关方法 | 实际来源 | 返回给页面的标准形状 | 使用位置 |
|---|---|---|---|
| `health()` | `GET /health` | `{ status }` | 左侧 shell 状态 |
| `info()` | `GET /info` | `{ team, service, serviceId, domain, version }` | 左侧品牌信息 |
| `resolveSnapshot({ range, snapshotId? })` | **网关组合动作** | `SnapshotDetail \| null` | 统一快照上下文 |
| `listSnapshots({ limit: 10 })` | `GET /snapshots` | `{ items: SnapshotHeader[], total }` | 选择器、历史表 |
| `getSnapshot(id)` | `GET /snapshots/{id}` | `SnapshotDetail` | 快照详情/resolve helper |
| `createSnapshot({ range })` | `POST /snapshots` | `SnapshotCreated` | Take snapshot |
| `getSummary({ range, snapshotId })` | `GET /summary` | `OutcomeSummary` | Outcome summary |
| `getFunnel({ range, snapshotId })` | `GET /funnel` | `FunnelReport` | Funnel |
| `getDeclineReasons({ range, snapshotId })` | `GET /decline-reasons` | `DeclineReasonsReport` | Pareto |
| `getExtractMeta({ range, snapshotId })` | `HEAD /extract` 或约定 metadata endpoint | `ExtractMeta` | 下载前摘要 |
| `downloadExtract({ range, snapshotId })` | `GET /extract` | `{ blob, filename, contentType }` | CSV 下载 |
| `searchSnapshotRows({ snapshotId, q, status, limit: 10 })` | `GET /snapshots/{id}/rows` | `DrillResult` | Journey drill |
| `hydrateApplicantNames(ids)` | 最多 10 次 `GET /cases/{id}/applicant` 的网关 fan-out | `{ [applicationId]: applicantName }` | Drill 的显示补全 |
| `listDefinitions()` | `GET /definitions` | `Definition[]` | Counting definitions |

### 网关标准模型

后端列表项可提供 `from`/`to`，但页面只使用网关统一后的 `range`：

```ts
type Range = { from: string; to: string };

type SnapshotHeader = {
  snapshotId: string;
  takenAt: string;
  range: Range;                 // api.js 将 transport from/to 正规化为此形状
  rowCount: number;
  source: string;               // 原样展示，如 fixture-v1、live-api、SCHEDULED
  servedCount: number;
};

type SnapshotDetail = SnapshotHeader & {
  statusCounts: {
    COMPLETED: number;
    REJECTED: number;
    REFERRED: number;
    IN_PROGRESS: number;
  };
  definitionVersions: {
    OUTCOME_SUMMARY: number;
    FUNNEL: number;
    DECLINE_REASONS: number;
    EXTRACT: number;
  };
};
```

`resolveSnapshot` 不是新增 REST endpoint：

- 明确 pin 了 `snapshotId` 时：调用 `getSnapshot(id)`，并验证其 `range` 覆盖当前范围。
- 未 pin 时：调用 `GET /summary?from&to`（服务端选择最新覆盖快照），用响应中的 `snapshotId` 调用 `getSnapshot(id)`；或由后端提供等价的“resolve coverage”查询。
- 没有覆盖快照时返回 `null`/409。它不能用 live feed 补数。

创建成功的 `POST /snapshots` 只返回 `SnapshotCreated` header；页面随后刷新历史并通过 `resolveSnapshot`/`getSnapshot` 获取完整 detail，绝不把 POST 回包误当 detail。

## 1. Shell API

### `GET /health`

```json
{ "status": "UP" }
```

仅控制 shell 状态，不控制任意报表是否最新。

### `GET /info`

```json
{
  "team": "Team 10",
  "service": "Portfolio & Regulatory Analytics",
  "serviceId": "neo-10",
  "domain": "analytics",
  "version": "5",
  "mockedDependencies": ["journey fixture"]
}
```

## 2. Outcome Summary — UC 01

### `GET /api/v1/summary?from={date}&to={date}&snapshotId={optional}`

`from`、`to` 必填且按 `submittedAt` 包含过滤；未传 `snapshotId` 时，服务端必须选择覆盖范围的最新快照。

```json
{
  "period": { "from": "2026-07-01", "to": "2026-07-14" },
  "snapshotId": "snap-000003",
  "generatedAt": "2026-07-16T06:00:00Z",
  "definitionVersion": 1,
  "counts": {
    "COMPLETED": 143,
    "REJECTED": 36,
    "REFERRED": 10,
    "IN_PROGRESS": 3
  },
  "total": 192,
  "partialDay": false
}
```

前端显示 period、snapshot、generatedAt、规则版本、total 和四种状态。有效但无记录的范围必须是 200 + 全零；`partialDay=true` 显示警告。

## 3. Step Funnel — UC 02

### `GET /api/v1/funnel?snapshotId={id}&from={date}&to={date}`

原始核心用例只列出 `snapshotId`。为了让本 dashboard 的 Funnel、Summary、Pareto 和 CSV 真正处于**同一个 report range**，前端网关还传 `from`、`to`，服务端应按冻结 row 的 `submittedAt` 过滤。若后端坚持 snapshot-wide Funnel，则前端必须锁定 range 等于 snapshot coverage，不能无提示地把 subset Summary 与 whole-snapshot Funnel 并列。

```json
{
  "snapshotId": "snap-000003",
  "takenAt": "2026-07-16T06:00:00Z",
  "definitionVersion": 1,
  "steps": [
    { "step": "Verification", "reached": 200, "passed": 191 },
    { "step": "Card", "reached": 144, "passed": 143 }
  ]
}
```

服务端顺序就是 saga 顺序；前端不按固定 step 名重排。显示 reached、passed、drop-off；未知 step 保留显示。完整 fixture 的验收端点是 `Verification 200/191` 与 `Card 144/143`。

## 4. Decline Reasons — UC 03

### `GET /api/v1/decline-reasons?from={date}&to={date}&snapshotId={id}`

`snapshotId` 在原用例中不是必填，但完整 dashboard 必须传它，保证 Summary/Funnel/Pareto/CSV 是同一份冻结数据。

```json
{
  "period": { "from": "2026-07-01", "to": "2026-07-14" },
  "snapshotId": "snap-000003",
  "takenAt": "2026-07-16T06:00:00Z",
  "definitionVersion": 1,
  "reasons": [
    { "code": "CRE_INCOME_BELOW_MINIMUM", "count": 9 },
    { "code": "VER_MISSING_FIELD", "count": 5 }
  ]
}
```

每个 REJECTED journey 恰好贡献一条冻结的 deciding-step first reason。服务端排序为 count 降序、code 升序；未知 code 原样展示；空数组是正确的 200 结果。前端图表与表均只显示 top 10，表保留真实 total。

## 5. Regulatory Extract — UC 04

### `GET /api/v1/extract?from={date}&to={date}&snapshotId={id}`

成功响应：

- `200`, `Content-Type: text/csv`
- 原始 CSV body
- `Content-Disposition`（含文件名）
- 必须约定并暴露给浏览器的 header：
  - `X-Snapshot-Id`
  - `X-Snapshot-Taken-At`
  - `X-Definition-Version`
  - `X-Extract-Row-Count`

为了下载前显示摘要，后端还应支持同查询参数的 `HEAD /api/v1/extract`（只返回这些 header）；若不支持 HEAD，必须另行定义只返回 metadata 的 endpoint。`api.getExtractMeta` 是网关 helper，不是前端自行解析 CSV。

CSV 固定 14 列且按此顺序：

```text
application_id
submitted_at
decided_at
outcome
product_code
channel
requested_credit_limit
granted_credit_limit
apr
decline_reason_code
journey_duration_hours
period_start
period_end
generated_at
```

只导出 COMPLETED 与 REJECTED；完整工作窗口为 179 行。`generated_at` 必须等于 snapshot 的 `takenAt`。同 snapshot + 同范围必须返回字节完全相同的文件。

## 6. Create Snapshot — UC 05

### `POST /api/v1/snapshots`

```json
{ "from": "2026-07-01", "to": "2026-07-14" }
```

```json
{
  "snapshotId": "snap-000004",
  "takenAt": "2026-07-17T09:00:04Z",
  "rowCount": 192,
  "source": "fixture-v1"
}
```

前端在 pending 时禁用日期、选择器与按钮，以避免重复提交；成功后重新读取 history 并选择新 snapshot；502 时在所有包含 Snapshot Context 的页面显示“没有持久化任何 partial data”。

服务端必须以 header 与 rows 的全有或全无事务写入。POST 幂等键的正式协议尚未由原规格确定；上线联调前应约定 `Idempotency-Key` header 的重放语义，前端目前先以禁用重复提交保护。

## 7. Snapshot History / Detail — UC 06

### `GET /api/v1/snapshots?limit=10`

```json
{
  "items": [
    {
      "snapshotId": "snap-000003",
      "takenAt": "2026-07-16T06:00:00Z",
      "from": "2026-07-01",
      "to": "2026-07-14",
      "rowCount": 192,
      "source": "fixture-v1",
      "servedCount": 14
    }
  ],
  "total": 27
}
```

网关把每项的 `from`/`to` 标准化为 `range`。历史按最新优先、最多 10 项；fresh boot 合法地返回 `{items: [], total: 0}`。

### `GET /api/v1/snapshots/{snapshotId}`

```json
{
  "snapshotId": "snap-000003",
  "takenAt": "2026-07-16T06:00:00Z",
  "range": { "from": "2026-07-01", "to": "2026-07-14" },
  "rowCount": 192,
  "source": "fixture-v1",
  "servedCount": 14,
  "statusCounts": {
    "COMPLETED": 143,
    "REJECTED": 36,
    "REFERRED": 10,
    "IN_PROGRESS": 3
  },
  "definitionVersions": {
    "OUTCOME_SUMMARY": 1,
    "FUNNEL": 1,
    "DECLINE_REASONS": 1,
    "EXTRACT": 1
  }
}
```

404 时网关清除 pinned selection、回到 history；若 pinned snapshot 不覆盖当前 range，返回 400 `SNAPSHOT_PERIOD_MISMATCH`，不允许混合数据。

## 8. Journey Drill 与姓名补全 — UC 08

### `GET /api/v1/snapshots/{snapshotId}/rows?q={optional}&status={optional}&limit=10`

```json
{
  "items": [
    {
      "applicationId": "app-1001",
      "status": "COMPLETED",
      "submittedAt": "2026-07-01T08:15:00Z",
      "decidedAt": "2026-07-01T12:45:00Z",
      "productCode": "CREDIT_CARD_REWARDS",
      "channel": "WEB",
      "requestedCreditLimit": 3000,
      "grantedCreditLimit": 2800,
      "apr": 24.9,
      "declineReasonCode": null,
      "journeyDurationHours": 4.5
    }
  ],
  "total": 1,
  "limit": 10,
  "truncated": false
}
```

前端初始不请求 rows；用户搜索 application ID、applicant name 或选择状态后才请求。`applicantName` 永远不在此响应内。`journeyDurationHours` 是与 CSV 相同规则的服务端派生显示字段；report period 和 generatedAt 由全局 Snapshot Context 显示。若 `total > 10`，不分页加载更多，只提示 refine。

### `GET /api/v1/cases/{applicationId}/applicant`

```json
{ "applicationId": "app-1001", "applicantName": "Maria Shah" }
```

真实 `hydrateApplicantNames(ids)` 适配器须最多对当前可见的十个 ID 发十次单独 GET，并以 `Promise.allSettled` 合并。失败行仍显示冻结业务字段和 `—`，同时提供 Retry names；不得缓存姓名。Mock 只为演示这个网关行为而内存模拟，不代表 production 把姓名放进前端 snapshot。

## 9. Counting Definitions — UC 07

### `GET /api/v1/definitions`

```json
{
  "items": [
    {
      "key": "OUTCOME_SUMMARY",
      "version": 1,
      "text": "Counts are grouped by journey status and filtered by submittedAt.",
      "effectiveFrom": "2026-07-01T00:00:00Z"
    }
  ]
}
```

页面展示四个 current key：`OUTCOME_SUMMARY`、`FUNNEL`、`DECLINE_REASONS`、`EXTRACT`；EXTRACT 还显示完整 14 列顺序。

### `POST /api/v1/definitions`

```json
{
  "key": "EXTRACT",
  "text": "Published column contract v2",
  "columns": ["application_id", "submitted_at"]
}
```

成功 `201`：`{ "version": 2 }`。这是 append-only 的新版本，不是编辑。核心 dashboard 当前是只读 definition 页；在角色/权限未确定前，不显示发布入口。

## 10. 统一错误与前端恢复

| HTTP | 典型 code | 前端行为 |
|---|---|---|
| 400 | `INVALID_PERIOD` / `SNAPSHOT_PERIOD_MISMATCH` | 保留输入、显示校验错误，不加载图表 |
| 404 | `SNAPSHOT_NOT_FOUND` | 清除 pin，回到 history / latest coverage |
| 409 | `SNAPSHOT_REQUIRED` | No Snapshot Gate；不显示假零值或 live 数据 |
| 502 | `FEED_UNAVAILABLE` / `SNAPSHOT_FAILED` | 保留旧 history，显示 “No partial data was persisted” |
| 5xx/网络错误 | — | Error gate；不保留旧上下文数字 |

`App.jsx` 对 range/snapshot 改变采用 request sequence：旧 resolve、analytics、drill 和 hydration 响应都不能覆盖新上下文。

## 11. 候选功能（核心 UC 01–08 后）

### `GET /api/v1/snapshots/compare?a={id}&b={id}` — UC 10

仅允许相同范围的两个 snapshot；返回两边 counts、deltas、only-in-A/B、statusChanged。所有应用列表最多 10 条且带 total；不同范围返回 400；不得读取 live feed 或变更 snapshot。

### Scheduled snapshots — UC 09

原规格说明了行为但没有正式 REST contract。后端确认前不要实现 production UI。至少需覆盖版本化 schedule、enabled、执行窗口、MANUAL/SCHEDULED source、失败历史和重复窗口 skip 证据。

## Mock 验收数据与接入检查

当前 Mock 不把前端临时聚合结果伪装成 live 数据：每个 snapshot 有独立的 frozen row 集；Summary、Drill、Reasons 和 CSV 都从所选 snapshot 与 range 推导。

- `2026-07-01 → 2026-07-14`：192 = 143 COMPLETED + 36 REJECTED + 10 REFERRED + 3 IN_PROGRESS；CSV 179 数据行；top reasons 9/5。
- `2026-07-01 → 2026-07-10`：126 = 94 + 22 + 7 + 3。
- 全量 funnel：Verification 200/191；Card 144/143。
- 对 June 这类无数据范围 Take snapshot：得到有效空结果；Drill 不返回任何其他 snapshot 的 row。

真实后端接入前的检查：

1. 只替换 `src/api.js`；不把 `fetch` 放入组件。
2. 将 transport `from`/`to` 正规化成 UI 的 `range`，创建后再拿 detail。
3. CSV 使用专用 Blob helper，并暴露所需 provenance/row-count header。
4. 验证 400、404、409、502、网络失败和 stale-response 场景。
5. 运行 `npm ci && npm run build`，再人工验证五个核心页面与窄屏布局。
