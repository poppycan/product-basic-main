<script setup lang="ts">
/**
 * 调整弹窗：说明见 public/docs/pages/dialogs/policy-change-open-adjust.md；补充见 docs/开通-调整页面说明.md
 */
import { computed, ref, watch } from 'vue';
import {
  ChatLineRound,
  Close,
  CopyDocument,
  Download,
  EditPen,
  QuestionFilled,
  RefreshRight,
} from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import DialogPrototypeDoc from '@/components/DialogPrototypeDoc.vue';
import type {
  AdjustDialogDeviceRow,
  AdjustSavePayload,
  DeployPosition,
  IssueMode,
  MergeablePolicyOption,
  PolicyIdMode,
  ServiceProtocol,
  TopPolicyOption,
  ValidityMode,
} from '@/types/policy-change-adjust';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    /** 当前设备行；关闭时可 null */
    deviceRow: AdjustDialogDeviceRow | null;
    /** 可合并策略列表；空则「可合并策略」置灰 */
    mergeablePolicies?: MergeablePolicyOption[];
    /** 置顶策略插入时可选策略 */
    topPolicyOptions?: TopPolicyOption[];
  }>(),
  {
    mergeablePolicies: () => [
      { id: 'mp1', name: 'allow-web-merge' },
      { id: 'mp2', name: 'dmz-to-db-聚合' },
    ],
    topPolicyOptions: () => [
      { id: 'tp1', name: '置顶策略-边界放行' },
      { id: 'tp2', name: '置顶策略-管理通道' },
    ],
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  save: [payload: AdjustSavePayload];
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

const formEditable = computed(() => {
  const t = props.deviceRow?.execStatusTag;
  return t === '待下发' || t === '下发失败';
});

const readonlyReason = computed(() => {
  if (formEditable.value) return '';
  return '当前为下发成功、回撤成功或回撤失败，仅可查看配置与命令。';
});

const issueMode = ref<IssueMode>('new');
const selectedMerge = ref<MergeablePolicyOption | null>(null);
const mergePickerVisible = ref(false);
const mergeTempId = ref<string | null>(null);

const policyName = ref('');
const policyIdMode = ref<PolicyIdMode>('system');
const policyIdCustom = ref('');
const deployPosition = ref<DeployPosition>('top');
const namedTopPolicy = ref<TopPolicyOption | null>(null);
const topPolicyPickerVisible = ref(false);
const topPolicyTempId = ref<string | null>(null);

const srcNewName = ref('');
const srcNewIp = ref('');
const srcRef = ref<string[]>([]);
const srcZone = ref<string[]>([]);

const dstNewName = ref('');
const dstNewIp = ref('');
const dstRef = ref<string[]>([]);
const dstZone = ref<string[]>([]);

const svcNewName = ref('');
const svcProtocol = ref<ServiceProtocol>('tcpudp');
const svcPort = ref('');
const svcRef = ref<string[]>([]);
const svcZone = ref<string[]>([]);

const validityMode = ref<ValidityMode>('permanent');
/** 自定义有效期：与 ElDatePicker value-format 一致 */
const validityRange = ref<[string, string] | null>(null);
const actionAllow = ref(true);
const remark = ref('');

const commandText = ref('');
const commandEditing = ref(false);
const commandDraft = ref('');

const REF_OPTIONS = ['办公网段对象', 'DMZ-Web', '核心区-DB'];
const ZONE_OPTIONS = ['trust', 'untrust', 'dmz', 'MPLS'];

/** 区域 / 新建对象 表单项旁提示（hover） */
const ZONE_TOOLTIP = '根据引用与新建对象计算，可手动调整。';
const NEW_OBJECT_SRC_DST_TOOLTIP = 'IPv4/IPv6，支持范围与掩码；不填为 any';
const NEW_OBJECT_SVC_TOOLTIP =
  '支持端口，端口1-端口2，多个用逗号分隔；若为ICMP则格式为前type后code逗号隔开，如15,0，不填为any';

const hasMergeable = computed(() => props.mergeablePolicies.length > 0);

const deployBeforeMergeDisabled = computed(
  () => !hasMergeable.value || issueMode.value === 'merge',
);

const deploySelectOptions = computed(() => {
  const d = deployBeforeMergeDisabled.value;
  return [
    { value: 'top' as DeployPosition, label: '置顶', disabled: false },
    { value: 'before_merge' as DeployPosition, label: '可合并策略之前', disabled: d },
    {
      value: 'insert_before_top' as DeployPosition,
      label: '插入指定策略之前',
      disabled: false,
    },
    {
      value: 'insert_after_top' as DeployPosition,
      label: '插入置顶策略之后',
      disabled: false,
    },
  ];
});

const needsNamedTopPolicy = computed(
  () =>
    deployPosition.value === 'insert_before_top' ||
    deployPosition.value === 'insert_after_top',
);

watch(deployBeforeMergeDisabled, (d) => {
  if (d && deployPosition.value === 'before_merge') deployPosition.value = 'top';
});

watch(issueMode, (m) => {
  if (m === 'merge') {
    deployPosition.value = 'top';
  }
});

const mergeSummaryText = computed(() => {
  const r = props.deviceRow;
  if (!r) return '';
  const name = selectedMerge.value?.name ?? '（未选择可合并策略）';
  return [
    `策略名称：${name}`,
    `目标防火墙：${r.firewall ?? '—'}`,
    `源：${r.src}`,
    `目的：${r.dst}`,
    `服务：${r.service}`,
    `动作：${r.action}`,
    `有效期：${r.validUntil}`,
    `备注：${r.remark || '—'}`,
    '',
    '说明：以上为可合并策略摘要，字段只读；实际下发以右侧配置命令为准。',
  ].join('\n');
});

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function parseServiceFromRow(s: string): { protocol: ServiceProtocol; port: string } {
  const t = s.trim();
  if (!t) return { protocol: 'tcpudp', port: '' };
  const upper = t.toUpperCase();
  let protocol: ServiceProtocol = 'tcpudp';
  if (upper.startsWith('TCP_UDP') || upper.startsWith('TCP/UDP')) protocol = 'tcpudp';
  else if (upper.startsWith('TCP')) protocol = 'tcp';
  else if (upper.startsWith('UDP')) protocol = 'udp';
  else if (upper.startsWith('ICMP')) protocol = 'icmp';
  const port = t.includes('_') ? t.split('_').slice(1).join('_') : '';
  return { protocol, port };
}

function actionFromRow(a: string): boolean {
  return a === '允许' || a === 'allow';
}

function validityFromRow(v: string): { mode: ValidityMode; range: [Date, Date] | null } {
  if (!v || v.includes('永久')) return { mode: 'permanent', range: null };
  return { mode: 'custom', range: null };
}

function resetFormFromRow() {
  const r = props.deviceRow;
  if (!r) return;
  issueMode.value = 'new';
  selectedMerge.value = null;
  mergeTempId.value = null;
  policyName.value = r.policyName?.trim() || autoPolicyName();
  policyIdMode.value = 'system';
  policyIdCustom.value = '';
  deployPosition.value = 'top';
  namedTopPolicy.value = null;
  srcNewName.value = '';
  srcNewIp.value = r.src || '';
  srcRef.value = [];
  srcZone.value = [];
  dstNewName.value = '';
  dstNewIp.value = r.dst || '';
  dstRef.value = [];
  dstZone.value = [];
  const sp = parseServiceFromRow(r.service);
  svcNewName.value = '';
  svcProtocol.value = sp.protocol;
  svcPort.value = sp.port;
  svcRef.value = [];
  svcZone.value = [];
  const va = validityFromRow(r.validUntil);
  validityMode.value = va.mode;
  validityRange.value = null;
  actionAllow.value = actionFromRow(r.action);
  remark.value = r.remark || '';
  commandText.value = '';
  commandEditing.value = false;
  commandDraft.value = '';
}

function autoPolicyName() {
  const d = new Date();
  return `plo-${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
}

watch(
  () => [props.modelValue, props.deviceRow] as const,
  ([open, row]) => {
    if (open && row) {
      resetFormFromRow();
      commandText.value = generateCommand();
    }
  },
);

function formatZoneLabel(zones: string[]) {
  if (!zones.length) return '';
  const shown = zones.slice(0, 2);
  const rest = zones.length - 2;
  let s = shown.join(', ');
  if (rest > 0) s += ` +${rest}`;
  return s;
}

function zoneDisplay(zones: string[]) {
  return formatZoneLabel(zones);
}

function openMergePicker() {
  if (!formEditable.value || !hasMergeable.value) return;
  mergeTempId.value = selectedMerge.value?.id ?? props.mergeablePolicies[0]?.id ?? null;
  mergePickerVisible.value = true;
}

function confirmMergePicker() {
  const hit = props.mergeablePolicies.find((x) => x.id === mergeTempId.value);
  selectedMerge.value = hit ?? null;
  mergePickerVisible.value = false;
}

function openTopPolicyPicker() {
  if (!formEditable.value) return;
  topPolicyTempId.value = namedTopPolicy.value?.id ?? props.topPolicyOptions[0]?.id ?? null;
  topPolicyPickerVisible.value = true;
}

function confirmTopPolicyPicker() {
  const hit = props.topPolicyOptions.find((x) => x.id === topPolicyTempId.value);
  namedTopPolicy.value = hit ?? null;
  topPolicyPickerVisible.value = false;
}

function generateCommand(): string {
  const sync: Record<string, string> = {
    issueMode: issueMode.value,
    policyName: issueMode.value === 'merge' ? selectedMerge.value?.name ?? '' : policyName.value,
    policyIdMode: policyIdMode.value,
    policyIdCustom: policyIdCustom.value,
    deployPosition: deployPosition.value,
    namedTopPolicy: namedTopPolicy.value?.name ?? '',
    'src.newName': srcNewName.value,
    'src.ip': srcNewIp.value,
    'src.ref': srcRef.value.join(','),
    'src.zone': srcZone.value.join(','),
    'dst.newName': dstNewName.value,
    'dst.ip': dstNewIp.value,
    'dst.ref': dstRef.value.join(','),
    'dst.zone': dstZone.value.join(','),
    'svc.newName': svcNewName.value,
    'svc.protocol': svcProtocol.value,
    'svc.port': svcPort.value,
    'svc.ref': svcRef.value.join(','),
    'svc.zone': '',
    validityMode: validityMode.value,
    validityRange:
      validityMode.value === 'custom' && validityRange.value
        ? `${validityRange.value[0]} ~ ${validityRange.value[1]}`
        : '',
    actionAllow: actionAllow.value ? 'allow' : 'deny',
    remark: remark.value,
  };

  if (issueMode.value === 'merge') {
    return [
      '# 可合并策略 — 配置命令预览',
      mergeSummaryText.value,
      '',
      '---FORM_SYNC---',
      ...Object.entries(sync).map(([k, v]) => `${k}=${v}`),
      '---END---',
    ].join('\n');
  }

  const lines = [
    '# 新建策略 — 配置命令预览',
    `策略名称: ${policyName.value}`,
    `策略ID: ${policyIdMode.value === 'custom' ? policyIdCustom.value.trim() || '(自定义未填)' : '系统分配'}`,
    `下发位置: ${deployPositionLabel(deployPosition.value)}`,
    namedTopPolicy.value && (deployPosition.value === 'insert_before_top' || deployPosition.value === 'insert_after_top')
      ? `指定置顶策略: ${namedTopPolicy.value.name}`
      : '',
    '',
    '【源信息】',
    `  新建对象名: ${srcNewName.value}`,
    `  IP: ${srcNewIp.value}`,
    `  引用对象: ${srcRef.value.join(', ') || '—'}`,
    `  区域: ${zoneDisplay(srcZone.value) || '—'}`,
    '',
    '【目的信息】',
    `  新建对象名: ${dstNewName.value}`,
    `  IP: ${dstNewIp.value}`,
    `  引用对象: ${dstRef.value.join(', ') || '—'}`,
    `  区域: ${zoneDisplay(dstZone.value) || '—'}`,
    '',
    '【服务信息】',
    `  新建对象名: ${svcNewName.value}`,
    `  协议: ${svcProtocol.value}`,
    `  端口: ${svcPort.value}`,
    `  引用对象: ${svcRef.value.join(', ') || '—'}`,
    '',
    `有效期: ${validityMode.value === 'permanent' ? '永久' : validityRange.value ? sync.validityRange : '自定义(未选时间)'}`,
    `动作: ${actionAllow.value ? '允许' : '拒绝'}`,
    `备注: ${remark.value}`,
    '',
    '---FORM_SYNC---',
    ...Object.entries(sync).map(([k, v]) => `${k}=${v}`),
    '---END---',
  ];
  return lines.filter(Boolean).join('\n');
}

function deployPositionLabel(p: DeployPosition): string {
  const map: Record<DeployPosition, string> = {
    top: '置顶',
    before_merge: '可合并策略之前',
    insert_before_top: '插入指定策略之前',
    insert_after_top: '插入置顶策略之后',
  };
  return map[p] ?? p;
}

function onUpdateCommand() {
  commandText.value = generateCommand();
  ElMessage.success('已根据左侧表单更新命令');
}

function onEditCommand() {
  commandDraft.value = commandText.value;
  commandEditing.value = true;
}

function onSaveCommandEdit() {
  if (!formEditable.value) return;
  commandText.value = commandDraft.value;
  applySyncFromCommand(commandText.value);
  commandEditing.value = false;
  ElMessage.success('命令已保存，已尝试同步左侧表单');
}

function onCancelCommandEdit() {
  commandEditing.value = false;
  commandDraft.value = '';
}

function applySyncFromCommand(text: string) {
  const block = text.match(/---FORM_SYNC---([\s\S]*?)---END---/);
  const inner = block?.[1];
  if (inner === undefined) return;
  const lines = inner.trim().split('\n');
  const map: Record<string, string> = {};
  for (const line of lines) {
    const i = line.indexOf('=');
    if (i === -1) continue;
    map[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  if (map.issueMode === 'new' || map.issueMode === 'merge') issueMode.value = map.issueMode;
  if (map.policyName) policyName.value = map.policyName;
  if (map.policyIdMode === 'custom' || map.policyIdMode === 'system') policyIdMode.value = map.policyIdMode;
  if (map.policyIdCustom !== undefined) policyIdCustom.value = map.policyIdCustom;
  if (map['src.newName'] !== undefined) srcNewName.value = map['src.newName'];
  if (map['src.ip'] !== undefined) srcNewIp.value = map['src.ip'];
  if (map['src.ref'] !== undefined) srcRef.value = map['src.ref'] ? map['src.ref'].split(',').filter(Boolean) : [];
  if (map['src.zone'] !== undefined) srcZone.value = map['src.zone'] ? map['src.zone'].split(',').filter(Boolean) : [];
  if (map['dst.newName'] !== undefined) dstNewName.value = map['dst.newName'];
  if (map['dst.ip'] !== undefined) dstNewIp.value = map['dst.ip'];
  if (map['dst.ref'] !== undefined) dstRef.value = map['dst.ref'] ? map['dst.ref'].split(',').filter(Boolean) : [];
  if (map['dst.zone'] !== undefined) dstZone.value = map['dst.zone'] ? map['dst.zone'].split(',').filter(Boolean) : [];
  if (map['svc.newName'] !== undefined) svcNewName.value = map['svc.newName'];
  if (map['svc.protocol']) svcProtocol.value = map['svc.protocol'] as ServiceProtocol;
  if (map['svc.port'] !== undefined) svcPort.value = map['svc.port'];
  if (map['svc.ref'] !== undefined) svcRef.value = map['svc.ref'] ? map['svc.ref'].split(',').filter(Boolean) : [];
  if (map['svc.zone'] !== undefined) svcZone.value = map['svc.zone'] ? map['svc.zone'].split(',').filter(Boolean) : [];
  if (map.remark !== undefined) remark.value = map.remark;
  if (map.actionAllow === 'allow' || map.actionAllow === 'deny') actionAllow.value = map.actionAllow === 'allow';
}

function translatePlaceholder() {
  ElMessage.info('翻译功能占位，后续补充');
}

async function onCopyCommand() {
  try {
    await navigator.clipboard.writeText(commandText.value || generateCommand());
    ElMessage.success('复制成功');
  } catch {
    ElMessage.error('复制失败');
  }
}

function onDownloadCommand() {
  const blob = new Blob([commandText.value || generateCommand()], {
    type: 'text/plain;charset=utf-8',
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `policy-adjust-${props.deviceRow?.id ?? 'cmd'}.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function hasNewContent(name: string, body: string) {
  return Boolean(name.trim() || body.trim());
}

function hasRefOrNew(
  refs: string[],
  newName: string,
  newBody: string,
) {
  return refs.length > 0 || hasNewContent(newName, newBody);
}

function validate(): boolean {
  if (!formEditable.value) return false;
  if (issueMode.value === 'new') {
    if (policyIdMode.value === 'custom' && !policyIdCustom.value.trim()) {
      ElMessage.warning('请填写自定义策略 ID');
      return false;
    }
    if (
      deployPosition.value === 'insert_before_top' ||
      deployPosition.value === 'insert_after_top'
    ) {
      if (!namedTopPolicy.value) {
        ElMessage.warning('请选择置顶策略');
        return false;
      }
    }
    if (!srcZone.value.length) {
      ElMessage.warning('请选择源信息区域');
      return false;
    }
    if (!dstZone.value.length) {
      ElMessage.warning('请选择目的信息区域');
      return false;
    }
    if (validityMode.value === 'custom' && !validityRange.value) {
      ElMessage.warning('请选择有效期起止时间');
      return false;
    }
  }

  if (issueMode.value === 'new') {
    if (!hasRefOrNew(srcRef.value, srcNewName.value, srcNewIp.value)) {
      ElMessage.warning('源信息为空，引用对象和新建对象至少输入一项！');
      return false;
    }
    if (!hasRefOrNew(dstRef.value, dstNewName.value, dstNewIp.value)) {
      ElMessage.warning('目的信息为空，引用对象和新建对象至少输入一项！');
      return false;
    }
    if (!hasRefOrNew(svcRef.value, svcNewName.value, svcPort.value)) {
      ElMessage.warning('服务信息为空，引用对象和新建对象至少输入一项！');
      return false;
    }
    if (srcNewName.value.trim() && !srcNewIp.value.trim()) {
      ElMessage.warning('源新建对象 IP 为空，不支持空对象下发！');
      return false;
    }
    if (dstNewName.value.trim() && !dstNewIp.value.trim()) {
      ElMessage.warning('目的新建对象 IP 为空，不支持空对象下发！');
      return false;
    }
    if (svcNewName.value.trim() && !svcPort.value.trim()) {
      ElMessage.warning('服务新建对象端口为空，不支持空对象下发！');
      return false;
    }
    if (svcPort.value.trim() && !svcProtocol.value) {
      ElMessage.warning('填写端口时协议必填');
      return false;
    }
  }

  if (issueMode.value === 'merge' && !selectedMerge.value) {
    ElMessage.warning('请选择可合并策略');
    return false;
  }

  return true;
}

function onFooterSave() {
  if (!props.deviceRow || !validate()) return;
  const wasFailed = props.deviceRow.execStatusTag === '下发失败';
  const payload: AdjustSavePayload = {
    execStatusTag: '待下发',
    execStatusTime: wasFailed ? '' : props.deviceRow.execStatusTime,
  };
  emit('save', payload);
  visible.value = false;
  ElMessage.success('已保存，执行状态已置为待下发');
}

function onFooterClose() {
  if (commandEditing.value) onCancelCommandEdit();
  visible.value = false;
}
</script>

<template>
  <ElDialog
    v-model="visible"
    width="min(1180px, 96vw)"
    append-to-body
    align-center
    destroy-on-close
    class="policy-adjust-dialog"
    @closed="commandEditing = false"
  >
    <template #header="{ titleId, titleClass }">
      <div class="policy-adjust-dialog__header">
        <span :id="titleId" :class="titleClass">调整</span>
        <DialogPrototypeDoc doc-key="policy-change-open-adjust" business-short-name="调整" />
      </div>
    </template>
    <template v-if="deviceRow">
      <ElAlert v-if="readonlyReason" type="info" :closable="false" show-icon class="policy-adjust__alert">
        {{ readonlyReason }}
      </ElAlert>

      <div class="policy-adjust__layout">
        <!-- 左侧 -->
        <div class="policy-adjust__form panel">
          <div class="policy-adjust__panel-title policy-adjust__panel-title--sticky">开通策略表单</div>
          <div class="policy-adjust__form-body">
          <ElForm
            label-width="100px"
            size="small"
            class="policy-adjust__form-fields"
            :disabled="!formEditable"
          >
            <ElFormItem label="下发方式" required>
              <div class="policy-adjust__issue-row">
                <ElSelect
                  v-model="issueMode"
                  class="policy-adjust__issue-mode-select"
                  placeholder="请选择下发方式"
                >
                  <ElOption label="新建策略" value="new" />
                  <ElOption label="可合并策略" value="merge" :disabled="!hasMergeable" />
                </ElSelect>
                <template v-if="issueMode === 'new'">
                  <ElInput
                    v-model="policyName"
                    class="policy-adjust__policy-name-input"
                    maxlength="64"
                    show-word-limit
                    placeholder="输入策略名称"
                  />
                </template>
                <template v-else-if="issueMode === 'merge' && formEditable">
                  <ElInput
                    class="policy-adjust__picker-input policy-adjust__policy-name-input"
                    :model-value="selectedMerge?.name ?? ''"
                    readonly
                    placeholder="点击选择可合并策略"
                    @click="openMergePicker"
                  />
                </template>
              </div>
            </ElFormItem>

            <template v-if="issueMode === 'new'">
              <ElFormItem label="策略 ID" required>
                <div class="policy-adjust__policy-id-row">
                  <ElRadioGroup v-model="policyIdMode">
                    <ElRadio label="system">系统分配</ElRadio>
                    <ElRadio label="custom">自定义</ElRadio>
                  </ElRadioGroup>
                  <ElInput
                    v-if="policyIdMode === 'custom'"
                    v-model="policyIdCustom"
                    class="policy-adjust__policy-id-custom"
                    placeholder="自定义策略 ID"
                    maxlength="64"
                  />
                </div>
              </ElFormItem>
              <ElFormItem label="下发位置" required>
                <div
                  class="policy-adjust__deploy-row"
                  :class="{ 'policy-adjust__deploy-row--with-top': needsNamedTopPolicy }"
                >
                  <ElSelect
                    v-model="deployPosition"
                    class="policy-adjust__deploy-select"
                    placeholder="请选择下发位置"
                  >
                    <ElOption
                      v-for="opt in deploySelectOptions"
                      :key="opt.value"
                      :label="opt.label"
                      :value="opt.value"
                      :disabled="opt.disabled"
                    />
                  </ElSelect>
                  <ElInput
                    v-if="needsNamedTopPolicy"
                    class="policy-adjust__picker-input policy-adjust__deploy-follow policy-adjust__deploy-top-pick"
                    :model-value="namedTopPolicy?.name ?? ''"
                    readonly
                    placeholder="点击选择指定策略"
                    @click="openTopPolicyPicker"
                  />
                </div>
              </ElFormItem>

              <div class="policy-adjust__block-title policy-adjust__block-title--bar">源信息</div>
              <ElFormItem class="policy-adjust__new-object-item">
                <template #label>
                  <span class="policy-adjust__label-inline">
                    <span>新建对象</span>
                    <ElTooltip :content="NEW_OBJECT_SRC_DST_TOOLTIP" placement="top">
                      <span class="policy-adjust__icon-help-wrap" tabindex="-1">
                        <ElIcon class="policy-adjust__field-help-icon"><QuestionFilled /></ElIcon>
                      </span>
                    </ElTooltip>
                  </span>
                </template>
                <div class="policy-adjust__object-group policy-adjust__object-group--full">
                  <ElInput v-model="srcNewName" maxlength="32" placeholder="名称" />
                  <ElInput
                    v-model="srcNewIp"
                    type="textarea"
                    :rows="2"
                    placeholder="新建对象地址"
                  />
                </div>
              </ElFormItem>
              <ElFormItem label="引用对象">
                <ElSelect v-model="srcRef" multiple filterable collapse-tags placeholder="可选" style="width: 100%">
                  <ElOption v-for="o in REF_OPTIONS" :key="o" :label="o" :value="o" />
                </ElSelect>
              </ElFormItem>
              <ElFormItem required class="policy-adjust__zone-item">
                <template #label>
                  <span class="policy-adjust__label-inline">
                    <span>区域</span>
                    <ElTooltip :content="ZONE_TOOLTIP" placement="top">
                      <span class="policy-adjust__icon-help-wrap" tabindex="-1">
                        <ElIcon class="policy-adjust__field-help-icon"><QuestionFilled /></ElIcon>
                      </span>
                    </ElTooltip>
                  </span>
                </template>
                <ElSelect
                  v-model="srcZone"
                  multiple
                  filterable
                  collapse-tags
                  placeholder="必选"
                  style="width: 100%"
                >
                  <ElOption v-for="z in ZONE_OPTIONS" :key="z" :label="z" :value="z" />
                </ElSelect>
                <div v-if="zoneDisplay(srcZone)" class="policy-adjust__hint">{{ zoneDisplay(srcZone) }}</div>
              </ElFormItem>

              <div class="policy-adjust__block-title policy-adjust__block-title--bar">目的信息</div>
              <ElFormItem class="policy-adjust__new-object-item">
                <template #label>
                  <span class="policy-adjust__label-inline">
                    <span>新建对象</span>
                    <ElTooltip :content="NEW_OBJECT_SRC_DST_TOOLTIP" placement="top">
                      <span class="policy-adjust__icon-help-wrap" tabindex="-1">
                        <ElIcon class="policy-adjust__field-help-icon"><QuestionFilled /></ElIcon>
                      </span>
                    </ElTooltip>
                  </span>
                </template>
                <div class="policy-adjust__object-group policy-adjust__object-group--full">
                  <ElInput v-model="dstNewName" maxlength="32" placeholder="名称" />
                  <ElInput
                    v-model="dstNewIp"
                    type="textarea"
                    :rows="2"
                    placeholder="新建对象地址"
                  />
                </div>
              </ElFormItem>
              <ElFormItem label="引用对象">
                <ElSelect v-model="dstRef" multiple filterable collapse-tags placeholder="可选" style="width: 100%">
                  <ElOption v-for="o in REF_OPTIONS" :key="'d-' + o" :label="o" :value="o" />
                </ElSelect>
              </ElFormItem>
              <ElFormItem required class="policy-adjust__zone-item">
                <template #label>
                  <span class="policy-adjust__label-inline">
                    <span>区域</span>
                    <ElTooltip :content="ZONE_TOOLTIP" placement="top">
                      <span class="policy-adjust__icon-help-wrap" tabindex="-1">
                        <ElIcon class="policy-adjust__field-help-icon"><QuestionFilled /></ElIcon>
                      </span>
                    </ElTooltip>
                  </span>
                </template>
                <ElSelect
                  v-model="dstZone"
                  multiple
                  filterable
                  collapse-tags
                  placeholder="必选"
                  style="width: 100%"
                >
                  <ElOption v-for="z in ZONE_OPTIONS" :key="'d-' + z" :label="z" :value="z" />
                </ElSelect>
                <div v-if="zoneDisplay(dstZone)" class="policy-adjust__hint">{{ zoneDisplay(dstZone) }}</div>
              </ElFormItem>

              <div class="policy-adjust__block-title policy-adjust__block-title--bar">服务信息</div>
              <ElFormItem class="policy-adjust__new-object-item">
                <template #label>
                  <span class="policy-adjust__label-inline">
                    <span>新建对象</span>
                    <ElTooltip :content="NEW_OBJECT_SVC_TOOLTIP" placement="top">
                      <span class="policy-adjust__icon-help-wrap" tabindex="-1">
                        <ElIcon class="policy-adjust__field-help-icon"><QuestionFilled /></ElIcon>
                      </span>
                    </ElTooltip>
                  </span>
                </template>
                <div class="policy-adjust__object-group policy-adjust__object-group--full">
                  <div class="policy-adjust__name-proto-row">
                    <ElInput v-model="svcNewName" maxlength="32" placeholder="名称" class="policy-adjust__name-proto-name" />
                    <ElSelect v-model="svcProtocol" placeholder="协议" class="policy-adjust__name-proto-protocol">
                      <ElOption label="TCP/UDP" value="tcpudp" />
                      <ElOption label="TCP" value="tcp" />
                      <ElOption label="UDP" value="udp" />
                      <ElOption label="ICMP" value="icmp" />
                    </ElSelect>
                  </div>
                  <ElInput
                    v-model="svcPort"
                    type="textarea"
                    :rows="2"
                    placeholder="端口"
                  />
                </div>
              </ElFormItem>
              <ElFormItem label="引用对象">
                <ElSelect v-model="svcRef" multiple filterable collapse-tags placeholder="可选" style="width: 100%">
                  <ElOption v-for="o in REF_OPTIONS" :key="'s-' + o" :label="o" :value="o" />
                </ElSelect>
              </ElFormItem>

              <ElFormItem label="有效期" required>
                <div class="policy-adjust__validity-row">
                  <ElRadioGroup v-model="validityMode">
                    <ElRadio label="permanent">永久</ElRadio>
                    <ElRadio label="custom">自定义</ElRadio>
                  </ElRadioGroup>
                  <ElDatePicker
                    v-if="validityMode === 'custom'"
                    v-model="validityRange"
                    type="datetimerange"
                    range-separator="至"
                    start-placeholder="开始"
                    end-placeholder="结束"
                    format="YYYY-MM-DD HH:mm:ss"
                    value-format="YYYY-MM-DD HH:mm:ss"
                    class="policy-adjust__validity-range"
                  />
                </div>
              </ElFormItem>
              <ElFormItem label="动作" required>
                <ElRadioGroup v-model="actionAllow">
                  <ElRadio :label="true">允许</ElRadio>
                  <ElRadio :label="false">拒绝</ElRadio>
                </ElRadioGroup>
              </ElFormItem>
              <ElFormItem label="备注">
                <ElInput v-model="remark" type="textarea" :rows="2" maxlength="512" show-word-limit />
              </ElFormItem>
            </template>

            <template v-else>
              <ElFormItem label="摘要">
                <ElInput :model-value="mergeSummaryText" type="textarea" :rows="12" readonly class="policy-adjust__mono" />
              </ElFormItem>
            </template>
          </ElForm>
          </div>
        </div>

        <!-- 右侧 -->
        <div class="policy-adjust__cmd panel">
          <div class="policy-adjust__cmd-head policy-adjust__panel-title--sticky">
            <span class="policy-adjust__panel-title">配置命令</span>
            <div class="policy-adjust__cmd-actions">
              <template v-if="formEditable">
                <ElButton size="small" :icon="RefreshRight" @click="onUpdateCommand">更新命令</ElButton>
                <ElButton
                  v-if="!commandEditing"
                  size="small"
                  :icon="EditPen"
                  @click="onEditCommand"
                >
                  编辑
                </ElButton>
              </template>
              <ElButton size="small" :icon="CopyDocument" @click="onCopyCommand">复制</ElButton>
              <ElButton size="small" :icon="Download" @click="onDownloadCommand">下载</ElButton>
              <ElButton
                v-if="formEditable"
                size="small"
                circle
                :title="'翻译（占位）'"
                :icon="ChatLineRound"
                @click="translatePlaceholder"
              />
            </div>
          </div>
          <div class="policy-adjust__cmd-body">
            <ElInput
              v-if="!commandEditing"
              :model-value="commandText"
              type="textarea"
              readonly
              :autosize="{ minRows: 18, maxRows: 28 }"
              class="policy-adjust__cmd-text policy-adjust__cmd-text--fill"
            />
            <div v-else class="policy-adjust__cmd-editor-wrap">
              <div v-if="formEditable" class="policy-adjust__cmd-edit-float">
                <ElButton size="small" type="primary" @click="onSaveCommandEdit">保存</ElButton>
                <ElButton size="small" :icon="Close" @click="onCancelCommandEdit">取消</ElButton>
              </div>
              <ElInput
                v-model="commandDraft"
                type="textarea"
                :autosize="{ minRows: 18, maxRows: 28 }"
                class="policy-adjust__cmd-text policy-adjust__cmd-text--fill policy-adjust__cmd-text--editing"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="policy-adjust__footer">
        <ElButton v-if="formEditable" type="primary" @click="onFooterSave">保存</ElButton>
        <ElButton @click="onFooterClose">关闭</ElButton>
      </div>
    </template>

    <ElDialog v-model="mergePickerVisible" title="选择可合并策略" width="480px" append-to-body align-center>
      <ElRadioGroup v-model="mergeTempId" class="policy-adjust__merge-radio">
        <div v-for="p in mergeablePolicies" :key="p.id" class="policy-adjust__merge-row">
          <ElRadio :label="p.id">{{ p.name }}</ElRadio>
        </div>
      </ElRadioGroup>
      <template #footer>
        <ElButton size="small" @click="mergePickerVisible = false">取消</ElButton>
        <ElButton type="primary" size="small" @click="confirmMergePicker">确定</ElButton>
      </template>
    </ElDialog>

    <ElDialog v-model="topPolicyPickerVisible" title="选择置顶策略" width="480px" append-to-body align-center>
      <ElRadioGroup v-model="topPolicyTempId" class="policy-adjust__merge-radio">
        <div v-for="p in topPolicyOptions" :key="p.id" class="policy-adjust__merge-row">
          <ElRadio :label="p.id">{{ p.name }}</ElRadio>
        </div>
      </ElRadioGroup>
      <template #footer>
        <ElButton size="small" @click="topPolicyPickerVisible = false">取消</ElButton>
        <ElButton type="primary" size="small" @click="confirmTopPolicyPicker">确定</ElButton>
      </template>
    </ElDialog>
  </ElDialog>
</template>

<style scoped>
.policy-adjust-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 8px;
  min-width: 0;
}

.policy-adjust-dialog :deep(.el-dialog__body) {
  padding-top: 8px;
}

.policy-adjust__alert {
  margin-bottom: 12px;
}

.policy-adjust__layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: stretch;
  min-height: 420px;
}

