<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import {
  Delete,
  Download,
  Filter,
  ArrowDown,
  Plus,
  QuestionFilled,
  WarningFilled,
} from '@element-plus/icons-vue';
import { ElIcon, ElMessage, ElMessageBox } from 'element-plus';
import PageHeader from '@/components/PageHeader.vue';
import PageContent from '@/components/PageContent.vue';
import PolicyChangeHeaderBreadcrumb from '@/components/PolicyChangeHeaderBreadcrumb.vue';
import PolicyChangeHeaderActions from '@/components/PolicyChangeHeaderActions.vue';
import PolicyChangeOpenPrototypeDoc from '@/components/PolicyChangeOpenPrototypeDoc.vue';
import DialogPrototypeDoc from '@/components/DialogPrototypeDoc.vue';
import PolicyChangeAdjustDialog from '@/components/PolicyChangeAdjustDialog.vue';
import TimeFilterBar from '@/components/TimeFilterBar.vue';
import TableColumnSettingPopover from '@/components/TableColumnSettingPopover.vue';
import { useTableColumnSettings } from '@/composables/useTableColumnSettings';
import type { ColumnDef, ColumnFieldDef } from '@/types/table-column-setting';
import type { AdjustDialogDeviceRow, AdjustSavePayload } from '@/types/policy-change-adjust';

type StatKey = 'all' | 'incomplete' | 'completed' | 'cancelled';
type RowStatus = 'incomplete' | 'completed' | 'cancelled';
type DeviceState = 'pending' | 'success' | 'failed' | 'rollbackSuccess' | 'rollbackFail';

interface OpenRow {
  id: string;
  /** 开通配置策略名称，可为空 */
  name: string;
  rowStatus: RowStatus;
  srcIp: string;
  dstIp: string;
  /** 协议+端口，如 TCP_80 */
  service: string;
  action: 'allow' | 'deny';
  validUntil: string;
  firewalls: string;
  remark: string;
  srcOwner: string;
  dstOwner: string;
  createdAt: Date;
  endedAt: Date | null;
  changeSource: string;
  policyTicket: string;
  changeReason: string;
  /** 业务字段：列表操作列不展示回撤，仅保留数据供后续接口/详情使用 */
  showRollback: boolean;
  /** 目标防火墙侧状态，用于查看弹窗是否可编辑 */
  deviceStates: DeviceState[];
}

const PAGE_SIZE = 10;

const POLICY_OPEN_DEFAULT_FIELDS: Record<string, ColumnFieldDef[]> = {
  nameStatus: [
    { key: 'name', label: '名称', visible: true },
    { key: 'status', label: '状态', visible: true },
  ],
  actionValid: [
    { key: 'action', label: '动作', visible: true },
    { key: 'validUntil', label: '有效期', visible: true },
  ],
  other: [
    { key: 'srcOwner', label: '源责任人', visible: true },
    { key: 'dstOwner', label: '目的责任人', visible: true },
  ],
  period: [
    { key: 'createdAt', label: '创建时间', visible: true },
    { key: 'endedAt', label: '结束时间', visible: true },
  ],
};

function clonePolicyOpenFields(key: string): ColumnFieldDef[] | undefined {
  const defs = POLICY_OPEN_DEFAULT_FIELDS[key];
  return defs ? defs.map((f) => ({ ...f })) : undefined;
}

const POLICY_OPEN_DEFAULT_COLUMN_DEFS: ColumnDef[] = [
  {
    key: 'nameStatus',
    label: '名称/状态',
    visible: true,
    fixed: false,
    order: 0,
    fields: clonePolicyOpenFields('nameStatus'),
  },
  { key: 'srcIp', label: '源IP', visible: true, fixed: false, order: 1 },
  { key: 'dstIp', label: '目的IP', visible: true, fixed: false, order: 2 },
  { key: 'service', label: '服务', visible: true, fixed: false, order: 3 },
  {
    key: 'actionValid',
    label: '动作/有效期',
    visible: true,
    fixed: false,
    order: 4,
    fields: clonePolicyOpenFields('actionValid'),
  },
  { key: 'firewalls', label: '目标防火墙', visible: true, fixed: false, order: 5 },
  { key: 'remark', label: '策略备注', visible: true, fixed: false, order: 6 },
  {
    key: 'other',
    label: '其它',
    visible: true,
    fixed: false,
    order: 7,
    fields: clonePolicyOpenFields('other'),
  },
  {
    key: 'period',
    label: '开通周期',
    visible: true,
    fixed: false,
    order: 8,
    fields: clonePolicyOpenFields('period'),
  },
  { key: 'operation', label: '操作', visible: true, fixed: 'right', order: 9 },
];

const policyOpenColumnSettings = reactive(
  useTableColumnSettings(POLICY_OPEN_DEFAULT_COLUMN_DEFS, {
    templatesKey: 'policyChangeOpen.columnTemplates',
    defaultOverrideKey: 'policyChangeOpen.columnDefaultOverride',
  }),
);

const CHANGE_SOURCE_OPTIONS = [
  { label: '全部', value: '' },
  { label: '工单', value: 'ticket' },
  { label: '手工', value: 'manual' },
];

const POLICY_TICKET_OPTIONS = [
  { label: '全部', value: '' },
  { label: '策略工单', value: 'policy' },
  { label: '其它', value: 'other' },
];

/** 新建弹窗：源 IP / 目的 IP 共用 hover 说明 */
const ADD_FORM_IP_TOOLTIP = 'IPv4/IPv6，支持范围与掩码；不填为 any';

/** 策略备注：格式与示例（hover 多行换行） */
const ADD_FORM_REMARK_TOOLTIP_LINES = [
  '格式：【业务系统】|【目的/用途】|【申请人】|【工单号】|【有效期 | 配置人/日期】',
  '示例：财务系统 ,允许办公网访问数据库3306 , 李xx , INC-240201 , 长期有效 , 王xx',
  '2024/2/20',
].join('\n');

/** 端口说明（hover 多行换行） */
const ADD_FORM_PORT_TOOLTIP_LINES = [
  '支持端口，端口1-端口2，多个用逗号分隔；',
  '若为ICMP则格式为前type后code逗号隔开，如15,0不填为any',
].join('\n');

interface SystemUserOption {
  id: string;
  name: string;
  phone: string;
}

const MOCK_SYSTEM_USERS: SystemUserOption[] = [
  { id: 'u1', name: '张三', phone: '13800138001' },
  { id: 'u2', name: '李四', phone: '13800138002' },
  { id: 'u3', name: '王xx', phone: '13900001111' },
  { id: 'u4', name: '赵六', phone: '13600001234' },
];

const addOwnerPickerVisible = ref(false);
const addOwnerPickerTarget = ref<'src' | 'dst' | null>(null);
const ownerPickerSelectedId = ref<string | null>(null);

function openOwnerPicker(which: 'src' | 'dst') {
  addOwnerPickerTarget.value = which;
  const name = (which === 'src' ? addSrcOwner.value : addDstOwner.value).trim();
  const hit = name ? MOCK_SYSTEM_USERS.find((u) => u.name === name) : null;
  ownerPickerSelectedId.value = hit?.id ?? null;
  addOwnerPickerVisible.value = true;
}

function confirmOwnerPicker() {
  const u = MOCK_SYSTEM_USERS.find((x) => x.id === ownerPickerSelectedId.value);
  const name = u?.name ?? '';
  if (addOwnerPickerTarget.value === 'src') addSrcOwner.value = name;
  else if (addOwnerPickerTarget.value === 'dst') addDstOwner.value = name;
  addOwnerPickerVisible.value = false;
  addOwnerPickerTarget.value = null;
}

function onOwnerTableRowClick(row: SystemUserOption) {
  ownerPickerSelectedId.value = row.id;
}

