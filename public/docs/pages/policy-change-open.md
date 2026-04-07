# 策略开通 — 页面说明

> 本文档与路由 `policy-change-open`（`/policy-change/open`）及 `PolicyChangeOpen.vue` 对齐，供前后端与测试对照开发。

## 1. 路由与依赖

| 项 | 值 |
| --- | --- |
| 路径 | `/policy-change/open` |
| 路由 name | `policy-change-open` |
| 页面组件 | `src/pages/PolicyChangeOpen.vue` |
| 页头 | `PageHeader` + `PolicyChangeHeaderBreadcrumb` + `PolicyChangeHeaderActions` |
| 页体 | `PageContent`，主区 `TimeFilterBar` + 状态色块 + 查询区 + 表格 + 分页 |
| 关联组件 | `TimeFilterBar`、`PolicyChangeOpenPrototypeDoc`（页头说明）、`PolicyChangeAdjustDialog`（添加弹窗内「调整」） |

## 2. 范围与非目标

**本页负责**

- 展示策略开通任务列表；按时间、聚合状态、多条件筛选；分页。
- 打开「添加」大弹窗完成新建开通单（开通信息 + 开通目标设备表）；行内「调整」进入调整弹窗。

**本页不负责（联调前原型未实现或仅占位）**

- 真实拓扑/设备分析服务、真实下发/回撤与设备回读（当前多为前端 Mock/提示）。
- 与 NAT 开通、策略修改等其它子菜单的业务逻辑（见各自页面说明）。

## 3. 信息架构与用户路径

1. 进入页面 → 可选时间范围、状态色块、主/更多条件 → 「查询」刷新列表。
2. 「添加」→ 大弹窗：填写开通信息 →「保存并分析」→ 下半区设备表可用 → 行内「调整」/工具栏按钮（原型占位）→「关闭窗口」。
3. 列表行操作（如查看）以当前实现为准。

## 4. 筛选与列表

### 4.1 时间筛选（`TimeFilterBar`）

- 快捷项：今日、本周、上周、本月、最近 1 个月、自定义（与组件实现一致）。
- **自定义**：起止精确到秒；过滤字段语义为条目 **创建时间** 落在区间内。
- `null`/未选：不按创建时间过滤（以代码为准）。

### 4.2 状态色块 `statFilter`

| UI 标签 | 值 | 列表过滤含义（聚合） |
| --- | --- | --- |
| 全部 | `all` | 不过滤聚合状态 |
| 未完成 | `incomplete` | 行 `rowStatus === 'incomplete'` |
| 已完成 | `completed` | `rowStatus === 'completed'` |
| 已取消 | `cancelled` | `rowStatus === 'cancelled'` |

行级 `rowStatus` 与多墙目标状态的关系见产品规则；原型数据已为每行预置聚合结果。

### 4.3 主查询与更多查询

- 默认展示：策略名称、策略备注、源 IP、目的 IP 等（以表格列为准）。
- 「更多条件」展开后逐行展示额外过滤字段；「查询」组合 **时间 + statFilter + 所有已填条件** 过滤。
- 「一键清除」重置条件（以按钮实现为准）。

### 4.4 分页

- 固定每页条数（如 10）；仅列表区域滚动；分页栏不随表体滚动。

## 5. 主数据模型（列表行 `OpenRow` — 摘要）

| 字段/区域 | 说明 |
| --- | --- |
| id | 列表唯一标识 |
| name | 开通配置策略名称，可为空 |
| rowStatus | `incomplete` \| `completed` \| `cancelled`，与色块联动 |
| 源/目的 IP、服务、动作、有效期 | 展示与 Tooltip 两行截断规则见实现 |
| 目标防火墙、策略备注、负责人、开通周期 | 多行单元格组件展示 |
| 操作 | 如查看等，以列配置为准 |

完整字段以 `PolicyChangeOpen.vue` 中 `OpenRow` 接口及 mock 构造为准。

## 6. 接口契约（草稿，联调待定）

以下路径与字段为**约定草案**，上线前与 Swagger/网关对齐。

| 操作 | 方法 | 路径（示例） | 说明 |
| --- | --- | --- | --- |
| 列表查询 | GET | `/api/policy-change/open/tasks` | Query：`page`、`pageSize`、时间范围、statFilter、各筛选字段 |
| 导出/删除等 | - | - | 当前多为 `ElMessage` 占位，对接时替换 |

响应体建议包含 `items[]`、`total`，单条结构与列表行字段一致。

## 7. UI / 交互细则

- **固定行数/空行**：遵循《页面 UI 规范》§4 列表规范（每页固定行数、空行无占位符与操作）。
- **页头**：右侧「策略变更」子入口 + `PolicyChangeOpenPrototypeDoc`（整页说明，本文件）。
- **主题**：浅色/深色与 `Element Plus` 变量一致。

## 8. 原型与实现差异

- 添加弹窗内设备表数据在「保存并分析」后由前端 `buildAddDeviceTableRows` 生成演示数据；联调后改为接口返回。
- 工具栏「调整目标设备」「下发配置命令」「回撤」等可仍为占位提示。

## 9. 关联文档

- 添加大弹窗：`/docs/pages/dialogs/policy-change-open-add.md`（`docKey`: `policy-change-open-add`）
- 调整弹窗：`/docs/pages/dialogs/policy-change-open-adjust.md`（`docKey`: `policy-change-open-adjust`）；补充材料见 `docs/开通-调整页面说明.md`

## 10. 文档修订记录

| 日期 | 摘要 |
| --- | --- |
| 2026-04-07 | 按 §2.1 扩充为开发可对照说明 |
