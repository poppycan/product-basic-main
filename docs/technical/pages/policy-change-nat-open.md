# NAT 开通 — 技术对照（§2.2）

> **不随页头/弹窗展示**；与《页面 UI 规范》§2.2 一致。业务说明见 `public/docs/pages/policy-change/nat-open.md` 与 `public/docs/pages/dialogs/policy-change-nat-open-add.md`。

---

## 一、页面级（§2.2.1）

### 路由与依赖

| 项 | 值 |
| --- | --- |
| 路径 | `/policy-change/nat-open` |
| name | `policy-change-nat-open` |
| 组件 | `src/pages/PolicyChangeNatOpen.vue` |
| 类型 | `NatOpenListRow`、`NatOpenFormState`（`src/types/nat-policy-open.ts`） |

### 页面说明加载

- 页头 `fetch`：`/docs/pages/policy-change/nat-open.md`（`PAGE_DOC_URL` 常量）。

### 筛选与状态（实现）

- `dateRange`、`statFilter`、`selectedDeviceId`，主查询 `qMode`/`qPolicyId`/`qVr`/`qDesc`，更多查询见源码表单项；`filteredRows` 前端计算（Mock）。

### 主数据模型（节选）

- 列表行：`NatOpenListRow`；枚举 `NatExecStatus`、`NatRowStatus` 见类型文件。

### 接口契约（草稿）

| 操作 | 说明 |
| --- | --- |
| GET 列表 | Query：设备 ID、时间、筛选、分页 |
| POST 创建 | Body：`NatOpenFormState` + `deviceId` |
| PUT 更新 | 路径含 id |
| DELETE | 批量/单条 |
| 预览 | `POST .../preview` 返回命令字符串（可选） |

### 原型与实现差异

- 列表 `buildMockRows`；导出/删除可能为占位提示。

### 弹窗 docKey 索引

| docKey | 文件 |
| --- | --- |
| `policy-change-nat-open-add` | `public/docs/pages/dialogs/policy-change-nat-open-add.md` |

---

## 二、添加/编辑弹窗（§2.2.2）

### 入口

- `addVisible`；`DialogPrototypeDoc`：`docKey="policy-change-nat-open-add"`。

### 只读条件

- `editFormReadonly`：`execStatus` 非「待下发」「下发失败」时为只读。

### 表单字段（与类型对照）

- 见 `NatOpenFormState`、`defaultNatFormState()`；模式显隐 `showSrcBlock` 等。
- IP：`validateNatIpFieldValue`（`src/utils/nat-ip-validate.ts`）。
- 选择器：`NatTablePickerField`、`NatIpKindField`；Mock 数据 `api/mock/nat-form-pickers.ts`。

### 命令

- `commandText` + `refreshCommand()` 前端拼接（原型）。

### 接口（草稿）

- `POST /api/policy-change/nat-open`、`PUT .../{id}`、`POST .../preview`（示例路径，联调待定）。

---

## 修订记录

| 日期 | 摘要 |
| --- | --- |
| 2026-04-07 | 初版：承接原 public 说明中的技术内容 |