@media (max-width: 960px) {
  .policy-adjust__layout {
    grid-template-columns: 1fr;
  }
}

.policy-adjust__form.panel {
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--el-fill-color-light);
  border-radius: 8px;
  padding: 12px;
  border: 1px solid var(--el-border-color-lighter);
}

.policy-adjust__form-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  max-height: min(70vh, 720px);
  padding-right: 4px;
}

.policy-adjust__form-fields :deep(.el-form-item) {
  margin-bottom: 10px;
}

.policy-adjust__validity-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.policy-adjust__validity-range {
  width: 320px;
  max-width: 100%;
}

.policy-adjust__cmd.panel {
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--el-fill-color-light);
  border-radius: 8px;
  padding: 12px;
  border: 1px solid var(--el-border-color-lighter);
}

.policy-adjust__panel-title {
  font-weight: 600;
  margin-bottom: 6px;
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.policy-adjust__panel-title--sticky {
  position: sticky;
  top: 0;
  z-index: 2;
  margin-bottom: 0;
  padding-bottom: 8px;
  background: var(--el-fill-color-light);
}

.policy-adjust__cmd.panel .policy-adjust__panel-title--sticky {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.policy-adjust__cmd-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  max-height: min(70vh, 720px);
  display: flex;
  flex-direction: column;
}

.policy-adjust__cmd-editor-wrap {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.policy-adjust__cmd-edit-float {
  position: absolute;
  top: 6px;
  right: 10px;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.policy-adjust__block-title {
  font-size: 13px;
  font-weight: 600;
  margin: 8px 0 4px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.policy-adjust__block-title--bar {
  position: relative;
  padding-left: 10px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

/* 竖条高度与字号一致（1em），不随整块 padding 拉高 */
.policy-adjust__block-title--bar::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 3px;
  height: 1em;
  border-radius: 1px;
  background-color: var(--el-color-primary);
}

.policy-adjust__new-object-item {
  width: 100%;
}

.policy-adjust__new-object-item :deep(.el-form-item__content) {
  flex: 1;
  min-width: 0;
}

.policy-adjust__object-group {
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--el-border-radius-base);
  background: var(--el-fill-color-blank);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.policy-adjust__object-group--full {
  width: 100%;
  min-width: 0;
}

.policy-adjust__zone-item {
  margin-top: 0;
}

.policy-adjust__label-inline {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.policy-adjust__icon-help-wrap {
  display: inline-flex;
  align-items: center;
  outline: none;
  vertical-align: middle;
}

.policy-adjust__field-help-icon {
  cursor: help;
  color: var(--el-text-color-secondary);
  font-size: 16px;
}

.policy-adjust__name-proto-row {
  display: flex;
  flex-wrap: nowrap;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
}

.policy-adjust__name-proto-name {
  flex: 1;
  min-width: 0;
}

.policy-adjust__name-proto-protocol {
  width: 140px;
  flex-shrink: 0;
}

.policy-adjust__issue-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.policy-adjust__issue-mode-select {
  width: 140px;
  flex-shrink: 0;
}

.policy-adjust__policy-name-input {
  flex: 1;
  min-width: 160px;
  max-width: 360px;
}

.policy-adjust__policy-id-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.policy-adjust__policy-id-custom {
  flex: 1;
  min-width: 180px;
  max-width: 320px;
}

.policy-adjust__deploy-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-width: 0;
}

/* 指定策略选择框紧跟在「下发位置」单选下拉之后、同一行；与下发方式下拉同宽，不出现横向滚动条 */
.policy-adjust__deploy-row--with-top {
  flex-wrap: nowrap;
}

.policy-adjust__deploy-select {
  /* 与 .policy-adjust__issue-mode-select 一致 */
  width: 140px;
  flex-shrink: 0;
}

.policy-adjust__deploy-row--with-top .policy-adjust__deploy-select {
  flex: 0 0 auto;
}

.policy-adjust__deploy-follow {
  flex: 1;
  min-width: 0;
}

.policy-adjust__deploy-top-pick {
  min-width: 0;
  flex: 1 1 0;
}

.policy-adjust__picker-input {
  cursor: pointer;
}

.policy-adjust__picker-input :deep(.el-input__inner) {
  cursor: pointer;
}

.policy-adjust__merge-pick {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.policy-adjust__mt8 {
  margin-top: 8px;
}

.policy-adjust__hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}

.policy-adjust__mono {
  font-family: ui-monospace, monospace;
  font-size: 12px;
}

.policy-adjust__cmd-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.policy-adjust__cmd-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.policy-adjust__cmd-text {
  font-family: ui-monospace, monospace;
  font-size: 12px;
}

.policy-adjust__cmd-text--fill {
  flex: 1;
  min-height: 0;
  width: 100%;
}

.policy-adjust__cmd-text--editing :deep(.el-textarea__inner) {
  padding-top: 38px;
}

.policy-adjust__footer {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.policy-adjust__merge-radio {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.policy-adjust__merge-row {
  padding: 4px 0;
}
</style>