function ownerPickerRowClassName(data: { row: SystemUserOption; rowIndex: number }) {
  return data.row.id === ownerPickerSelectedId.value ? 'policy-open-add__user-row--pick' : '';
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function formatDateTime(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** 默认不按创建时间过滤；用户选择时间范围后与 TimeFilterBar 一致才按时间过滤 */
const dateRange = ref<[Date, Date] | null>(null);

const statFilter = ref<StatKey>('all');

const qFirewall = ref('');
const qSearchStatus = ref<'' | RowStatus>('');
const qRemark = ref('');
const qChangeSource = ref('');
const qPolicyTicket = ref('');
const qChangeReason = ref('');
const moreFilterVisible = ref(false);

const STATUS_FILTER_OPTIONS: { label: string; value: '' | RowStatus }[] = [
  { label: '全部', value: '' },
  { label: '未完成', value: 'incomplete' },
  { label: '已完成', value: 'completed' },
  { label: '已取消', value: 'cancelled' },
];

const addVisible = ref(false);
/** 新建弹窗：是否已完成「保存并分析」（目标设备区按钮可用） */
const addDialogAnalyzed = ref(false);
/** 开通信息折叠：保存并分析后自动收起 */
const addOpenInfoNames = ref<string[]>(['info']);
const addValidUntil = ref<'permanent' | 'custom'>('permanent');
/** 自定义有效期结束时间 value-format：YYYY-MM-DD HH:mm:ss */
const addValidEndDate = ref<string>('');
const addProtocol = ref('tcpudp');
const addPolicyName = ref('');
const addSrcIp = ref('');
const addDstIp = ref('');
const addPort = ref('');
const addRemark = ref('');
const addSrcOwner = ref('');
const addDstOwner = ref('');

type DeviceExecStatusTag = '待下发' | '下发成功' | '下发失败' | '回撤成功' | '回撤失败';

interface AddDeviceRow {
  id: string;
  firewall: string;
  policyName: string;
  src: string;
  dst: string;
  service: string;
  action: string;
  validUntil: string;
  analysisResult: 'none' | 'need';
  openMethod: string;
  abnormal: string;
  /** 第一行：策略状态标签 */
  execStatusTag: DeviceExecStatusTag;
  /** 第二行：操作时间（年月日 时分秒），空则留白 */
  execStatusTime: string;
  /** 下发/回撤校验未通过时显示手动校验图标 */
  verifyNeedManual: boolean;
  /** 手动校验成功后隐藏图标 */
  verifyManualOk: boolean;
  remark: string;
  /** 验证提示文案（可含屏蔽下发原因） */
  verifyHint: string;
  /** 为 true 时屏蔽「下发」 */
  verifyBlockIssuance: boolean;
  /** 错误信息，多行 */
  errorInfo: string;
  createdAt: string;
}

/** 验证提示：含屏蔽下发规则说明（hover） */
const ADD_VERIFY_BLOCK_TOOLTIP = [
  '需对下发操作进行验证，当验证信息包含如下内容时屏蔽下发操作：',
  '1、名称格式不符合厂家格式',
  '2、防火墙为配置导入格式不支持下发',
  '3、防火墙不允许下发策略',
  '4、配置命令无效：区域为空',
].join('\n');

const addDeviceTableRows = ref<AddDeviceRow[]>([]);

const adjustDialogVisible = ref(false);
const adjustTargetRow = ref<AddDeviceRow | null>(null);

const adjustDialogDeviceRow = computed((): AdjustDialogDeviceRow | null => {
  const r = adjustTargetRow.value;
  if (!r) return null;
  return {
    id: r.id,
    policyName: r.policyName,
    src: r.src,
    dst: r.dst,
    service: r.service,
    action: r.action,
    validUntil: r.validUntil,
    remark: r.remark,
    execStatusTag: r.execStatusTag,
    execStatusTime: r.execStatusTime,
    firewall: r.firewall,
  };
});

function openAdjustDialog(row: AddDeviceRow) {
  adjustTargetRow.value = row;
  adjustDialogVisible.value = true;
}

function onAdjustDialogSave(payload: AdjustSavePayload) {
  const r = adjustTargetRow.value;
  if (!r) return;
  r.execStatusTag = payload.execStatusTag;
  r.execStatusTime = payload.execStatusTime;
}

watch(adjustDialogVisible, (open) => {
  if (!open) adjustTargetRow.value = null;
});

const addDialogTableEmptyText = computed(() =>
  addDialogAnalyzed.value
    ? '无数据'
    : '请先填写开通信息并点击「保存并分析」后再查看设备分析结果',
);

function buildServiceFromAddForm(): string {
  const port = addPort.value.trim();
  const proto = addProtocol.value;
  const map: Record<string, string> = {
    tcpudp: 'TCP_UDP',
    tcp: 'TCP',
    udp: 'UDP',
    icmp: 'ICMP',
  };
  const base = map[proto] ?? 'ANY';
  if (!port) return base;
  return `${base}_${port}`;
}

function displayValidUntilForSave(): string {
  if (addValidUntil.value === 'permanent') return '永久有效';
  return addValidEndDate.value.trim();
}

function resetAddDialogUi() {
  addDialogAnalyzed.value = false;
  addOpenInfoNames.value = ['info'];
  addValidUntil.value = 'permanent';
  addValidEndDate.value = '';
  addProtocol.value = 'tcpudp';
  addPolicyName.value = '';
  addSrcIp.value = '';
  addDstIp.value = '';
  addPort.value = '';
  addRemark.value = '';
  addSrcOwner.value = '';
  addDstOwner.value = '';
  addDeviceTableRows.value = [];
}

/** 源IP、目的IP、端口至少填一项，不可同时为空 */
function validateAddOpenPolicyFields(): boolean {
  const src = addSrcIp.value.trim();
  const dst = addDstIp.value.trim();
  const port = addPort.value.trim();
  if (!src && !dst && !port) {
    ElMessage.warning('源IP、目的IP、端口不能同时为空，请至少填写其中一项');
    return false;
  }
  if (addValidUntil.value === 'custom' && !addValidEndDate.value?.trim()) {
    ElMessage.warning('请选择结束时间');
    return false;
  }
  return true;
}

function onManualVerifyDevice(row: AddDeviceRow) {
  row.verifyManualOk = true;
  row.verifyNeedManual = false;
  row.verifyBlockIssuance = false;
  ElMessage.success('校验成功');
}

function execStatusTagType(
  s: DeviceExecStatusTag,
): 'info' | 'success' | 'danger' | 'warning' {
  const m: Record<DeviceExecStatusTag, 'info' | 'success' | 'danger' | 'warning'> = {
    待下发: 'info',
    下发成功: 'success',
    下发失败: 'danger',
    回撤成功: 'success',
    回撤失败: 'warning',
  };
  return m[s] ?? 'info';
}

/** 保存并分析后生成 5 条设备行假数据（含较长字段便于两行截断 + hover） */
function buildAddDeviceTableRows(
  policyDisplay: string,
  src: string,
  dst: string,
  service: string,
  validStr: string,
  remark: string,
  baseTime: Date,
): AddDeviceRow[] {
  const policyNameCell =
    policyDisplay ||
    '未命名策略-演示超长名称用于两行截断与悬浮查看全文效果占位文本';
  const t = (offsetSec: number) =>
    formatDateTime(new Date(baseTime.getTime() + offsetSec * 1000));

  return [
    {
      id: 'd1',
      firewall:
        '办公出口防火墙集群-A/B 双机热备，关联策略域 prod-gw-01，链路描述仅用于演示超长内容',
      policyName: policyNameCell,
      src,
      dst,
      service,
      action: '允许',
      validUntil: validStr,
      analysisResult: 'none',
      openMethod: '自动开通（按工单路由至就近墙）',
      abnormal:
        '合规分析命中：源地址未在资产台账登记；建议补充业务系统与责任人后再下发，本条为演示超长异常说明',
      execStatusTag: '待下发',
      execStatusTime: t(0),
      verifyNeedManual: false,
      verifyManualOk: true,
      remark,
      verifyHint: '',
      verifyBlockIssuance: false,
      errorInfo: '',
      createdAt: t(0),
    },
    {
      id: 'd2',
      firewall: 'DMZ 边界防火墙-南北向分流，策略上下文 tenant-dmz-88',
      policyName: policyNameCell,
      src,
      dst,
      service,
      action: '允许',
      validUntil: validStr,
      analysisResult: 'need',
      openMethod: '自动开通',
      abnormal: '合规分析：目的端口与历史策略冲突，需合并申请单后重试（演示长文案）',
      execStatusTag: '下发失败',
      execStatusTime: t(-60),
      verifyNeedManual: true,
      verifyManualOk: false,
      remark,
      verifyHint:
        '名称格式不符合厂家格式；本行验证提示故意加长以验证两行截断与悬浮展示',
      verifyBlockIssuance: true,
      errorInfo:
        '策略下发失败：连接防火墙超时\n策略校验：区域对象解析异常\n命令预览：区域为空导致拒绝',
      createdAt: t(-60),
    },
    {
      id: 'd3',
      firewall: '核心区防火墙-东西向隔离墙 segment-core-02',
      policyName: policyNameCell,
      src,
      dst,
      service,
      action: '允许',
      validUntil: validStr,
      analysisResult: 'need',
      openMethod: '半自动（需人工确认网段）',
      abnormal: '',
      execStatusTag: '下发成功',
      execStatusTime: t(-120),
      verifyNeedManual: false,
      verifyManualOk: true,
      remark,
      verifyHint: '',
      verifyBlockIssuance: false,
      errorInfo: '',
      createdAt: t(-120),
    },
    {
      id: 'd4',
      firewall: '服务器区防火墙-租户隔离集群 pool-srv-east，多行描述用于列表截断测试',
      policyName: policyNameCell,
      src,
      dst,
      service,
      action: '允许',
      validUntil: validStr,
      analysisResult: 'none',
      openMethod: '自动开通',
      abnormal: '合规分析：关联专线未绑定工单，自动开通已暂停（演示说明）',
      execStatusTag: '回撤成功',
      execStatusTime: t(-180),
      verifyNeedManual: false,
      verifyManualOk: true,
      remark,
      verifyHint: '',
      verifyBlockIssuance: false,
      errorInfo: '回撤成功：已从设备移除对应策略条目',
      createdAt: t(-180),
    },
    {
      id: 'd5',
      firewall: '互联网出口防火墙-链路网关 IX-PE-03',
      policyName: policyNameCell,
      src,
      dst,
      service,
      action: '允许',
      validUntil: validStr,
      analysisResult: 'need',
      openMethod: '自动开通',
      abnormal: '合规分析：策略名称含特殊字符，需按厂家格式重命名后再分析',
      execStatusTag: '回撤失败',
      execStatusTime: t(-240),
      verifyNeedManual: true,
      verifyManualOk: false,
      remark,
      verifyHint: '防火墙不允许下发策略；本提示用于演示两行省略',
      verifyBlockIssuance: true,
      errorInfo:
        '策略回撤失败：设备返回业务错误码 0x4A\n二次校验：配置命令无效，区域为空',
      createdAt: t(-240),
    },
  ];
}

function onAddSaveAnalyze() {
  if (!validateAddOpenPolicyFields()) return;

  const name = addPolicyName.value.trim();
  const src = addSrcIp.value.trim() || 'any';
  const dst = addDstIp.value.trim() || 'any';
  const service = buildServiceFromAddForm();
  const validStr = displayValidUntilForSave();
  const now = new Date();
  const newId = `plo_${Date.now()}`;
  const policyDisplay = name;
  const remark = addRemark.value.trim();

  mockAll.value.unshift({
    id: newId,
    name: name,
    rowStatus: 'incomplete',
    srcIp: src,
    dstIp: dst,
    service,
    action: 'allow',
    validUntil: validStr,
    firewalls: '办公出口防火墙, DMZ 边界防火墙',
    remark,
    srcOwner: addSrcOwner.value.trim(),
    dstOwner: addDstOwner.value.trim(),
    createdAt: now,
    endedAt: null,
    changeSource: 'manual',
    policyTicket: 'policy',
    changeReason: '策略开通',
    showRollback: true,
    deviceStates: ['pending', 'failed'],
  });

  addDeviceTableRows.value = buildAddDeviceTableRows(
    policyDisplay,
    src,
    dst,
    service,
    validStr,
    remark,
    now,
  );

  addDialogAnalyzed.value = true;
  addOpenInfoNames.value = [];
  ElMessage.success('已保存并分析');
}

watch(addVisible, (open) => {
  if (open) resetAddDialogUi();
});

const viewVisible = ref(false);
const viewRow = ref<OpenRow | null>(null);
const viewCollapseActive = ref(['open']);

const tableRef = ref();
const selectedRows = ref<OpenRow[]>([]);

const policyTableContainerRef = ref<HTMLElement | null>(null);
const tableMaxHeight = ref<number | string>(400);
let tableResizeObserver: ResizeObserver | null = null;

onMounted(() => {
  if (!policyTableContainerRef.value) return;
  tableResizeObserver = new ResizeObserver((entries) => {
    const ent = entries[0];
    if (ent?.contentRect?.height) tableMaxHeight.value = Math.floor(ent.contentRect.height);
  });
  tableResizeObserver.observe(policyTableContainerRef.value);
});

onUnmounted(() => {
  tableResizeObserver?.disconnect();
  tableResizeObserver = null;
});

function indexMethod(index: number) {
  return (currentPage.value - 1) * PAGE_SIZE + index + 1;
}

const mockAll = ref<OpenRow[]>([
  {
    id: '1',
    name: 'plo-2025-001',
    rowStatus: 'incomplete',
    srcIp: '192.168.5.1-192.168.5.12',
    dstIp: '192.168.3.10',
    service: 'TCP_80',
    action: 'allow',
    validUntil: '永久有效',
    firewalls: '办公出口防火墙',
    remark: '业务访问说明',
    srcOwner: '',
    dstOwner: '李四',
    createdAt: new Date(Date.now() - 3600000),
    endedAt: null,
    changeSource: 'ticket',
    policyTicket: 'policy',
    changeReason: '业务访问',
    showRollback: true,
    deviceStates: ['pending', 'failed'],
  },
  {
    id: '2',
    name: '',
    rowStatus: 'incomplete',
    srcIp: '',
    dstIp: '192.168.1.10',
    service: 'TCP_443',
    action: 'allow',
    validUntil: '无期限',
    firewalls: '服务器区防火墙',
    remark: '',
    srcOwner: '张三',
    dstOwner: '',
    createdAt: new Date(Date.now() - 7200000),
    endedAt: null,
    changeSource: 'manual',
    policyTicket: 'policy',
    changeReason: '扩容',
    showRollback: true,
    deviceStates: ['pending'],
  },
  {
    id: '3',
    name: 'trust>untrust:TCP_22',
    rowStatus: 'completed',
    srcIp: '172.16.0.1',
    dstIp: '10.1.1.5',
    service: 'TCP_22',
    action: 'allow',
    validUntil: '永久有效',
    firewalls: '办公出口防火墙, 核心区防火墙',
    remark: '',
    srcOwner: '',
    dstOwner: '',
    createdAt: new Date(Date.now() - 86400000 * 2),
    endedAt: new Date(Date.now() - 86400000),
    changeSource: 'ticket',
    policyTicket: 'policy',
    changeReason: '运维',
    showRollback: true,
    deviceStates: ['success'],
  },
  {
    id: '4',
    name: 'pol-2026-002',
    rowStatus: 'completed',
    srcIp: 'any',
    dstIp: '192.168.2.0/24',
    service: 'any',
    action: 'allow',
    validUntil: '2026-12-31 23:59:59',
    firewalls: '服务器区防火墙',
    remark: '',
    srcOwner: '',
    dstOwner: '',
    createdAt: new Date(Date.now() - 86400000 * 3),
    endedAt: new Date(Date.now() - 86400000 * 2),
    changeSource: 'ticket',
    policyTicket: 'other',
    changeReason: 'DNS',
    showRollback: false,
    deviceStates: ['success', 'rollbackFail'],
  },
  {
    id: '5',
    name: 'deny-sample',
    rowStatus: 'cancelled',
    srcIp: '10.2.2.2',
    dstIp: '192.168.9.9',
    service: 'TCP_8080',
    action: 'deny',
    validUntil: '永久有效',
    firewalls: '办公出口防火墙',
    remark: '',
    srcOwner: '',
    dstOwner: '',
    createdAt: new Date(Date.now() - 86400000 * 5),
    endedAt: new Date(Date.now() - 86400000 * 4),
    changeSource: 'manual',
    policyTicket: 'policy',
    changeReason: '误配撤销',
    showRollback: false,
    deviceStates: ['rollbackSuccess'],
  },
]);

function inTimeRange(row: OpenRow) {
  if (!dateRange.value || dateRange.value.length < 2) return true;
  const [s, e] = dateRange.value;
  return row.createdAt >= s && row.createdAt <= e;
}

function matchStat(row: OpenRow) {
  if (statFilter.value === 'all') return true;
  return row.rowStatus === statFilter.value;
}

function matchQuery(row: OpenRow) {
  const fw = qFirewall.value.trim();
  if (fw && !row.firewalls.includes(fw)) return false;
  const st = qSearchStatus.value;
  if (st && row.rowStatus !== st) return false;
  const rm = qRemark.value.trim();
  if (rm && !row.remark.includes(rm)) return false;
  const cs = qChangeSource.value;
  if (cs && row.changeSource !== cs) return false;
  const pt = qPolicyTicket.value;
  if (pt && row.policyTicket !== pt) return false;
  const cr = qChangeReason.value.trim();
  if (cr && !row.changeReason.includes(cr)) return false;
  return true;
}

const filteredRows = computed(() =>
  mockAll.value.filter((row) => inTimeRange(row) && matchStat(row) && matchQuery(row)),
);

const statCounts = computed(() => {
  const inRange = mockAll.value.filter(inTimeRange);
  return {
    all: inRange.length,
    incomplete: inRange.filter((r) => r.rowStatus === 'incomplete').length,
    completed: inRange.filter((r) => r.rowStatus === 'completed').length,
    cancelled: inRange.filter((r) => r.rowStatus === 'cancelled').length,
  };
});

const currentPage = ref(1);

watch([filteredRows, statFilter, dateRange], () => {
  currentPage.value = 1;
});

type PagedRow = (OpenRow & { __empty: false }) | { __empty: true };

const pagedRows = computed((): PagedRow[] => {
  const list = filteredRows.value;
  const start = (currentPage.value - 1) * PAGE_SIZE;
  const slice = list.slice(start, start + PAGE_SIZE);
  const out: PagedRow[] = slice.map((r) => ({ ...r, __empty: false as const }));
  while (out.length < PAGE_SIZE) {
    out.push({ __empty: true });
  }
  return out;
});

function statusLabel(s: RowStatus) {
  const map: Record<RowStatus, string> = {
    incomplete: '未完成',
    completed: '已完成',
    cancelled: '已取消',
  };
  return map[s];
}

function statusTagType(s: RowStatus): 'warning' | 'success' | 'info' {
  const map: Record<RowStatus, 'warning' | 'success' | 'info'> = {
    incomplete: 'warning',
    completed: 'success',
    cancelled: 'info',
  };
  return map[s];
}

function ipOrAny(v: string) {
  return v && v.trim() ? v : '';
}

function serviceOrAny(v: string) {
  return v && v.trim() ? v : '';
}

function ownerLine(prefix: 'src' | 'dst', v: string) {
  const label = prefix === 'src' ? '源IP负责人' : '目的IP负责人';
  if (!v || !v.trim()) return '';
  return `${label}：${v.trim()}`;
}

/** 查看弹窗：任一墙为下发成功/回撤成功/回撤失败则整单只读 */
function isViewReadonly(row: OpenRow) {
  return row.deviceStates.some(
    (s) => s === 'success' || s === 'rollbackSuccess' || s === 'rollbackFail',
  );
}

const viewFormReadonly = computed(() => (viewRow.value ? isViewReadonly(viewRow.value) : true));

function openView(row: OpenRow) {
  viewRow.value = { ...row };
  viewVisible.value = true;
}

function clearQuery() {
  qFirewall.value = '';
  qSearchStatus.value = '';
  qRemark.value = '';
  qChangeSource.value = '';
  qPolicyTicket.value = '';
  qChangeReason.value = '';
}

function applyQuery() {
  currentPage.value = 1;
}

function rowClassName({ row }: { row: OpenRow & { __empty?: boolean } }) {
  return row && (row as { __empty?: boolean }).__empty ? 'is-empty-row' : '';
}

function selectableRow(row: OpenRow & { __empty?: boolean }) {
  return !(row as { __empty?: boolean }).__empty;
}

function onSelectionChange(rows: OpenRow[]) {
  selectedRows.value = rows.filter((r) => !(r as { __empty?: boolean }).__empty);
}

function onExport() {
  ElMessage.success('导出任务已提交（原型占位）');
}

async function onBatchDelete() {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先勾选要删除的条目');
    return;
  }
  try {
    await ElMessageBox.confirm(`确定删除选中的 ${selectedRows.value.length} 条记录？`, '删除', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    });
    ElMessage.success('已删除（原型占位）');
    tableRef.value?.clearSelection?.();
    selectedRows.value = [];
  } catch {
    /* cancel */
  }
}
</script>

