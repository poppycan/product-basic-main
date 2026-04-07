# 策略开通 — 调整弹窗

> 组件：`PolicyChangeAdjustDialog.vue`；类型：`src/types/policy-change-adjust.ts`。`docKey`: `policy-change-open-adjust`。

## 1. 入口与前提

| 项 | 说明 |
| --- | --- |
| 打开方式 | 策略开通列表「添加」弹窗内，开通目标设备表行内点击「调整」；或其它页面传入 `modelValue=true` 且 `deviceRow` 非空 |
| 关闭方式 | 「关闭」、保存成功后自动关闭、`destroy-on-close` |
| 入参 `deviceRow` | `AdjustDialogDeviceRow`：`id`、`policyName`、`src`、`dst`、`service`、`action`、`validUntil`、`remark`、`execStatusTag`、`execStatusTime`、`firewall?` |

## 2. 只读与可编辑

| `execStatusTag` | 表单与命令 |
| --- | --- |
| `待下发`、`下发失败` | `formEditable === true`：左侧表单可编辑；可「保存」；命令区可更新/编辑（见实现） |
| `下发成功`、`回撤成功`、`回撤失败` | `formEditable === false`：整表 `:disabled`；顶部 `ElAlert` 提示 `readonlyReason`；仅可查看命令、复制、下载 |

## 3. 布局分区

| 区域 | 说明 |
| --- | --- |
| 标题栏 | 「调整」+ **原型说明**（`DialogPrototypeDoc`） |
| 左 | 开通策略表单：`issueMode === 'new'` 为完整表单；`'merge'` 为可合并策略摘要只读 |
| 右 | 配置命令：更新命令、编辑/保存/取消编辑、复制、下载、翻译（占位） |
| 底 | `formEditable` 时显示「保存」；始终「关闭」 |

双栏 `grid` 1:1，窄屏单列（见组件媒体查询）。

## 4. 下发方式 `issueMode`

| 值 | 含义 |
| --- | --- |
| `new` | 新建策略：策略名称、策略 ID、下发位置、源/目的/服务信息、有效期、动作、备注 |
| `merge` | 可合并策略：无列表时「可合并策略」选项禁用；需选择 `selectedMerge`；展示摘要 `mergeSummaryText` |

## 5. 表单字段（`issueMode === 'new'`）

### 5.1 下发方式行

| 字段 | 前端 | 说明 |
| --- | --- | --- |
| 下发方式 | `issueMode` | `ElSelect`：新建策略 / 可合并策略 |
| 策略名称 | `policyName` | 仅 `new`，max 64 |
| 可合并策略 | `selectedMerge` | `merge` 时只读输入点击打开子弹窗选择 |

### 5.2 策略 ID

| `policyIdMode` | `custom` 时填 `policyIdCustom`（max 64） |

### 5.3 下发位置 `deployPosition`

| 值 | 标签 | 禁用条件 |
| --- | --- | --- |
| `top` | 置顶 | - |
| `before_merge` | 可合并策略之前 | 无合并列表或已选 merge 模式时禁用，且 watch 会改回 top |
| `insert_before_top` | 插入指定策略之前 | 需 `namedTopPolicy` |
| `insert_after_top` | 插入置顶策略之后 | 需 `namedTopPolicy` |

`needsNamedTopPolicy` 为真时展示「点击选择指定策略」→ `topPolicyPickerVisible` 弹窗。

### 5.4 源 / 目的 / 服务

- **新建对象**：名称 + 地址/端口多行；Tooltip 见 `NEW_OBJECT_SRC_DST_TOOLTIP`、`NEW_OBJECT_SVC_TOOLTIP`。
- **引用对象**：`srcRef` / `dstRef` / `svcRef`，多选，选项 `REF_OPTIONS`（原型）。
- **区域**：`srcZone` / `dstZone` 必选多选，`ZONE_OPTIONS`；下方 `zoneDisplay` 提示文案。
- **服务**：`svcProtocol`、`svcPort`；校验见 `validate()`（端口与协议、空对象等）。

### 5.5 有效期与动作

- `validityMode`：`permanent` | `custom`；自定义用 `validityRange` 日期时间范围。
- `actionAllow`：允许 / 拒绝。
- `remark`：max 512。

## 6. 配置命令区

- `commandText` / `commandDraft`：更新、进入编辑、保存编辑、取消编辑。
- **保存**校验 `validate()` 不通过则 `ElMessage.warning` 并中断。

## 7. 子弹窗

| 弹窗 | 作用 |
| --- | --- |
| 选择可合并策略 | `mergePickerVisible`，`mergeTempId` → `confirmMergePicker` |
| 选择置顶策略 | `topPolicyPickerVisible`，`topPolicyTempId` → `confirmTopPolicyPicker` |

## 8. 保存 `save` 事件

`AdjustSavePayload`：

```ts
{
  execStatusTag: '待下发',
  execStatusTime: string // 原行为「下发失败」时置 ''，否则保留原 execStatusTime
}
```

原型：`emit('save', payload)` 后关闭并 `ElMessage.success`。联调后应提交完整表单与命令。

## 9. 接口契约（草稿，联调待定）

`PUT /api/policy-change/open/devices/{deviceRow.id}/adjust` 或业务约定路径。

Body 建议包含：下发方式、策略元数据、源/目的/服务对象、有效期、动作、备注、命令文本。

## 10. 关联文档

- 父弹窗（添加）：`/docs/pages/dialogs/policy-change-open-add.md`
- 历史说明：`docs/开通-调整页面说明.md`

## 11. 文档修订记录

| 日期 | 摘要 |
| --- | --- |
| 2026-04-07 | 初版：与 PolicyChangeAdjustDialog 实现对齐；接入原型说明 |
