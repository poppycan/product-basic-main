# 策略开通 — 添加弹窗

> `PolicyChangeOpen.vue` 内大弹窗 `addVisible`；`docKey`: `policy-change-open-add`。

## 1. 入口与前提

| 项 | 说明 |
| --- | --- |
| 打开方式 | 列表页点击「添加」 |
| 关闭方式 | 「关闭窗口」、`destroy-on-close` 关闭时重置 UI |
| 权限 | 与列表页一致（原型未细分） |

## 2. 布局分区

| 区域 | DOM/类名要点 | 职责 |
| --- | --- | --- |
| 标题栏 | `ElDialog` `#header` + 标题「策略开通」+ `DialogPrototypeDoc` | 原型说明入口 |
| 上：开通信息 | `policy-open-add__panel--openinfo` + `ElCollapse` | 表单：策略意图与负责人 |
| 下：开通目标设备 | `policy-open-add__panel--devices` | 工具栏 + 只读分析表 |
| 底 | `#footer` | 手动结束、关闭窗口 |

弹窗最大高度、遮罩滚动行为见 `.policy-open-add-dialog` 样式（避免整层滚动条）。

## 3. 开通信息区 — 表单字段

以下对应前端 `ref`，接口命名建议对齐（联调时映射）。

| 标签 | 前端 ref | 类型 | 必填 | 默认值/范围 | 校验与说明 |
| --- | --- | --- | --- | --- | --- |
| 策略名称 | `addPolicyName` | string | 否 | `''` | max 32，`show-word-limit` |
| 源 IP | `addSrcIp` | string | 条件 | `''` | 与目的 IP、端口**至少填一项**（见 `validateAddOpenPolicyFields`） |
| 目的 IP | `addDstIp` | string | 条件 | `''` | 同上 |
| 协议 | `addProtocol` | string | 是 | `tcpudp` | 可选 `tcpudp`/`tcp`/`udp`/`icmp`，参与组装 `service` 展示 |
| 端口 | `addPort` | string | 条件 | `''` | 同上；与协议组合为服务字符串（`buildServiceFromAddForm`） |
| 有效期类型 | `addValidUntil` | `'permanent'` \| `'custom'` | 是 | `permanent` | `custom` 时必须选 `addValidEndDate` |
| 结束时间 | `addValidEndDate` | string | 条件 | `''` | `value-format`: `YYYY-MM-DD HH:mm:ss`；自定义有效期必填 |
| 策略备注 | `addRemark` | string | 否 | `''` | Tooltip 多行说明见 `ADD_FORM_REMARK_TOOLTIP_LINES` |
| 源 IP 负责人 | `addSrcOwner` | string | 否 | `''` | 只读输入 + 点击打开「选择用户」弹窗 |
| 目的 IP 负责人 | `addDstOwner` | string | 否 | `''` | 同上 |

**保存并分析** `onAddSaveAnalyze`（逻辑摘要）

1. 调 `validateAddOpenPolicyFields()`：源/目的/端口不能全空；自定义有效期要有结束时间。
2. 通过后 `addDialogAnalyzed = true`；可收起开通信息 `addOpenInfoNames`；生成 `addDeviceTableRows`（当前为 `buildAddDeviceTableRows` 本地 Mock）。
3. 失败则 `ElMessage.warning`，不改变 `addDialogAnalyzed`。

## 4. 开通目标设备表 `AddDeviceRow`

| 字段 | 类型 | UI 说明 |
| --- | --- | --- |
| firewall | string | 两行截断 + Tooltip |
| policyName, src, dst, service, action, validUntil | string | 同上 |
| analysisResult | `'none'` \| `'need'` | 标签：无需开通 / 需要开通 |
| openMethod, abnormal | string | 开通方式、异常项（异常样式 `policy-open-add__abnormal`） |
| execStatusTag | 枚举见下 | `ElTag`，颜色 `execStatusTagType` |
| execStatusTime | string | 第二行时间 |
| verifyNeedManual | boolean | true 时显示警告图标，点击 `onManualVerifyDevice` |
| verifyManualOk | boolean | 手动校验成功后隐藏图标 |
| verifyHint | string | 验证提示 |
| verifyBlockIssuance | boolean | true 时「下发」禁用 + Tooltip |
| errorInfo | string | 错误列 |
| createdAt | string | 创建时间 |

**执行状态枚举** `DeviceExecStatusTag`：`待下发` | `下发成功` | `下发失败` | `回撤成功` | `回撤失败`

**空表文案** `addDialogTableEmptyText`：未分析前提示先保存并分析；分析后无数据为「无数据」。

## 5. 工具栏与行操作

| 控件 | 可用条件 | 行为（原型） |
| --- | --- | --- |
| 调整目标设备 | `addDialogAnalyzed` | 占位 |
| 下发配置命令 | `addDialogAnalyzed` | 占位 |
| 回撤 | `addDialogAnalyzed` | 占位 |
| 行「调整」 | 始终可点（以代码为准） | `openAdjustDialog` → `PolicyChangeAdjustDialog` |
| 行「下发」 | `verifyBlockIssuance` 为 true 时 disabled | 占位 |

**验证提示** 列表头 Tooltip 文案常量 `ADD_VERIFY_BLOCK_TOOLTIP`；屏蔽下发规则见其中四条。

## 6. 调整子弹窗

- 组件：`PolicyChangeAdjustDialog`，`v-model` = `adjustDialogVisible`。
- 入参：`adjustDialogDeviceRow`（由当前行映射 `AdjustDialogDeviceRow`）。
- 保存回调：`onAdjustDialogSave` 回写该行的 `execStatusTag`、`execStatusTime`（以 payload 为准）。
- **弹窗说明文档**：`/docs/pages/dialogs/policy-change-open-adjust.md`（`docKey`: `policy-change-open-adjust`，标题栏「原型说明」）。

## 7. 选择用户弹窗

- `addOwnerPickerVisible`，表格选系统用户，回填源/目的负责人（具体字段以 `onOwnerTableRowClick` 为准）。

## 8. 接口契约（草稿）

**保存并分析（建议）**

`POST /api/policy-change/open/analyze`

```json
{
  "policyName": "",
  "srcIp": "",
  "dstIp": "",
  "service": "TCP_UDP_443",
  "validUntil": "永久有效 | ISO 日期时间",
  "remark": "",
  "srcOwnerId": "",
  "dstOwnerId": ""
}
```

**响应（建议）**：`devices: AddDeviceRow[]` 或与后端协定字段 + 前端映射。

**手动校验**

`POST /api/policy-change/open/devices/{id}/verify-manual`（示例），成功前端置 `verifyManualOk`、清除屏蔽下发。

## 9. 异常与边界

- 表单校验失败：仅 Message，不关闭弹窗。
- 弹窗关闭：`resetAddDialogUi` 清空表单与设备表、`addDialogAnalyzed=false`。
- 长文本：表格列两行截断，Hover 看全文。

## 10. 关联文档

- 父页面：`/docs/pages/policy-change-open.md`

## 11. 文档修订记录

| 日期 | 摘要 |
| --- | --- |
| 2026-04-07 | 按 §2.1.2 扩充：字段表、状态机、接口草稿 |