<template>
  <section class="policy-page policy-open">
    <PageHeader variant="simple">
      <template #breadcrumb>
        <PolicyChangeHeaderBreadcrumb />
      </template>
      <template #actions>
        <div class="policy-open__header-actions">
          <PolicyChangeHeaderActions />
          <PolicyChangeOpenPrototypeDoc />
        </div>
      </template>
    </PageHeader>

    <PageContent class="policy-open__content">
      <div class="policy-open__scroll-body">
        <div class="policy-open__top-bar">
          <div class="policy-open__stat-tags-wrap">
            <span class="policy-open__stat-tags-label">状态统计</span>
            <div class="policy-open__stat-tags">
              <ElTag
                class="policy-open__stat-tag"
                :effect="statFilter === 'all' ? 'dark' : 'plain'"
                type="success"
                @click="statFilter = 'all'"
              >
                全部 {{ statCounts.all }}
              </ElTag>
              <ElTag
                class="policy-open__stat-tag"
                :effect="statFilter === 'incomplete' ? 'dark' : 'plain'"
                type="warning"
                @click="statFilter = 'incomplete'"
              >
                未完成 {{ statCounts.incomplete }}
              </ElTag>
              <ElTag
                class="policy-open__stat-tag"
                :effect="statFilter === 'completed' ? 'dark' : 'plain'"
                type="primary"
                @click="statFilter = 'completed'"
              >
                已完成 {{ statCounts.completed }}
              </ElTag>
              <ElTag
                class="policy-open__stat-tag"
                :effect="statFilter === 'cancelled' ? 'dark' : 'plain'"
                type="info"
                @click="statFilter = 'cancelled'"
              >
                已取消 {{ statCounts.cancelled }}
              </ElTag>
            </div>
          </div>
          <div class="policy-open__top-bar-time">
            <TimeFilterBar v-model="dateRange" />
          </div>
        </div>

        <div class="policy-open__filters" @submit.prevent="applyQuery">
          <ElInput
            v-model="qFirewall"
            clearable
            class="policy-open__filter-input"
            placeholder="目标防火墙"
          />
          <ElSelect
            v-model="qSearchStatus"
            clearable
            class="policy-open__filter-select"
            placeholder="状态"
          >
            <ElOption
              v-for="o in STATUS_FILTER_OPTIONS"
              :key="o.value || 'all'"
              :label="o.label"
              :value="o.value"
            />
          </ElSelect>
          <ElInput
            v-model="qRemark"
            clearable
            class="policy-open__filter-input"
            placeholder="策略备注"
          />
          <ElSelect
            v-model="qChangeSource"
            clearable
            class="policy-open__filter-select"
            placeholder="变更来源"
          >
            <ElOption
              v-for="o in CHANGE_SOURCE_OPTIONS"
              :key="o.value || 'all'"
              :label="o.label"
              :value="o.value"
            />
          </ElSelect>
          <ElPopover
            v-model:visible="moreFilterVisible"
            placement="bottom-start"
            :width="300"
            trigger="click"
          >
            <template #reference>
              <ElButton class="policy-open__filter-icon" :icon="Filter" circle title="更多条件" />
            </template>
            <div class="policy-open__more-pop">
              <div class="policy-open__more-row">
                <span class="policy-open__more-label">策略工单</span>
                <ElSelect
                  v-model="qPolicyTicket"
                  clearable
                  placeholder="策略工单"
                  style="width: 100%"
                >
                  <ElOption
                    v-for="o in POLICY_TICKET_OPTIONS"
                    :key="o.value || 'all'"
                    :label="o.label"
                    :value="o.value"
                  />
                </ElSelect>
              </div>
              <div class="policy-open__more-row">
                <span class="policy-open__more-label">变更原因</span>
                <ElInput v-model="qChangeReason" clearable placeholder="变更原因" />
              </div>
            </div>
          </ElPopover>
          <ElButton type="primary" class="policy-open__btn-primary" @click="applyQuery"
            >查询</ElButton
          >
          <ElButton class="policy-open__btn-reset" @click="clearQuery">重置</ElButton>
        </div>

        <div class="table-toolbar policy-open__table-toolbar">
          <div class="policy-open__toolbar-btns">
            <ElButton
              type="primary"
              class="policy-open__btn-primary"
              :icon="Plus"
              @click="addVisible = true"
            >
              新建
            </ElButton>
            <ElButton
              type="primary"
              class="policy-open__btn-primary"
              :icon="Download"
              @click="onExport"
            >
              导出
            </ElButton>
            <ElButton type="danger" :icon="Delete" @click="onBatchDelete">删除</ElButton>
          </div>
          <div class="table-toolbar__right">
            <TableColumnSettingPopover :api="policyOpenColumnSettings" />
          </div>
        </div>

        <div ref="policyTableContainerRef" class="policy-table-container">
          <ElTable
            ref="tableRef"
            :data="pagedRows"
            :max-height="tableMaxHeight"
            border
            stripe
            :row-class-name="rowClassName"
            @selection-change="onSelectionChange"
          >
            <ElTableColumn type="selection" width="44" fixed="left" align="center" :selectable="selectableRow" />
            <ElTableColumn
              label="序号"
              type="index"
              width="60"
              fixed="left"
              :index="indexMethod"
            />
            <template v-for="col in policyOpenColumnSettings.sortedColumnDefsForRender" :key="col.key">
              <ElTableColumn
                v-if="col.key === 'nameStatus'"
                :label="col.label"
                min-width="150"
                :fixed="policyOpenColumnSettings.columnFixedProp(col)"
              >
                <template #default="{ row }">
                  <template v-if="!(row as { __empty?: boolean }).__empty">
                    <div class="cell-two-line">
                      <div
                        v-if="policyOpenColumnSettings.isFieldVisible('nameStatus', 'name')"
                        class="cell-line cell-ellipsis"
                      >
                        {{ (row as OpenRow).name }}
                      </div>
                      <div v-if="policyOpenColumnSettings.isFieldVisible('nameStatus', 'status')" class="cell-line">
                        <ElTag :type="statusTagType((row as OpenRow).rowStatus)" size="small">
                          {{ statusLabel((row as OpenRow).rowStatus) }}
                        </ElTag>
                      </div>
                    </div>
                  </template>
                </template>
              </ElTableColumn>
              <ElTableColumn
                v-else-if="col.key === 'srcIp'"
                :label="col.label"
                min-width="110"
                :fixed="policyOpenColumnSettings.columnFixedProp(col)"
              >
                <template #default="{ row }">
                  <div v-if="!(row as { __empty?: boolean }).__empty" class="cell-line cell-ellipsis">
                    {{ ipOrAny((row as OpenRow).srcIp) }}
                  </div>
                </template>
              </ElTableColumn>
              <ElTableColumn
                v-else-if="col.key === 'dstIp'"
                :label="col.label"
                min-width="110"
                :fixed="policyOpenColumnSettings.columnFixedProp(col)"
              >
                <template #default="{ row }">
                  <div v-if="!(row as { __empty?: boolean }).__empty" class="cell-line cell-ellipsis">
                    {{ ipOrAny((row as OpenRow).dstIp) }}
                  </div>
                </template>
              </ElTableColumn>
              <ElTableColumn
                v-else-if="col.key === 'service'"
                :label="col.label"
                min-width="100"
                :fixed="policyOpenColumnSettings.columnFixedProp(col)"
              >
                <template #default="{ row }">
                  <div v-if="!(row as { __empty?: boolean }).__empty" class="cell-line cell-ellipsis">
                    {{ serviceOrAny((row as OpenRow).service) }}
                  </div>
                </template>
              </ElTableColumn>
              <ElTableColumn
                v-else-if="col.key === 'actionValid'"
                :label="col.label"
                min-width="130"
                :fixed="policyOpenColumnSettings.columnFixedProp(col)"
              >
                <template #default="{ row }">
                  <template v-if="!(row as { __empty?: boolean }).__empty">
                    <div class="cell-two-line">
                      <div v-if="policyOpenColumnSettings.isFieldVisible('actionValid', 'action')" class="cell-line">
                        <ElTag
                          :type="(row as OpenRow).action === 'allow' ? 'success' : 'danger'"
                          size="small"
                          effect="plain"
                        >
                          {{ (row as OpenRow).action === 'allow' ? '允许' : '拒绝' }}
                        </ElTag>
                      </div>
                      <div
                        v-if="policyOpenColumnSettings.isFieldVisible('actionValid', 'validUntil')"
                        class="cell-line cell-ellipsis"
                      >
                        {{ (row as OpenRow).validUntil }}
                      </div>
                    </div>
                  </template>
                </template>
              </ElTableColumn>
              <ElTableColumn
                v-else-if="col.key === 'firewalls'"
                :label="col.label"
                min-width="130"
                :fixed="policyOpenColumnSettings.columnFixedProp(col)"
              >
                <template #default="{ row }">
                  <ElTooltip
                    v-if="!(row as { __empty?: boolean }).__empty"
                    :content="(row as OpenRow).firewalls"
                    placement="top"
                    :show-after="300"
                  >
                    <div class="tags-text">{{ (row as OpenRow).firewalls }}</div>
                  </ElTooltip>
                </template>
              </ElTableColumn>
              <ElTableColumn
                v-else-if="col.key === 'remark'"
                :label="col.label"
                min-width="100"
                :fixed="policyOpenColumnSettings.columnFixedProp(col)"
              >
                <template #default="{ row }">
                  <div v-if="!(row as { __empty?: boolean }).__empty" class="cell-line cell-ellipsis">
                    {{ (row as OpenRow).remark }}
                  </div>
                </template>
              </ElTableColumn>
              <ElTableColumn
                v-else-if="col.key === 'other'"
                :label="col.label"
                min-width="150"
                :fixed="policyOpenColumnSettings.columnFixedProp(col)"
              >
                <template #default="{ row }">
                  <template v-if="!(row as { __empty?: boolean }).__empty">
                    <div class="cell-two-line">
                      <div
                        v-if="policyOpenColumnSettings.isFieldVisible('other', 'srcOwner')"
                        class="cell-line cell-ellipsis"
                      >
                        {{ ownerLine('src', (row as OpenRow).srcOwner) }}
                      </div>
                      <div
                        v-if="policyOpenColumnSettings.isFieldVisible('other', 'dstOwner')"
                        class="cell-line cell-ellipsis"
                      >
                        {{ ownerLine('dst', (row as OpenRow).dstOwner) }}
                      </div>
                    </div>
                  </template>
                </template>
              </ElTableColumn>
              <ElTableColumn
                v-else-if="col.key === 'period'"
                :label="col.label"
                min-width="180"
                :fixed="policyOpenColumnSettings.columnFixedProp(col)"
              >
                <template #default="{ row }">
                  <template v-if="!(row as { __empty?: boolean }).__empty">
                    <div class="cell-two-line">
                      <div
                        v-if="policyOpenColumnSettings.isFieldVisible('period', 'createdAt')"
                        class="cell-line cell-ellipsis"
                      >
                        创建时间：{{ formatDateTime((row as OpenRow).createdAt) }}
                      </div>
                      <div
                        v-if="policyOpenColumnSettings.isFieldVisible('period', 'endedAt')"
                        class="cell-line cell-ellipsis"
                      >
                        {{
                          (row as OpenRow).endedAt
                            ? `结束时间：${formatDateTime((row as OpenRow).endedAt!)}`
                            : ''
                        }}
                      </div>
                    </div>
                  </template>
                </template>
              </ElTableColumn>
              <ElTableColumn
                v-else-if="col.key === 'operation'"
                :label="col.label"
                min-width="100"
                align="center"
                class-name="op-column"
                :fixed="policyOpenColumnSettings.columnFixedProp(col)"
              >
                <template #default="{ row }">
                  <span v-if="!(row as { __empty?: boolean }).__empty" class="op-cell">
                    <ElButton type="primary" link size="small" @click="openView(row as OpenRow)">
                      查看
                    </ElButton>
                  </span>
                </template>
              </ElTableColumn>
            </template>
          </ElTable>
        </div>

        <div class="table-pagination">
          <ElPagination
            v-model:current-page="currentPage"
            background
            layout="total, prev, pager, next"
            :total="filteredRows.length"
            :page-size="PAGE_SIZE"
          />
        </div>
      </div>
    </PageContent>

    <!-- 新建：未点「保存并分析」为图1；点击后为图2（收起「其他信息」、表格展示分析结果） -->
    <ElDialog
      v-model="addVisible"
      width="1120px"
      class="policy-open-add-dialog"
      align-center
      destroy-on-close
    >
      <template #header="{ titleId, titleClass }">
        <div class="policy-open-add-dialog__header">
          <span :id="titleId" :class="titleClass">策略开通</span>
          <DialogPrototypeDoc doc-key="policy-change-open-add" business-short-name="策略开通" />
        </div>
      </template>
      <div class="policy-open-add__body">
        <!-- 上半：开通信息（可展开收起；保存并分析后自动收起） -->
        <div class="policy-open-add__panel policy-open-add__panel--openinfo">
          <ElCollapse v-model="addOpenInfoNames" class="policy-open-add__openinfo-collapse">
            <ElCollapseItem name="info">
              <template #title>
                <span class="policy-open-add__section-title">开通信息</span>
              </template>
          <ElForm
            label-width="108px"
            label-position="right"
            size="small"
            class="policy-open-add__form"
          >
            <ElFormItem label="策略名称">
              <ElInput v-model="addPolicyName" maxlength="32" show-word-limit />
            </ElFormItem>
            <div class="policy-open-add__two-cols">
              <ElFormItem class="policy-open-add__form-item-grow">
                <template #label>
                  <span class="policy-open-add__label-with-help">
                    源IP
                    <ElTooltip :content="ADD_FORM_IP_TOOLTIP" placement="top" :show-after="200">
                      <ElIcon class="policy-open-add__help-icon"><QuestionFilled /></ElIcon>
                    </ElTooltip>
                  </span>
                </template>
                <ElInput
                  v-model="addSrcIp"
                  type="textarea"
                  :autosize="{ minRows: 2, maxRows: 3 }"
                  maxlength="528"
                  show-word-limit
                />
              </ElFormItem>
              <ElFormItem class="policy-open-add__form-item-grow">
                <template #label>
                  <span class="policy-open-add__label-with-help">
                    目的IP
                    <ElTooltip :content="ADD_FORM_IP_TOOLTIP" placement="top" :show-after="200">
                      <ElIcon class="policy-open-add__help-icon"><QuestionFilled /></ElIcon>
                    </ElTooltip>
                  </span>
                </template>
                <ElInput
                  v-model="addDstIp"
                  type="textarea"
                  :autosize="{ minRows: 2, maxRows: 3 }"
                  maxlength="528"
                  show-word-limit
                />
              </ElFormItem>
            </div>
            <div class="policy-open-add__proto-port">
              <ElFormItem required class="policy-open-add__proto">
                <template #label>
                  <span>协议</span>
                </template>
                <ElSelect v-model="addProtocol" style="width: 100%">
                  <ElOption label="TCP/UDP" value="tcpudp" />
                  <ElOption label="TCP" value="tcp" />
                  <ElOption label="UDP" value="udp" />
                  <ElOption label="ICMP" value="icmp" />
                </ElSelect>
              </ElFormItem>
              <ElFormItem class="policy-open-add__port">
                <template #label>
                  <span class="policy-open-add__label-with-help">
                    端口
                    <ElTooltip
                      placement="top-start"
                      :show-after="200"
                      popper-class="policy-open-add__port-tooltip"
                    >
                      <template #content>
                        <div class="policy-open-add__tip-multiline">{{ ADD_FORM_PORT_TOOLTIP_LINES }}</div>
                      </template>
                      <ElIcon class="policy-open-add__help-icon"><QuestionFilled /></ElIcon>
                    </ElTooltip>
                  </span>
                </template>
                <ElInput v-model="addPort" maxlength="512" show-word-limit />
              </ElFormItem>
            </div>
            <ElFormItem required>
              <template #label>
                <span>有效期</span>
              </template>
              <div class="policy-open-add__validity-row">
                <ElRadioGroup v-model="addValidUntil">
                  <ElRadio label="permanent">永久</ElRadio>
                  <ElRadio label="custom">自定义</ElRadio>
                </ElRadioGroup>
                <div v-if="addValidUntil === 'custom'" class="policy-open-add__validity-end">
                  <span class="policy-open-add__validity-end-label">结束时间</span>
                  <ElDatePicker
                    v-model="addValidEndDate"
                    type="datetime"
                    placeholder="选择结束时间"
                    format="YYYY-MM-DD HH:mm:ss"
                    value-format="YYYY-MM-DD HH:mm:ss"
                    style="width: 220px"
                  />
                </div>
              </div>
            </ElFormItem>
            <ElFormItem>
              <template #label>
                <span class="policy-open-add__label-with-help">
                  策略备注
                  <ElTooltip
                    placement="top-start"
                    :show-after="200"
                    popper-class="policy-open-add__remark-tooltip"
                  >
                    <template #content>
                      <div class="policy-open-add__tip-multiline">{{ ADD_FORM_REMARK_TOOLTIP_LINES }}</div>
                    </template>
                    <ElIcon class="policy-open-add__help-icon"><QuestionFilled /></ElIcon>
                  </ElTooltip>
                </span>
              </template>
              <ElInput v-model="addRemark" maxlength="255" show-word-limit />
            </ElFormItem>

            <div class="policy-open-add__owner-save-row">
              <div class="policy-open-add__owner-save-row__left">
                <div class="policy-open-add__owner-row">
                  <ElFormItem class="policy-open-add__form-item-grow">
                    <template #label>
                      <span class="policy-open-add__label-with-help">
                        源IP负责人
                        <ElTooltip content="源IP资产负责人" placement="top" :show-after="200">
                          <ElIcon class="policy-open-add__help-icon"><QuestionFilled /></ElIcon>
                        </ElTooltip>
                      </span>
                    </template>
                    <div class="policy-open-add__owner-select" @click="openOwnerPicker('src')">
                      <ElInput :model-value="addSrcOwner" readonly placeholder="请选择" />
                      <ElIcon class="policy-open-add__owner-select-arrow"><ArrowDown /></ElIcon>
                    </div>
                  </ElFormItem>
                  <ElFormItem class="policy-open-add__form-item-grow">
                    <template #label>
                      <span class="policy-open-add__label-with-help">
                        目的IP负责人
                        <ElTooltip content="目的IP资产负责人" placement="top" :show-after="200">
                          <ElIcon class="policy-open-add__help-icon"><QuestionFilled /></ElIcon>
                        </ElTooltip>
                      </span>
                    </template>
                    <div class="policy-open-add__owner-select" @click="openOwnerPicker('dst')">
                      <ElInput :model-value="addDstOwner" readonly placeholder="请选择" />
                      <ElIcon class="policy-open-add__owner-select-arrow"><ArrowDown /></ElIcon>
                    </div>
                  </ElFormItem>
                </div>
              </div>
              <div class="policy-open-add__owner-save-row__right">
                <ElButton type="primary" size="small" @click="onAddSaveAnalyze">保存并分析</ElButton>
              </div>
            </div>
          </ElForm>
            </ElCollapseItem>
          </ElCollapse>
        </div>

        <!-- 下半：开通目标设备（常驻展开） -->
        <div class="policy-open-add__panel policy-open-add__panel--devices">
          <div class="policy-open-add__panel-head">
            <span class="policy-open-add__section-title">开通目标设备</span>
          </div>
          <div class="table-toolbar policy-open-add__device-toolbar">
            <ElButton type="primary" size="small" :disabled="!addDialogAnalyzed">调整目标设备</ElButton>
            <ElButton type="primary" size="small" :disabled="!addDialogAnalyzed">下发配置命令</ElButton>
            <ElButton type="primary" size="small" :disabled="!addDialogAnalyzed">回撤</ElButton>
          </div>
          <div class="policy-table-container policy-open-add__table-wrap">
            <ElTable
              :data="addDeviceTableRows"
              border
              stripe
              max-height="420"
              :empty-text="addDialogTableEmptyText"
            >
                  <ElTableColumn type="index" label="序号" width="56" fixed="left" />
                  <ElTableColumn label="目标防火墙" min-width="120">
                    <template #default="{ row }">
                      <ElTooltip
                        placement="top"
                        :show-after="300"
                        :disabled="!row.firewall"
                        :content="row.firewall"
                      >
                        <div class="policy-open-add__cell-clamp2">{{ row.firewall }}</div>
                      </ElTooltip>
                    </template>
                  </ElTableColumn>
                  <ElTableColumn label="策略名称" min-width="110">
                    <template #default="{ row }">
                      <ElTooltip
                        placement="top"
                        :show-after="300"
                        :disabled="!row.policyName"
                        :content="row.policyName"
                      >
                        <div class="policy-open-add__cell-clamp2">{{ row.policyName }}</div>
                      </ElTooltip>
                    </template>
                  </ElTableColumn>
                  <ElTableColumn label="源" min-width="100">
                    <template #default="{ row }">
                      <ElTooltip
                        placement="top"
                        :show-after="300"
                        :disabled="!row.src"
                        :content="row.src"
                      >
                        <div class="policy-open-add__cell-clamp2">{{ row.src }}</div>
                      </ElTooltip>
                    </template>
                  </ElTableColumn>
                  <ElTableColumn label="目的" min-width="100">
                    <template #default="{ row }">
                      <ElTooltip
                        placement="top"
                        :show-after="300"
                        :disabled="!row.dst"
                        :content="row.dst"
                      >
                        <div class="policy-open-add__cell-clamp2">{{ row.dst }}</div>
                      </ElTooltip>
                    </template>
                  </ElTableColumn>
                  <ElTableColumn label="服务" min-width="88">
                    <template #default="{ row }">
                      <ElTooltip
                        placement="top"
                        :show-after="300"
                        :disabled="!row.service"
                        :content="row.service"
                      >
                        <div class="policy-open-add__cell-clamp2">{{ row.service }}</div>
                      </ElTooltip>
                    </template>
                  </ElTableColumn>
                  <ElTableColumn label="动作" width="72" align="center">
                    <template #default="{ row }">
                      <span class="cell-line">{{ row.action }}</span>
                    </template>
                  </ElTableColumn>
                  <ElTableColumn label="有效期" min-width="96">
                    <template #default="{ row }">
                      <ElTooltip
                        placement="top"
                        :show-after="300"
                        :disabled="!row.validUntil"
                        :content="row.validUntil"
                      >
                        <div class="policy-open-add__cell-clamp2">{{ row.validUntil }}</div>
                      </ElTooltip>
                    </template>
                  </ElTableColumn>
                  <ElTableColumn label="分析结果" width="108" align="center">
                    <template #default="{ row }">
                      <ElTag
                        v-if="row.analysisResult === 'none'"
                        type="info"
                        effect="light"
                        size="small"
                      >
                        无需开通
                      </ElTag>
                      <ElTag v-else type="danger" effect="light" size="small">需要开通</ElTag>
                    </template>
                  </ElTableColumn>
                  <ElTableColumn label="开通方式" min-width="96">
                    <template #default="{ row }">
                      <ElTooltip
                        placement="top"
                        :show-after="300"
                        :disabled="!row.openMethod"
                        :content="row.openMethod"
                      >
                        <div class="policy-open-add__cell-clamp2">{{ row.openMethod }}</div>
                      </ElTooltip>
                    </template>
                  </ElTableColumn>
                  <ElTableColumn label="分析异常项" min-width="100">
                    <template #default="{ row }">
                      <ElTooltip
                        placement="top"
                        :show-after="300"
                        :disabled="!row.abnormal"
                        :content="row.abnormal"
                      >
                        <div class="policy-open-add__cell-clamp2 policy-open-add__abnormal">
                          {{ row.abnormal }}
                        </div>
                      </ElTooltip>
                    </template>
                  </ElTableColumn>
                  <ElTableColumn label="执行状态" width="168" align="left">
                    <template #default="{ row }">
                      <div class="policy-open-add__exec-cell">
                        <div>
                          <ElTag
                            size="small"
                            effect="plain"
                            :type="execStatusTagType(row.execStatusTag)"
                          >
                            {{ row.execStatusTag }}
                          </ElTag>
                        </div>
                        <div class="policy-open-add__exec-time-row">
                          <span class="policy-open-add__exec-time-txt">{{ row.execStatusTime }}</span>
                          <span
                            v-if="row.verifyNeedManual && !row.verifyManualOk"
                            class="policy-open-add__verify-icon"
                            @click.stop="onManualVerifyDevice(row)"
                          >
                            <ElTooltip content="手动校验" placement="top">
                              <ElIcon :size="16" color="var(--el-color-warning)">
                                <WarningFilled />
                              </ElIcon>
                            </ElTooltip>
                          </span>
                        </div>
                      </div>
                    </template>
                  </ElTableColumn>
                  <ElTableColumn label="备注" min-width="72">
                    <template #default="{ row }">
                      <ElTooltip
                        placement="top"
                        :show-after="300"
                        :disabled="!row.remark"
                        :content="row.remark"
                      >
                        <div class="policy-open-add__cell-clamp2">{{ row.remark }}</div>
                      </ElTooltip>
                    </template>
                  </ElTableColumn>
                  <ElTableColumn min-width="160">
                    <template #header>
                      <span class="policy-open-add__th-with-tip">
                        验证提示
                        <ElTooltip
                          placement="top-start"
                          :show-after="200"
                          popper-class="policy-open-add__verify-tooltip"
                        >
                          <template #content>
                            <div class="policy-open-add__tip-multiline">{{ ADD_VERIFY_BLOCK_TOOLTIP }}</div>
                          </template>
                          <ElIcon class="policy-open-add__help-icon"><QuestionFilled /></ElIcon>
                        </ElTooltip>
                      </span>
                    </template>
                    <template #default="{ row }">
                      <ElTooltip
                        placement="top"
                        :show-after="300"
                        :disabled="!row.verifyHint"
                        :content="row.verifyHint"
                      >
                        <div class="policy-open-add__cell-clamp2">{{ row.verifyHint }}</div>
                      </ElTooltip>
                    </template>
                  </ElTableColumn>
                  <ElTableColumn label="错误信息" min-width="140">
                    <template #default="{ row }">
                      <ElTooltip
                        v-if="row.errorInfo"
                        :content="row.errorInfo"
                        placement="top"
                        :show-after="300"
                      >
                        <div class="policy-open-add__error-cell">{{ row.errorInfo }}</div>
                      </ElTooltip>
                    </template>
                  </ElTableColumn>
                  <ElTableColumn label="创建时间" min-width="156">
                    <template #default="{ row }">
                      <ElTooltip
                        placement="top"
                        :show-after="300"
                        :disabled="!row.createdAt"
                        :content="row.createdAt"
                      >
                        <div class="policy-open-add__cell-clamp2">{{ row.createdAt }}</div>
                      </ElTooltip>
                    </template>
                  </ElTableColumn>
                  <ElTableColumn label="操作" width="100" fixed="right" align="center" class-name="op-column">
                    <template #default="{ row }">
                      <span class="op-cell">
                        <ElButton type="primary" link size="small" @click="openAdjustDialog(row)">调整</ElButton>
                        <ElTooltip
                          v-if="row.verifyBlockIssuance"
                          :content="ADD_VERIFY_BLOCK_TOOLTIP"
                          placement="top"
                          popper-class="policy-open-add__verify-tooltip"
                        >
                          <span class="policy-open-add__issue-wrap">
                            <ElButton type="primary" link size="small" disabled>下发</ElButton>
                          </span>
                        </ElTooltip>
                        <ElButton v-else type="primary" link size="small">下发</ElButton>
                      </span>
                    </template>
                  </ElTableColumn>
            </ElTable>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="policy-open-add__footer">
          <ElButton type="danger" plain size="small">手动结束</ElButton>
          <ElButton size="small" @click="addVisible = false">关闭窗口</ElButton>
        </div>
      </template>
    </ElDialog>

    <!-- 新建弹窗：源/目的 IP 负责人 — 系统用户单选 -->
    <ElDialog
      v-model="addOwnerPickerVisible"
      title="选择用户"
      width="480px"
      append-to-body
      align-center
      destroy-on-close
      class="policy-open-add-user-dialog"
    >
      <ElTable
        :data="MOCK_SYSTEM_USERS"
        border
        stripe
        size="small"
        max-height="320"
        class="policy-open-add__user-table"
        :row-class-name="ownerPickerRowClassName"
        @row-click="onOwnerTableRowClick"
      >
        <ElTableColumn label="用户名" prop="name" min-width="140" show-overflow-tooltip />
        <ElTableColumn label="手机号" prop="phone" min-width="140" show-overflow-tooltip />
      </ElTable>
      <template #footer>
        <ElButton size="small" @click="addOwnerPickerVisible = false">取消</ElButton>
        <ElButton type="primary" size="small" @click="confirmOwnerPicker">确定</ElButton>
      </template>
    </ElDialog>

    <PolicyChangeAdjustDialog
      v-model="adjustDialogVisible"
      :device-row="adjustDialogDeviceRow"
      @save="onAdjustDialogSave"
    />

    <!-- 查看：与添加同结构，按设备状态只读或可编辑 -->
    <ElDialog
      v-model="viewVisible"
      title="查看"
      width="720px"
      destroy-on-close
      @closed="viewRow = null"
    >
      <template v-if="viewRow">
        <ElAlert
          v-if="viewFormReadonly"
          type="info"
          :closable="false"
          show-icon
          class="policy-open__view-tip"
        >
          目标防火墙已存在下发成功、回撤成功或回撤失败状态，本单仅可查看。
        </ElAlert>
        <ElAlert v-else type="success" :closable="false" show-icon class="policy-open__view-tip">
          设备仅为待下发或下发失败，可编辑开通信息。
        </ElAlert>
        <ElCollapse v-model="viewCollapseActive">
          <ElCollapseItem title="开通信息" name="open">
            <ElForm label-width="100px">
              <ElFormItem label="名称">
                <ElInput
                  v-model="viewRow.name"
                  maxlength="32"
                  show-word-limit
                  placeholder="非必填"
                  :disabled="viewFormReadonly"
                />
              </ElFormItem>
              <ElFormItem label="源地址">
                <ElInput
                  v-model="viewRow.srcIp"
                  type="textarea"
                  :rows="2"
                  placeholder="不填列表为 any"
                  :disabled="viewFormReadonly"
                />
              </ElFormItem>
              <ElFormItem label="目的地址">
                <ElInput
                  v-model="viewRow.dstIp"
                  type="textarea"
                  :rows="2"
                  :disabled="viewFormReadonly"
                />
              </ElFormItem>
              <ElFormItem label="协议">
                <ElRadioGroup model-value="tcp" :disabled="viewFormReadonly">
                  <ElRadio label="tcpudp">TCP/UDP</ElRadio>
                  <ElRadio label="tcp">TCP</ElRadio>
                  <ElRadio label="udp">UDP</ElRadio>
                  <ElRadio label="icmp">ICMP</ElRadio>
                </ElRadioGroup>
              </ElFormItem>
              <ElFormItem label="端口">
                <ElInput
                  v-model="viewRow.service"
                  placeholder="如 TCP_80"
                  :disabled="viewFormReadonly"
                />
              </ElFormItem>
              <ElFormItem label="动作">
                <ElRadioGroup v-model="viewRow.action" :disabled="viewFormReadonly">
                  <ElRadio label="allow">允许</ElRadio>
                  <ElRadio label="deny">拒绝</ElRadio>
                </ElRadioGroup>
              </ElFormItem>
              <ElFormItem label="有效期">
                <ElInput v-model="viewRow.validUntil" :disabled="viewFormReadonly" />
              </ElFormItem>
              <ElFormItem label="备注">
                <ElInput
                  v-model="viewRow.remark"
                  type="textarea"
                  :rows="2"
                  :disabled="viewFormReadonly"
                />
              </ElFormItem>
              <ElFormItem label="源IP负责人">
                <ElInput v-model="viewRow.srcOwner" :disabled="viewFormReadonly" />
              </ElFormItem>
              <ElFormItem label="目的IP负责人">
                <ElInput v-model="viewRow.dstOwner" :disabled="viewFormReadonly" />
              </ElFormItem>
            </ElForm>
          </ElCollapseItem>
        </ElCollapse>
      </template>
    </ElDialog>
  </section>
