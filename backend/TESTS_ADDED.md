# 新增的 Maven 测试

本文档说明了本次任务中新增的 Maven 测试，以及每个测试存在的原因。除了基础的控制器契约校验外，这里也补充了几条更偏技术性的测试，用来锁定 JSON 序列化细节、复杂对象绑定行为和时间字段输出格式。

## 测试文件

- `src/test/java/com/neobank/module/controller/ApplicationControllerTest.java`

## 新增测试

### 1. `acceptsAMissingCommandAndReturnsItAsNullInTheAck`

检查内容：

- 当请求体包含 `applicationId` 但不包含 `command` 时，`POST /api/v1/applications` 仍然返回 `202 Accepted`。
- 确认响应体中包含预期的 `applicationId`。
- 确认 `command` 字段会被序列化为 JSON `null`，而不是引发错误。
- 确认 ACK 响应体仍保持固定 JSON 结构：`status`、`applicationId`、`serviceId`、`command`。
- 确认控制器仍会将请求转发给 `ApplicationService`。

添加此测试的原因：

- 控制器实现有意使用可变 map，而不是 `Map.of(...)`，因为 `command` 允许缺失。
- 如果没有这个测试，后续重构可能会意外把一个本来合法的请求变成 `500` 响应，或者悄悄改变响应结构。
- 这个测试用于保护部分字段缺失时的契约行为。

### 2. `listsPreviouslyProcessedApplications`

检查内容：

- `GET /api/v1/applications` 返回 `200 OK`。
- 控制器能够暴露 `ApplicationService.findAll()` 返回的列表。
- 返回的 JSON 按顺序包含预期的 `applicationId`、`status` 和 `createdAt` 值。
- `createdAt` 会以 ISO-8601 字符串形式序列化输出，而不是变成时间戳或其他格式。
- 该接口只调用一次 `ApplicationService.findAll()`，不会发生额外的服务层交互。

添加此测试的原因：

- 仓库原本已经覆盖了 POST 契约，但 GET 列表接口缺少同样基础的控制器级测试。
- 这个测试可以防止面向 UI 的读取接口在响应结构上发生意外回归。
- 它也为本模块自身的操作员界面数据流提供了一个简单的冒烟测试。

### 3. `bindsNestedApplicationObjectsWithoutCollapsingMissingAndExplicitValues`

检查内容：

- `POST /api/v1/applications` 可以正确绑定较复杂的嵌套请求体，而不只是浅层字段。
- `taxResidencies` 这样的列表字段会按原顺序绑定。
- `monthsAtAddress`、`dependants`、`monthsInEmployment` 这类包装类型数字字段会被正确保留。
- `useCurrentAddress`、`termsAccepted`、`paperlessStatements` 这样的布尔字段会区分 `true`、`false` 和 `null`。
- 内层 `application.applicationId` 和外层 envelope 的 `applicationId` 会分别保留，不会在绑定过程中相互覆盖。

添加此测试的原因：

- 这类请求是典型的 Jackson 记录类型绑定场景，比只验证一两个字符串字段更能防止模型被错误收紧。
- 它保护的是“复杂输入到强类型对象”的转换过程，一旦这里回归，业务规则即使没变也会收到错误数据。
- 它还能防止有人把 boxed 类型改成 primitive，导致“缺失值”和“显式 false/0”被混淆。

## 验证执行

针对这些测试使用的聚焦 Maven 验证命令是：

```powershell
.\mvnw.cmd -Dtest=ApplicationControllerTest test
```

这个命令需要在 `backend` 目录下执行。

修改完成后，这个定向测试类已通过，共执行 8 条测试，失败数为 0。

## 说明

这些测试仍然保持在控制器测试层：

- 不需要 Docker，
- 不会连接真实数据库，
- 会在常规 Maven 单元测试阶段快速运行，
- 但相比纯状态码断言，额外锁定了序列化契约和对象绑定行为。