</template>

<style scoped>
.policy-page {
  display: flex;
  flex-direction: column;
  gap: 0;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.policy-open {
  height: 100%;
}

.policy-open__header-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* 页体卡片：占满主区域高度，内部滚动不把横向条沉到整页底部（见 UI 规范 4.2） */
.policy-open :deep(.page-content) {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden !important;
}

.policy-open__scroll-body {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
}

/* 顶栏：左状态统计 + 右时间过滤（一行内两端对齐；窄屏自动折行） */
.policy-open__top-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
}

.policy-open__top-bar-time {
  flex: 0 1 auto;
  min-width: 0;
  max-width: 100%;
  margin-left: auto;
}

/* 合并底边：去掉 TimeFilterBar 自带下边框，避免双线 */
.policy-open__top-bar-time :deep(.time-filter-bar) {
  padding-bottom: 0;
  border-bottom: none;
}

/* 状态统计：与 NAT 开通页 ElTag 筛选样式一致 */
.policy-open__stat-tags-wrap {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
  flex: 1 1 240px;
  min-width: 0;
}

.policy-open__stat-tags-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.policy-open__stat-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.policy-open__stat-tag {
  cursor: pointer;
  user-select: none;
}

.policy-open__filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin: 0;
  padding: 12px 14px;
  background: var(--color-background-soft, rgba(148, 163, 184, 0.08));
  border-radius: 8px;
  flex-shrink: 0;
}

.policy-open__filter-input {
  width: 160px;
}

.policy-open__filter-select {
  width: 140px;
}

.policy-open__filter-icon {
  flex-shrink: 0;
}

.policy-open__more-pop {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.policy-open__more-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.policy-open__more-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.policy-open__btn-primary {
  --el-button-bg-color: var(--el-color-primary);
  --el-button-border-color: var(--el-color-primary);
}

.policy-open__btn-reset {
  background: var(--el-bg-color);
  border-color: var(--el-border-color);
  color: var(--el-text-color-primary);
}

.policy-open__toolbar-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  flex-shrink: 0;
}

/* 占位行边框与全局表一致 */
.policy-open__scroll-body .policy-table-container :deep(.is-empty-row td) {
  border-color: var(--el-border-color-lighter);
}

.policy-open__dialog-section-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--el-text-color-primary);
}

.policy-open__view-tip {
  margin-bottom: 12px;
}

/* —— 新建「策略开通」弹窗 —— */
.policy-open-add__body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.policy-open-add__panel {
  padding: 12px 14px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
}

.policy-open-add__panel--openinfo {
  padding: 0;
  flex-shrink: 0;
}

.policy-open-add__openinfo-collapse {
  border: none;
  --el-collapse-header-height: 32px;
}

.policy-open-add__openinfo-collapse :deep(.el-collapse-item__header) {
  align-items: center;
  min-height: 30px;
  height: auto;
  line-height: 1.3;
  padding: 4px 8px;
  background: var(--el-fill-color-light);
  border-radius: 8px 8px 0 0;
  border: none;
}

.policy-open-add__openinfo-collapse :deep(.el-collapse-item__arrow) {
  margin: 0 6px 0 0;
}

.policy-open-add__openinfo-collapse :deep(.el-collapse-item__wrap) {
  border: none;
}

.policy-open-add__openinfo-collapse :deep(.el-collapse-item__content) {
  padding: 12px 14px 14px;
  border: 1px solid var(--el-border-color-lighter);
  border-top: none;
  border-radius: 0 0 8px 8px;
}

.policy-open-add__openinfo-collapse :deep(.el-collapse-item:last-child) {
  margin-bottom: 0;
}

.policy-open-add__validity-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 20px;
  width: 100%;
}

.policy-open-add__validity-end {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.policy-open-add__validity-end-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.policy-open-add__exec-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
}

.policy-open-add__exec-time-row {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
  max-width: 100%;
}

.policy-open-add__exec-time-txt {
  font-size: 12px;
  color: var(--el-text-color-regular);
  word-break: break-all;
}

.policy-open-add__verify-icon {
  cursor: pointer;
  display: inline-flex;
  flex-shrink: 0;
  line-height: 1;
}

.policy-open-add__th-with-tip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.policy-open-add__error-cell {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-all;
  font-size: 12px;
  line-height: 1.35;
  white-space: pre-line;
}

.policy-open-add__issue-wrap {
  display: inline-flex;
}

.policy-open-add__panel-head {
  margin-bottom: 10px;
}

.policy-open-add__panel--devices {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}

.policy-open-add__section-title {
  display: inline-flex;
  align-items: center;
  padding-left: 8px;
  border-left: 2px solid var(--el-color-success);
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.policy-open-add__owner-save-row {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: 2px;
  padding-top: 10px;
  border-top: 1px dashed var(--el-border-color-lighter);
}

.policy-open-add__owner-save-row__left {
  flex: 1;
  min-width: min(100%, 420px);
}

.policy-open-add__owner-save-row__right {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding-bottom: 6px;
}

@media (max-width: 720px) {
  .policy-open-add__owner-save-row__right {
    width: 100%;
    justify-content: flex-end;
    padding-bottom: 0;
  }
}

.policy-open-add__form :deep(.el-form-item) {
  margin-bottom: 6px;
}

.policy-open-add__form :deep(.el-form-item__label) {
  padding-bottom: 0;
  line-height: 28px;
}

.policy-open-add__form :deep(.el-form-item:has(.el-textarea) .el-form-item__label) {
  align-self: flex-start;
  line-height: 1.35;
  padding-top: 4px;
}

.policy-open-add__label-with-help {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.policy-open-add__help-icon {
  cursor: help;
  color: var(--el-text-color-secondary);
  font-size: 14px;
  vertical-align: middle;
}

.policy-open-add__two-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 12px;
  width: 100%;
}

.policy-open-add__form-item-grow {
  flex: 1;
  min-width: 0;
}

.policy-open-add__proto-port {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 12px;
  width: 100%;
}

.policy-open-add__owner-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 12px;
  width: 100%;
}

.policy-open-add__owner-select {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  cursor: pointer;
}

.policy-open-add__owner-select :deep(.el-input__wrapper) {
  cursor: pointer;
  padding-right: 28px;
}

.policy-open-add__owner-select-arrow {
  position: absolute;
  right: 10px;
  color: var(--el-text-color-secondary);
  pointer-events: none;
  font-size: 14px;
}

.policy-open-add__user-table :deep(tr.policy-open-add__user-row--pick > td) {
  background-color: var(--el-color-primary-light-9) !important;
}

.policy-open-add__user-table :deep(.el-table__body tr) {
  cursor: pointer;
}

.policy-open-add__device-toolbar {
  padding-bottom: 0 !important;
  margin-bottom: 8px;
}

.policy-open-add__panel--devices .policy-open-add__table-wrap {
  flex: 1;
  min-height: 0;
  max-height: none;
}

.policy-open-add__abnormal {
  font-size: 12px;
  color: var(--el-color-danger);
}

/* 内表文本列：最多两行，hover 由 ElTooltip 展示全文 */
.policy-open-add__cell-clamp2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
  font-size: 12px;
  line-height: 1.35;
  max-width: 100%;
}

.policy-open-add__footer {
  display: flex;
  justify-content: center;
  gap: 24px;
  width: 100%;
}

.policy-open-add-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 8px;
  min-width: 0;
}
</style>

<style>
/* 弹窗根节点（与 scoped 并存，避免 teleport 漏样式） */
/* Element Plus 遮罩 .el-overlay-dialog 默认 overflow:auto，内容过高时整层出滑块；此处禁止遮罩滚动，仅表格内部滚动 */
.el-overlay-dialog:has(.policy-open-add-dialog) {
  overflow: hidden !important;
}

.policy-open-add-dialog.el-dialog {
  display: flex;
  flex-direction: column;
  max-height: min(92vh, 900px);
  margin: 0 auto !important;
  overflow: hidden;
}

.policy-open-add-dialog .el-dialog__header {
  flex-shrink: 0;
}

.policy-open-add-dialog .el-dialog__body {
  padding-top: 8px;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  max-height: none;
  overflow: hidden;
  box-sizing: border-box;
}

.policy-open-add-dialog .el-dialog__footer {
  flex-shrink: 0;
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-lighter);
}

/* Tooltip 挂载到 body，需非 scoped */
.policy-open-add__remark-tooltip {
  max-width: 440px !important;
}

.policy-open-add__remark-tooltip .policy-open-add__tip-multiline {
  white-space: pre-line;
  line-height: 1.55;
  font-size: 12px;
}

.policy-open-add__port-tooltip {
  max-width: 400px !important;
}

.policy-open-add__port-tooltip .policy-open-add__tip-multiline {
  white-space: pre-line;
  line-height: 1.55;
  font-size: 12px;
}

.policy-open-add__verify-tooltip {
  max-width: 420px !important;
}

.policy-open-add__verify-tooltip .policy-open-add__tip-multiline {
  white-space: pre-line;
  line-height: 1.5;
  font-size: 12px;
}
</style>
