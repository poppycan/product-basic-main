<script setup lang="ts">
/**
 * NAT 开通：布局与交互对齐 PolicyChangeOpen.vue，按产品需求展示 NAT 专用字段。
 */
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import {
  CopyDocument,
  Delete,
  Download,
  Filter,
  InfoFilled,
  Plus,
  QuestionFilled,
  RefreshRight,
  WarningFilled,
} from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { mockDeviceTree } from '@/api/mock/security-policy';
import PageHeader from '@/components/PageHeader.vue';
import PageContent from '@/components/PageContent.vue';
import PolicyChangeHeaderBreadcrumb from '@/components/PolicyChangeHeaderBreadcrumb.vue';
import PolicyChangeHeaderActions from '@/components/PolicyChangeHeaderActions.vue';
import DialogPrototypeDoc from '@/components/DialogPrototypeDoc.vue';
import DeviceTreeSingle from '@/components/设备树.单选.vue';
import TimeFilterBar from '@/components/TimeFilterBar.vue';
import TableColumnSettingPopover from '@/components/TableColumnSettingPopover.vue';
import { useTableColumnSettings } from '@/composables/useTableColumnSettings';
import type { ColumnDef, ColumnFieldDef } from '@/types/table-column-setting';
import { MultiLineTableCell, TableCellFieldRow } from '@/components/multi-line-table-cell';
import type {
  NatAddrType,
  NatDeviceOption,
  NatDnatConvert,
  NatExecStatus,
  NatMode,
  NatOpenFormState,
  NatOpenListRow,
  NatPosition,
  NatRowStatus,
  NatSnatConvert,
} from '@/types/nat-policy-open';
import { defaultNatFormState } from '@/types/nat-policy-open';
import type { MultiLineField } from '@/types/multi-line-table-cell';
import NatTablePickerField from '@/components/NatTablePickerField.vue';
import NatIpKindField from '@/components/NatIpKindField.vue';
import {
  MOCK_VR_LIST,
  MOCK_ZONE_LIST,
  MOCK_SERVICE_LIST,
  MOCK_IFACE_LIST,
  MOCK_SECURITY_ZONE_LIST,
  MOCK_POSITION_REF_IDS,
} from '@/api/mock/nat-form-pickers';
import { validateNatIpFieldValue } from '@/utils/nat-ip-validate';

const PAGE_SIZE = 10;

const NAT_OPEN_DEFAULT_FIELDS: Record<string, ColumnFieldDef[]> = {
  device: [
    { key: 'deviceName', label: '设备名称', visible: true },
    { key: 'deviceIp', label: '设备IP', visible: true },
  ],
  idVr: [
    { key: 'policyId', label: '策略ID', visible: true },
    { key: 'vr', label: 'VR', visible: true },
  ],
  modeType: [
    { key: 'mode', label: '模式', visible: true },
    { key: 'natType', label: '类型', visible: true },
  ],
  srcInfo: [
    { key: 'zone', label: '域', visible: true },
    { key: 'ip', label: 'IP', visible: true },
  ],
  dstInfo: [
    { key: 'zone', label: '域', visible: true },
    { key: 'ip', label: 'IP', visible: true },
  ],
  iface: [
    { key: 'inIf', label: '入接口', visible: true },
    { key: 'outIf', label: '出接口', visible: true },
    { key: 'bnatIf', label: 'BNAT接口', visible: true },
  ],
  bnatAddr: [
    { key: 'virtualIp', label: '虚拟IP', visible: true },
    { key: 'realIp', label: '真实IP', visible: true },
  ],
  snatConverted: [
    { key: 'convert', label: '转换方式', visible: true },
    { key: 'ip', label: '地址', visible: true },
  ],
  dnatConverted: [
    { key: 'convert', label: '转换方式', visible: true },
    { key: 'ip', label: '地址', visible: true },
  ],
  execStatus: [
    { key: 'tag', label: '状态', visible: true },
    { key: 'time', label: '执行时间', visible: true },
  ],
  createdInfo: [
    { key: 'by', label: '创建人', visible: true },
    { key: 'at', label: '创建时间', visible: true },
  ],
  updatedInfo: [
    { key: 'by', label: '修改人', visible: true },
    { key: 'at', label: '修改时间', visible: true },
  ],
};

function cloneNatOpenFields(key: string): ColumnFieldDef[] | undefined {
  const defs = NAT_OPEN_DEFAULT_FIELDS[key];
  return defs ? defs.map((f) => ({ ...f })) : undefined;
}

const NAT_OPEN_DEFAULT_COLUMN_DEFS: ColumnDef[] = [
  { key: 'device', label: '设备', visible: true, fixed: false, order: 0, fields: cloneNatOpenFields('device') },
  { key: 'idVr', label: 'ID / VR', visible: true, fixed: false, order: 1, fields: cloneNatOpenFields('idVr') },
  { key: 'modeType', label: '模式/类型', visible: true, fixed: false, order: 2, fields: cloneNatOpenFields('modeType') },
  { key: 'srcInfo', label: '源信息', visible: true, fixed: false, order: 3, fields: cloneNatOpenFields('srcInfo') },
  { key: 'dstInfo', label: '目的信息', visible: true, fixed: false, order: 4, fields: cloneNatOpenFields('dstInfo') },
  { key: 'service', label: '服务', visible: true, fixed: false, order: 5 },
  { key: 'iface', label: '接口', visible: true, fixed: false, order: 6, fields: cloneNatOpenFields('iface') },
  { key: 'securityZone', label: '安全域', visible: true, fixed: false, order: 7 },
  { key: 'bnatAddr', label: 'BNAT地址', visible: true, fixed: false, order: 8, fields: cloneNatOpenFields('bnatAddr') },
  { key: 'snatConverted', label: '转换后源信息', visible: true, fixed: false, order: 9, fields: cloneNatOpenFields('snatConverted') },
  { key: 'dnatConverted', label: '转换后目的信息', visible: true, fixed: false, order: 10, fields: cloneNatOpenFields('dnatConverted') },
  { key: 'translatedPort', label: '转换端口', visible: true, fixed: false, order: 11 },
  { key: 'position', label: '位置', visible: true, fixed: false, order: 12 },
  { key: 'execStatus', label: '执行状态', visible: true, fixed: false, order: 13, fields: cloneNatOpenFields('execStatus') },
  { key: 'description', label: '描述', visible: true, fixed: false, order: 14 },
  { key: 'createdInfo', label: '创建信息', visible: true, fixed: false, order: 15, fields: cloneNatOpenFields('createdInfo') },
  { key: 'updatedInfo', label: '修改信息', visible: true, fixed: false, order: 16, fields: cloneNatOpenFields('updatedInfo') },
  { key: 'operation', label: '操作', visible: true, fixed: 'right', order: 17 },
];

const natOpenColumnSettings = reactive(
  useTableColumnSettings(NAT_OPEN_DEFAULT_COLUMN_DEFS, {
    templatesKey: 'policyChangeNatOpen.columnTemplates',
    defaultOverrideKey: 'policyChangeNatOpen.columnDefaultOverride',
  }),
);

/** 列表创建人/修改人：原型固定 mock */
const MOCK_USER = 'admin';

type StatKey = 'all' | 'incomplete' | 'completed' | 'cancelled';

/** 设备树选中设备 id；null 表示不按设备过滤 */
const selectedDeviceId = ref<string | null>(null);

function deviceOptionFromTreeId(id: string | null): NatDeviceOption | null {
  if (!id) return null;
  for (const g of mockDeviceTree) {
    const d = g.children.find((c) => c.id === id);
    if (d) return { id: String(d.id), name: d.name ?? '', ip: d.ip ?? '' };
  }
  return null;
}

const flatDeviceOptions = computed((): NatDeviceOption[] => {
  const out: NatDeviceOption[] = [];
  for (const g of mockDeviceTree) {
    for (const c of g.children) {
      out.push({ id: String(c.id), name: c.name ?? '', ip: c.ip ?? '' });
    }
  }
  return out;
});

const NAT_MODE_OPTIONS: { label: string; value: NatMode }[] = [
  { label: 'SNAT', value: 'SNAT' },
  { label: 'DNAT', value: 'DNAT' },
  { label: 'NAPT', value: 'DNAPT' },
  { label: 'BNAT', value: 'BNAT' },
];

const NAT_TYPE_OPTIONS = [
  { label: 'NAT', value: 'NAT' },
  { label: 'NAT46', value: 'NAT46' },
  { label: 'NAT64', value: 'NAT64' },
];

const vrPickerRows = MOCK_VR_LIST.map((r) => ({ name: r.name }));
const zonePickerRows = MOCK_ZONE_LIST.map((r) => ({ name: r.name }));
const servicePickerRows = MOCK_SERVICE_LIST.map((r) => ({ name: r.name }));
const ifacePickerRows = MOCK_IFACE_LIST.map((r) => ({ name: r.name }));
const securityZonePickerRows = MOCK_SECURITY_ZONE_LIST.map((r) => ({ name: r.name }));
const positionRefPickerRows = MOCK_POSITION_REF_IDS.map((r) => ({ name: r.name }));

const POSITION_RADIO_OPTIONS: { label: string; value: NatPosition }[] = [
  { label: '置顶', value: 'top' },
  { label: '置底', value: 'bottom' },
  { label: '指定ID前', value: 'before' },
  { label: '指定ID后', value: 'after' },
];

const EXEC_STATUS_FILTER_OPTIONS: { label: string; value: '' | NatExecStatus }[] = [
  { label: '全部', value: '' },
  { label: '待下发', value: '待下发' },
  { label: '下发成功', value: '下发成功' },
  { label: '下发失败', value: '下发失败' },
  { label: '回撤成功', value: '回撤成功' },
  { label: '回撤失败', value: '回撤失败' },
];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function formatDateTime(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** 默认不选时间：空表示不按创建时间过滤 */
const dateRange = ref<[Date, Date] | null>(null);

const statFilter = ref<StatKey>('all');

/** 主行：模式、ID、VR、描述 */
const qMode = ref<NatMode | ''>('');
const qPolicyId = ref('');
const qVr = ref('');
const qDesc = ref('');
const moreFilterVisible = ref(false);

const STATUS_FILTER_OPTIONS: { label: string; value: '' | NatRowStatus }[] = [
  { label: '全部', value: '' },
  { label: '未完成', value: 'incomplete' },
  { label: '已完成', value: 'completed' },
  { label: '已取消', value: 'cancelled' },
];

/** 更多查询（不含设备；设备仅设备树过滤） */
const qSearchStatus = ref<'' | NatRowStatus>('');
const qSrcZone = ref('');
const qSrcIp = ref('');
const qDstZone = ref('');
const qDstIp = ref('');
const qService = ref('');
const qInIf = ref('');
const qOutIf = ref('');
const qBnatIf = ref('');
const qSecurityZone = ref('');
const qNatType = ref<NatAddrType | ''>('');
const qPositionRef = ref('');
const qExecStatus = ref<'' | NatExecStatus>('');

/** 示例数据：5 条分别对应 待下发 / 下发成功 / 下发失败 / 回撤成功 / 回撤失败（校验触发） */
function buildMockRows(): NatOpenListRow[] {
  const t = new Date();
  return [
    {
      id: 'nat-demo-1',
      deviceId: 'fw-1',
      rowStatus: 'incomplete',
      deviceName: 'FG-101C',
      deviceIp: '10.0.1.101',
      mode: 'SNAT',
      natType: 'NAT',
      idMode: 'system',
      policyIdDisplay: '系统分配',
      policySourcePreview:
        '# NAT 命令预览（示例）\nmode SNAT\nvr trust-vr\ndevice FG-101C 10.0.1.101\nsrc-zone trust\nsrc-ip 192.168.1.0/24\n…',
      vr: 'trust-vr',
      srcZone: 'trust',
      srcIp: '192.168.1.0/24',
      dstZone: 'untrust',
      dstIp: 'any',
      service: 'any',
      inIf: 'ethernet0/0',
      outIf: 'ethernet0/1',
      bnatIf: '',
      securityZone: '',
      snatConvert: 'specifiedIp',
      snatIp: '203.0.113.1/32',
      dnatConvert: 'none',
      dnatIp: '',
      translatedPort: '',
      position: 'top',
      positionRef: '',
      execStatus: '待下发',
      execTime: formatDateTime(t),
      verifyNeedManual: false,
      description: '示例：已保存，尚未下发',
      createdBy: MOCK_USER,
      updatedBy: MOCK_USER,
      createdAt: new Date(t.getTime() - 1800000),
      updatedAt: new Date(t.getTime() - 1800000),
    },
    {
      id: 'nat-demo-2',
      deviceId: 'fw-3',
      rowStatus: 'completed',
      deviceName: '网间-亚信',
      deviceIp: '192.168.10.15',
      mode: 'DNAPT',
      natType: 'NAT',
      idMode: 'system',
      policyIdDisplay: 'ID：1001',
      policySourcePreview:
        '# NAT 命令预览（示例）\nmode DNAPT\nvr trust-vr\nservice TCP_443\ndnat specifiedIp\ndnat-ip 10.1.1.1/32\nport 8443\n…',
      vr: 'trust-vr',
      srcZone: 'any',
      srcIp: 'any',
      dstZone: '',
      dstIp: '192.168.20.1/32',
      service: 'TCP_443',
      inIf: '',
      outIf: '',
      bnatIf: '',
      securityZone: '',
      snatConvert: 'none',
      snatIp: '',
      dnatConvert: 'specifiedIp',
      dnatIp: '10.1.1.1/32',
      translatedPort: '8443',
      position: 'before',
      positionRef: '12',
      execStatus: '下发成功',
      execTime: formatDateTime(new Date(t.getTime() - 7200000)),
      verifyNeedManual: false,
      description: '示例：设备已确认策略生效',
      createdBy: MOCK_USER,
      updatedBy: MOCK_USER,
      createdAt: new Date(t.getTime() - 86400000),
      updatedAt: new Date(t.getTime() - 7200000),
    },
    {
      id: 'nat-demo-3',
      deviceId: 'fw-2',
      rowStatus: 'incomplete',
      deviceName: 'FG-102A',
      deviceIp: '10.0.1.102',
      mode: 'DNAT',
      natType: 'NAT',
      idMode: 'custom',
      policyIdDisplay: 'ID：88',
      policySourcePreview:
        '# NAT 命令预览（示例）\nmode DNAT\nvr trust-vr\ndst-ip 203.0.113.10/32\nservice TCP_443\n…',
      vr: 'trust-vr',
      srcZone: 'any',
      srcIp: 'any',
      dstZone: '',
      dstIp: '203.0.113.10/32',
      service: 'TCP_443',
      inIf: '',
      outIf: '',
      bnatIf: '',
      securityZone: '',
      snatConvert: 'none',
      snatIp: '',
      dnatConvert: 'specifiedIp',
      dnatIp: '192.168.10.5/32',
      translatedPort: '',
      position: 'bottom',
      positionRef: '',
      execStatus: '下发失败',
      execTime: formatDateTime(new Date(t.getTime() - 3600000)),
      verifyNeedManual: true,
      description: '示例：设备返回错误，需修正后重试',
      createdBy: MOCK_USER,
      updatedBy: MOCK_USER,
      createdAt: new Date(t.getTime() - 86400000 * 2),
      updatedAt: new Date(t.getTime() - 86400000 * 2),
    },
    {
      id: 'nat-demo-4',
      deviceId: 'fw-1',
      rowStatus: 'completed',
      deviceName: 'FG-101C',
      deviceIp: '10.0.1.101',
      mode: 'BNAT',
      natType: 'NAT',
      idMode: 'system',
      policyIdDisplay: 'ID：200',
      policySourcePreview:
        '# NAT 命令预览（示例）\nmode BNAT\nvr trust-vr\ninterface ethernet0/0\nvirtual 10.233.146.84/32\nreal 192.168.4.0/32\n…',
      vr: 'trust-vr',
      srcZone: '',
      srcIp: '',
      dstZone: '',
      dstIp: '',
      service: '',
      inIf: '',
      outIf: '',
      bnatIf: 'ethernet0/0',
      virtualIp: '10.233.146.84/32',
      realIp: '192.168.4.0/32',
      securityZone: 'untrust',
      snatConvert: 'none',
      snatIp: '',
      dnatConvert: 'none',
      dnatIp: '',
      translatedPort: '',
      position: 'top',
      positionRef: '',
      execStatus: '回撤成功',
      execTime: formatDateTime(new Date(t.getTime() - 86400000 * 3)),
      verifyNeedManual: false,
      description: '示例：回撤指令已执行，设备侧已删除',
      createdBy: MOCK_USER,
      updatedBy: MOCK_USER,
      createdAt: new Date(t.getTime() - 86400000 * 4),
      updatedAt: new Date(t.getTime() - 86400000 * 3),
    },
    {
      id: 'nat-demo-5',
      deviceId: 'fw-2',
      rowStatus: 'incomplete',
      deviceName: 'FG-102A',
      deviceIp: '10.0.1.102',
      mode: 'SNAT',
      natType: 'NAT',
      idMode: 'system',
      policyIdDisplay: 'ID：9',
      policySourcePreview:
        '# NAT 命令预览（示例）\nmode SNAT\nvr trust-vr\nsnat egressIp\n…',
      vr: 'trust-vr',
      srcZone: 'trust',
      srcIp: '10.1.0.0/24',
      dstZone: 'untrust',
      dstIp: 'any',
      service: 'any',
      inIf: 'eth0',
      outIf: 'eth1',
      bnatIf: '',
      securityZone: '',
      snatConvert: 'egressIp',
      snatIp: '',
      dnatConvert: 'none',
      dnatIp: '',
      translatedPort: '',
      position: 'top',
      positionRef: '',
      execStatus: '回撤失败',
      execTime: formatDateTime(new Date(t.getTime() - 600000)),
      verifyNeedManual: true,
      description: '示例：回撤时设备校验未通过（对象仍被引用/依赖校验失败）',
      createdBy: MOCK_USER,
      updatedBy: MOCK_USER,
      createdAt: new Date(t.getTime() - 86400000 * 5),
      updatedAt: new Date(t.getTime() - 600000),
    },
  ];
}

const mockAll = ref<NatOpenListRow[]>(buildMockRows());

function inTimeRange(row: NatOpenListRow) {
  const dr = dateRange.value;
  if (!dr || dr.length !== 2) return true;
  const [s, e] = dr;
  return row.createdAt >= s && row.createdAt <= e;
}

function matchStat(row: NatOpenListRow) {
  if (statFilter.value === 'all') return true;
  return row.rowStatus === statFilter.value;
}

function matchTreeDevice(row: NatOpenListRow) {
  if (!selectedDeviceId.value) return true;
  return row.deviceId === selectedDeviceId.value;
}

/** 系统分配：仅在下发成功/回撤成功/回撤失败时可展示设备分配的 ID */
function systemIdAllowsDisplay(exec: NatExecStatus): boolean {
  return exec === '下发成功' || exec === '回撤成功' || exec === '回撤失败';
}

/** 列表「ID / VR」第一行展示文案 */
function listPolicyIdDisplay(row: NatOpenListRow): string {
  if (row.idMode === 'custom') {
    return row.policyIdDisplay;
  }
  if (row.execStatus === '待下发' || row.execStatus === '下发失败') {
    return '系统分配';
  }
  if (systemIdAllowsDisplay(row.execStatus)) {
    if (row.policyIdDisplay.startsWith('ID：')) {
      return row.policyIdDisplay;
    }
    return '系统分配';
  }
  return row.policyIdDisplay;
}

function matchQuery(row: NatOpenListRow) {
  if (qMode.value && row.mode !== qMode.value) return false;
  const pid = qPolicyId.value.trim();
  if (pid && !listPolicyIdDisplay(row).includes(pid) && !row.policyIdDisplay.includes(pid)) return false;
  const vr = qVr.value.trim();
  if (vr && !row.vr.includes(vr)) return false;
  const desc = qDesc.value.trim();
  if (desc && !row.description.includes(desc)) return false;
  const st = qSearchStatus.value;
  if (st && row.rowStatus !== st) return false;

  const sz = qSrcZone.value.trim();
  if (sz && !row.srcZone.includes(sz)) return false;
  const sip = qSrcIp.value.trim();
  if (sip && !row.srcIp.includes(sip)) return false;
  const dz = qDstZone.value.trim();
  if (dz && !(row.dstZone || '').includes(dz)) return false;
  const dip = qDstIp.value.trim();
  if (dip && !row.dstIp.includes(dip)) return false;
  const svc = qService.value.trim();
  if (svc && !(row.service || '').includes(svc)) return false;
  const inf = qInIf.value.trim();
  if (inf && !(row.inIf || '').includes(inf)) return false;
  const ouf = qOutIf.value.trim();
  if (ouf && !(row.outIf || '').includes(ouf)) return false;
  const bif = qBnatIf.value.trim();
  if (bif && !(row.bnatIf || '').includes(bif)) return false;
  const secz = qSecurityZone.value.trim();
  if (secz && !(row.securityZone || '').includes(secz)) return false;
  const nt = qNatType.value;
  if (nt && row.natType !== nt) return false;
  const pref = qPositionRef.value.trim();
  if (pref && !(row.positionRef || '').includes(pref)) return false;
  const ex = qExecStatus.value;
  if (ex && row.execStatus !== ex) return false;
  return true;
}

const rowsInTimeAndTree = computed(() =>
  mockAll.value.filter((row) => inTimeRange(row) && matchTreeDevice(row)),
);

const statCounts = computed(() => {
  const inRange = rowsInTimeAndTree.value;
  return {
    all: inRange.length,
    incomplete: inRange.filter((r) => r.rowStatus === 'incomplete').length,
    completed: inRange.filter((r) => r.rowStatus === 'completed').length,
    cancelled: inRange.filter((r) => r.rowStatus === 'cancelled').length,
  };
});

const filteredRows = computed(() =>
  mockAll.value.filter(
    (row) =>
      inTimeRange(row) && matchTreeDevice(row) && matchStat(row) && matchQuery(row),
  ),
);

const currentPage = ref(1);

watch([filteredRows, statFilter, dateRange, selectedDeviceId], () => {
  currentPage.value = 1;
});

type PagedRow = (NatOpenListRow & { __empty: false }) | { __empty: true };

const pagedRows = computed((): PagedRow[] => {
  const list = filteredRows.value;
  const start = (currentPage.value - 1) * PAGE_SIZE;
  const slice = list.slice(start, start + PAGE_SIZE);
  const out: PagedRow[] = slice.map((r) => ({ ...r, __empty: false as const }));
  while (out.length < PAGE_SIZE) out.push({ __empty: true });
  return out;
});

function indexMethod(index: number) {
  return (currentPage.value - 1) * PAGE_SIZE + index + 1;
}

function execStatusTagType(
  s: NatExecStatus,
): 'info' | 'success' | 'danger' | 'warning' {
  const m: Record<NatExecStatus, 'info' | 'success' | 'danger' | 'warning'> = {
    待下发: 'info',
    下发成功: 'success',
    下发失败: 'danger',
    回撤成功: 'success',
    回撤失败: 'warning',
  };
  return m[s] ?? 'info';
}

const tableRef = ref();
const selectedRows = ref<NatOpenListRow[]>([]);
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

function rowClassName({ row }: { row: NatOpenListRow & { __empty?: boolean } }) {
  return row && (row as { __empty?: boolean }).__empty ? 'is-empty-row' : '';
}

function selectableRow(row: NatOpenListRow & { __empty?: boolean }) {
  return !(row as { __empty?: boolean }).__empty;
}

function onSelectionChange(rows: NatOpenListRow[]) {
  selectedRows.value = rows.filter((r) => !(r as { __empty?: boolean }).__empty);
}

function clearQuery() {
  qMode.value = '';
  qPolicyId.value = '';
  qVr.value = '';
  qDesc.value = '';
  qSearchStatus.value = '';
  qSrcZone.value = '';
  qSrcIp.value = '';
  qDstZone.value = '';
  qDstIp.value = '';
  qService.value = '';
  qInIf.value = '';
  qOutIf.value = '';
  qBnatIf.value = '';
  qSecurityZone.value = '';
  qNatType.value = '';
  qPositionRef.value = '';
  qExecStatus.value = '';
}

function applyQuery() {
  currentPage.value = 1;
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

/** —— 页面说明（UI 规范 §2） —— */
const pageDocVisible = ref(false);
const pageDocContent = ref('');
const pageDocLoading = ref(false);
const PAGE_DOC_URL = '/docs/pages/policy-change/nat-open.md';

async function loadPageDoc() {
  pageDocContent.value = '';
  pageDocLoading.value = true;
  try {
    const res = await fetch(PAGE_DOC_URL);
    pageDocContent.value = res.ok ? await res.text() : '# 暂无说明\n当前页面暂无说明文档。';
  } catch {
    pageDocContent.value = '# 暂无说明\n当前页面暂无说明文档。';
  } finally {
    pageDocLoading.value = false;
  }
}

function openPageDoc() {
  pageDocVisible.value = true;
}

watch(pageDocVisible, (v) => {
  if (v) void loadPageDoc();
});

/** —— 添加 / 编辑弹窗 —— */
const addVisible = ref(false);
const editingRowId = ref<string | null>(null);
/** 编辑弹窗：仅待下发、下发失败可编辑表单 */
const editFormReadonly = ref(false);
const form = ref<NatOpenFormState>(defaultNatFormState());
const commandText = ref('');
/** BNAT 专用：虚拟/真实 IP（未并入 NatOpenFormState，避免与其它模式混用） */
const virtualIp = ref('');
const realIp = ref('');

function resetForm() {
  form.value = defaultNatFormState();
  commandText.value = '';
  editingRowId.value = null;
  editFormReadonly.value = false;
  virtualIp.value = '';
  realIp.value = '';
}

watch(addVisible, (open) => {
  if (!open) resetForm();
});

const devicePickerRows = computed(() =>
  flatDeviceOptions.value.map((d) => ({
    id: d.id,
    name: d.name,
    ip: d.ip,
  })),
);

const devicePickerModel = computed({
  get: () => form.value.device?.id ?? '',
  set: (id: string) => {
    if (!id) {
      form.value.device = null;
      selectedDeviceId.value = null;
      refreshCommand();
      return;
    }
    const d = flatDeviceOptions.value.find((x) => x.id === id);
    if (d) {
      form.value.device = { ...d };
      selectedDeviceId.value = d.id;
      refreshCommand();
    }
  },
});

function showSrcBlock(mode: NatMode) {
  return mode !== 'BNAT' && mode !== 'DNAPT';
}

function showDstZone(mode: NatMode) {
  return mode === 'SNAT';
}

function showDstIp(mode: NatMode) {
  return mode !== 'BNAT';
}

function showService(mode: NatMode) {
  return mode !== 'BNAT';
}

function showInOutIf(mode: NatMode) {
  return mode === 'SNAT';
}

function showBnatIf(mode: NatMode) {
  return mode === 'BNAT';
}

function showSecurityZone(mode: NatMode) {
  return mode === 'BNAT';
}

function showSnatBlock(mode: NatMode) {
  return mode === 'SNAT';
}

function showDnatBlock(mode: NatMode) {
  return mode === 'DNAT' || mode === 'DNAPT';
}

function showNaptPort(mode: NatMode) {
  return mode === 'DNAPT';
}

/** NAPT（内部 DNAPT）：在原始数据中补充可选的源安全域、源地址 */
function showNaptSrcSupplement(mode: NatMode) {
  return mode === 'DNAPT';
}

function modeDisplayLabel(mode: NatMode): string {
  return mode === 'DNAPT' ? 'NAPT' : mode;
}

/** 列表「转换后源信息」首行：与表单 SNAT 转换方式文案一致 */
function snatConvertLabel(c: NatSnatConvert): string {
  const m: Record<NatSnatConvert, string> = {
    egressIp: '出接口IP（IPv4）',
    specifiedIp: '指定IP',
    none: '不转换',
  };
  return m[c] ?? String(c);
}

/** 列表「转换后目的信息」首行：与表单 DNAT 转换方式文案一致 */
function dnatConvertLabel(c: NatDnatConvert): string {
  const m: Record<NatDnatConvert, string> = {
    specifiedIp: '指定IP',
    none: '不转换',
  };
  return m[c] ?? String(c);
}

function refreshCommand() {
  const f = form.value;
  const lines: string[] = ['# NAT 命令预览（示例）', `mode ${f.mode}`, `type ${f.natType}`, `vr ${f.vr || '(未选)'}`];
  if (f.device) lines.push(`device ${f.device.name} ${f.device.ip}`);
  if (showSrcBlock(f.mode)) {
    lines.push(`src-zone ${f.srcZone || 'any'}`, `src-ip ${f.srcIp || 'any'}`);
  }
  if (showNaptSrcSupplement(f.mode)) {
    lines.push(`src-zone ${f.srcZone || 'any'}`, `src-ip ${f.srcIp || 'any'}`);
  }
  if (showDstZone(f.mode)) lines.push(`dst-zone ${f.dstZone || 'any'}`);
  if (showDstIp(f.mode)) lines.push(`dst-ip ${f.dstIp || 'any'}`);
  if (showService(f.mode)) lines.push(`service ${f.service || 'any'}`);
  if (showInOutIf(f.mode)) {
    lines.push(`in-if ${f.inIf || 'any'}`, `out-if ${f.outIf || 'any'}`);
  }
  if (showBnatIf(f.mode)) {
    lines.push(`interface ${f.bnatIf || 'any'}`);
    lines.push(`virtual ${virtualIp.value || '(未填)'}`, `real ${realIp.value || '(未填)'}`);
  }
  if (showSecurityZone(f.mode)) lines.push(`security-zone ${f.securityZone || 'any'}`);
  if (showSnatBlock(f.mode)) {
    lines.push(`snat ${f.snatConvert}`, `snat-ip ${f.snatIp || '-'}`);
  }
  if (showDnatBlock(f.mode)) {
    lines.push(`dnat ${f.dnatConvert}`, `dnat-ip ${f.dnatIp || '-'}`);
  }
  if (showNaptPort(f.mode)) lines.push(`port ${f.translatedPort || '-'}`);
  lines.push(`position ${f.position} ${f.positionRef || ''}`.trim());
  lines.push(`description ${f.description || ''}`);
  commandText.value = lines.join('\n');
}

watch(
  form,
  () => {
    refreshCommand();
  },
  { deep: true },
);

watch([virtualIp, realIp], () => refreshCommand());

watch(
  () => form.value.device?.id,
  (id) => {
    if (!addVisible.value || !id) return;
    if (selectedDeviceId.value !== id) selectedDeviceId.value = id;
  },
);

watch(selectedDeviceId, (id) => {
  if (!addVisible.value || editFormReadonly.value) return;
  if (!id) return;
  const opt = deviceOptionFromTreeId(id);
  if (opt && form.value.device?.id !== opt.id) {
    form.value.device = { ...opt };
    refreshCommand();
  }
});

watch(
  () => form.value.mode,
  (m) => {
    if (m !== 'BNAT') {
      virtualIp.value = '';
      realIp.value = '';
    }
  },
);

function openAddDialog() {
  editingRowId.value = null;
  editFormReadonly.value = false;
  form.value = defaultNatFormState();
  virtualIp.value = '';
  realIp.value = '';
  const d = deviceOptionFromTreeId(selectedDeviceId.value);
  if (d) form.value.device = d;
  addVisible.value = true;
  void nextTick(() => refreshCommand());
}

function listRowToForm(row: NatOpenListRow): NatOpenFormState {
  return {
    device: { id: row.deviceId, name: row.deviceName, ip: row.deviceIp },
    mode: row.mode,
    natType: row.natType,
    idMode: row.idMode,
    customId: row.idMode === 'custom' ? row.policyIdDisplay.replace(/^ID：/, '') : '',
    vr: row.vr,
    srcZone: row.srcZone || 'any',
    srcIp: row.srcIp,
    dstZone: row.dstZone || 'any',
    dstIp: row.dstIp,
    service: row.service || 'any',
    inIf: row.inIf,
    outIf: row.outIf,
    bnatIf: row.bnatIf,
    securityZone: row.securityZone || 'any',
    snatConvert: row.snatConvert,
    snatIp: row.snatIp,
    dnatConvert: row.dnatConvert,
    dnatIp: row.dnatIp,
    translatedPort: row.translatedPort,
    position: row.position,
    positionRef: row.positionRef,
    description: row.description,
  };
}

function openEdit(row: NatOpenListRow) {
  editingRowId.value = row.id;
  editFormReadonly.value = !(row.execStatus === '待下发' || row.execStatus === '下发失败');
  form.value = listRowToForm(row);
  virtualIp.value = row.virtualIp ?? '';
  realIp.value = row.realIp ?? '';
  addVisible.value = true;
  void nextTick(() => refreshCommand());
}

function showDeployOp(s: NatExecStatus) {
  return s === '待下发' || s === '下发失败';
}

function showRollbackOp(s: NatExecStatus) {
  return s === '下发成功' || s === '回撤失败';
}

function validateForm(): boolean {
  const f = form.value;
  if (!f.device) {
    ElMessage.warning('请选择设备');
    return false;
  }
  if (!f.vr.trim()) {
    ElMessage.warning('请选择 VR');
    return false;
  }
  if (showSrcBlock(f.mode) && !validateNatIpFieldValue(f.srcIp)) {
    ElMessage.warning('请正确填写源地址（对象 / 单 IP / IP 掩码）');
    return false;
  }
  if (f.mode === 'DNAPT' && f.srcIp.trim() && !validateNatIpFieldValue(f.srcIp)) {
    ElMessage.warning('请正确填写源地址');
    return false;
  }
  if (showDstIp(f.mode) && !validateNatIpFieldValue(f.dstIp)) {
    ElMessage.warning('请正确填写目的地址');
    return false;
  }
  if (showBnatIf(f.mode) && !f.bnatIf.trim()) {
    ElMessage.warning('请选择接口');
    return false;
  }
  if (showSnatBlock(f.mode) && f.snatConvert === 'specifiedIp' && !validateNatIpFieldValue(f.snatIp)) {
    ElMessage.warning('请正确填写转换后源地址');
    return false;
  }
  if (showDnatBlock(f.mode) && f.dnatConvert === 'specifiedIp' && !validateNatIpFieldValue(f.dnatIp)) {
    ElMessage.warning('请正确填写转换后目的地址');
    return false;
  }
  if (f.idMode === 'custom' && !f.customId.trim()) {
    ElMessage.warning('请填写自定义策略 ID');
    return false;
  }
  if ((f.position === 'before' || f.position === 'after') && !f.positionRef.trim()) {
    ElMessage.warning('请选择参照 ID');
    return false;
  }
  return true;
}

function validateFormBnat(): boolean {
  const f = form.value;
  if (f.mode !== 'BNAT') return true;
  if (!validateNatIpFieldValue(virtualIp.value) || !validateNatIpFieldValue(realIp.value)) {
    ElMessage.warning('请正确填写虚拟 IP 与真实 IP');
    return false;
  }
  return true;
}

/** 保存与「更新命令」共用：必填项 + BNAT 虚拟/真实 IP */
function validateNatFormComplete(): boolean {
  if (!validateForm()) return false;
  if (!validateFormBnat()) return false;
  return true;
}

function onSaveAdd() {
  if (!validateNatFormComplete()) return;
  const f = form.value;
  const id =
    editingRowId.value ?? `nat_${Date.now()}`;
  const policyIdDisplay =
    f.idMode === 'system' ? '系统分配' : `ID：${f.customId.trim() || '自定义'}`;
  const newRow: NatOpenListRow = {
    id,
    deviceId: f.device!.id,
    rowStatus: 'incomplete',
    deviceName: f.device!.name,
    deviceIp: f.device!.ip,
    mode: f.mode,
    natType: f.natType,
    idMode: f.idMode,
    policyIdDisplay,
    policySourcePreview: commandText.value,
    vr: f.vr,
    srcZone: f.srcZone || 'any',
    srcIp: showSrcBlock(f.mode) || f.mode === 'DNAPT' ? f.srcIp : '',
    dstZone: showDstZone(f.mode) ? f.dstZone || 'any' : '',
    dstIp: showDstIp(f.mode) ? f.dstIp : '',
    service: showService(f.mode) ? (f.service || 'any') : '',
    inIf: showInOutIf(f.mode) ? f.inIf : '',
    outIf: showInOutIf(f.mode) ? f.outIf : '',
    bnatIf: showBnatIf(f.mode) ? f.bnatIf : '',
    securityZone: showSecurityZone(f.mode) ? f.securityZone : '',
    snatConvert: showSnatBlock(f.mode) ? f.snatConvert : 'none',
    snatIp: showSnatBlock(f.mode) ? f.snatIp : '',
    dnatConvert: showDnatBlock(f.mode) ? f.dnatConvert : 'none',
    dnatIp: showDnatBlock(f.mode) ? f.dnatIp : '',
    translatedPort: showNaptPort(f.mode) ? f.translatedPort : '',
    position: f.position,
    positionRef: f.positionRef,
    execStatus: '待下发',
    execTime: formatDateTime(new Date()),
    verifyNeedManual: false,
    description: f.description,
    createdBy: MOCK_USER,
    updatedBy: MOCK_USER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  if (f.mode === 'BNAT') {
    newRow.srcIp = '';
    newRow.dstIp = '';
    newRow.virtualIp = virtualIp.value.trim();
    newRow.realIp = realIp.value.trim();
  }

  if (editingRowId.value) {
    const idx = mockAll.value.findIndex((r) => r.id === editingRowId.value);
    if (idx >= 0) {
      const prev = mockAll.value[idx]!;
      newRow.createdAt = prev.createdAt;
      newRow.createdBy = prev.createdBy;
      newRow.updatedAt = new Date();
      newRow.updatedBy = MOCK_USER;
      newRow.execStatus = prev.execStatus;
      newRow.execTime = prev.execTime;
      newRow.verifyNeedManual = prev.verifyNeedManual;
      newRow.rowStatus = prev.rowStatus;
      mockAll.value[idx] = newRow;
    }
    ElMessage.success('已保存');
  } else {
    mockAll.value.unshift(newRow);
    ElMessage.success('已保存，列表已新增条目');
  }
  addVisible.value = false;
}

function updateCommandBtn() {
  if (!validateNatFormComplete()) return;
  refreshCommand();
  ElMessage.success('命令已更新');
}

async function copyCommand() {
  try {
    await navigator.clipboard.writeText(commandText.value);
    ElMessage.success('已复制到剪贴板');
  } catch {
    ElMessage.warning('复制失败');
  }
}

function downloadCommand() {
  const blob = new Blob([commandText.value], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'nat-command-preview.txt';
  a.click();
  URL.revokeObjectURL(url);
  ElMessage.success('已下载');
}

const deployVisible = ref(false);
const deployRow = ref<NatOpenListRow | null>(null);
const deployMode = ref<'now' | 'schedule'>('now');
const deployScheduleAt = ref('');

function openDeploy(row: NatOpenListRow) {
  deployRow.value = row;
  deployMode.value = 'now';
  deployScheduleAt.value = '';
  deployVisible.value = true;
}

function confirmDeploy() {
  if (deployMode.value === 'schedule' && !deployScheduleAt.value) {
    ElMessage.warning('请选择定时时间');
    return;
  }
  ElMessage.success(deployMode.value === 'now' ? '已提交立即下发（原型）' : '已提交定时下发（原型）');
  deployVisible.value = false;
}

async function openRollback(row: NatOpenListRow) {
  try {
    await ElMessageBox.confirm('确定对该 NAT 条目发起回撤？', '回撤', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    });
    row.execStatus = '回撤成功';
    row.execTime = formatDateTime(new Date());
    ElMessage.success('回撤已提交（原型）');
  } catch {
    /* cancel */
  }
}

async function onDeleteRow(row: NatOpenListRow) {
  try {
    await ElMessageBox.confirm('确定删除该 NAT 开通条目？', '删除', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    });
    mockAll.value = mockAll.value.filter((r) => r.id !== row.id);
    ElMessage.success('已删除');
  } catch {
    /* cancel */
  }
}

function onManualVerify(row: NatOpenListRow) {
  row.verifyNeedManual = false;
  ElMessage.success('校验成功（原型）');
}

function isBlank(s: string | undefined): boolean {
  return !s || !String(s).trim();
}

function natIdVrColumnSpare(row: NatOpenListRow): boolean {
  return isBlank(listPolicyIdDisplay(row)) || isBlank(row.vr);
}

function positionLine1(row: NatOpenListRow): string {
  const labels: Record<NatOpenListRow['position'], string> = {
    top: '置顶',
    bottom: '置底',
    before: '指定ID前',
    after: '指定ID后',
  };
  return labels[row.position];
}

function positionLine2(row: NatOpenListRow): string {
  if ((row.position === 'before' || row.position === 'after') && row.positionRef?.trim()) {
    return `指定ID：${row.positionRef.trim()}`;
  }
  return '';
}

function positionFields(row: NatOpenListRow): MultiLineField[] {
  const lines: MultiLineField[] = [{ text: positionLine1(row) }];
  if (row.position === 'before' || row.position === 'after') {
    lines.push({ text: positionLine2(row) });
  }
  return lines;
}
</script>

<template>
  <section class="policy-page policy-open policy-nat-open">
    <PageHeader variant="simple">
      <template #breadcrumb>
        <PolicyChangeHeaderBreadcrumb />
      </template>
      <template #actions>
        <div class="policy-open__header-actions">
          <PolicyChangeHeaderActions />
          <ElButton size="small" :icon="InfoFilled" @click="openPageDoc">页面说明</ElButton>
        </div>
      </template>
    </PageHeader>

    <ElDialog
      v-model="pageDocVisible"
      title="页面说明"
      width="640px"
      class="page-doc-dialog"
      append-to-body
    >
      <div v-loading="pageDocLoading" class="page-doc-body">
        <pre class="page-doc-markdown">{{ pageDocContent }}</pre>
      </div>
    </ElDialog>

    <PageContent class="policy-open__content policy-nat-open__page-content">
      <div class="policy-nat-open__layout-root">
        <DeviceTreeSingle v-model:selected-id="selectedDeviceId" title="设备" />
        <div class="policy-open__scroll-body policy-nat-open__main">
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
          <ElSelect v-model="qMode" clearable class="policy-open__filter-select" placeholder="模式">
            <ElOption v-for="o in NAT_MODE_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
          </ElSelect>
          <ElInput v-model="qPolicyId" clearable class="policy-open__filter-input" placeholder="ID" />
          <div class="policy-open__filter-input">
            <NatTablePickerField
              v-model="qVr"
              :rows="vrPickerRows"
              row-key="name"
              display-key="name"
              :columns="[{ prop: 'name', label: 'VR 名称', minWidth: 160 }]"
              placeholder="点击选择 VR"
              dialog-title="VR"
              :search-keys="['name']"
            />
          </div>
          <ElInput v-model="qDesc" clearable class="policy-open__filter-input" placeholder="描述" />
          <ElPopover
            v-model:visible="moreFilterVisible"
            placement="bottom-start"
            :width="360"
            trigger="click"
          >
            <template #reference>
              <ElButton class="policy-open__filter-icon" :icon="Filter" circle title="更多查询" />
            </template>
            <div class="policy-open__more-pop policy-nat-open__more-pop">
              <div class="policy-open__more-row">
                <span class="policy-open__more-label">业务状态</span>
                <ElSelect v-model="qSearchStatus" clearable placeholder="未完成/已完成/已取消" style="width: 100%">
                  <ElOption
                    v-for="o in STATUS_FILTER_OPTIONS"
                    :key="String(o.value)"
                    :label="o.label"
                    :value="o.value"
                  />
                </ElSelect>
              </div>
              <div class="policy-open__more-row">
                <span class="policy-open__more-label">执行状态</span>
                <ElSelect v-model="qExecStatus" clearable placeholder="执行状态" style="width: 100%">
                  <ElOption
                    v-for="o in EXEC_STATUS_FILTER_OPTIONS"
                    :key="String(o.value)"
                    :label="o.label"
                    :value="o.value"
                  />
                </ElSelect>
              </div>
              <div class="policy-open__more-row">
                <span class="policy-open__more-label">类型</span>
                <ElSelect v-model="qNatType" clearable placeholder="NAT/NAT46/NAT64" style="width: 100%">
                  <ElOption v-for="o in NAT_TYPE_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
                </ElSelect>
              </div>
              <div class="policy-open__more-row">
                <span class="policy-open__more-label">源安全域</span>
                <NatTablePickerField
                  v-model="qSrcZone"
                  :rows="zonePickerRows"
                  row-key="name"
                  display-key="name"
                  :columns="[{ prop: 'name', label: '名称', minWidth: 160 }]"
                  placeholder="点击选择源安全域"
                  dialog-title="源安全域"
                  :search-keys="['name']"
                  style="width: 100%"
                />
              </div>
              <div class="policy-open__more-row">
                <span class="policy-open__more-label">源地址</span>
                <ElInput v-model="qSrcIp" clearable placeholder="源地址" />
              </div>
              <div class="policy-open__more-row">
                <span class="policy-open__more-label">目的域</span>
                <NatTablePickerField
                  v-model="qDstZone"
                  :rows="zonePickerRows"
                  row-key="name"
                  display-key="name"
                  :columns="[{ prop: 'name', label: '名称', minWidth: 160 }]"
                  placeholder="点击选择目的域"
                  dialog-title="目的域"
                  :search-keys="['name']"
                  style="width: 100%"
                />
              </div>
              <div class="policy-open__more-row">
                <span class="policy-open__more-label">目的IP</span>
                <ElInput v-model="qDstIp" clearable placeholder="目的IP" />
              </div>
              <div class="policy-open__more-row">
                <span class="policy-open__more-label">服务</span>
                <NatTablePickerField
                  v-model="qService"
                  :rows="servicePickerRows"
                  row-key="name"
                  display-key="name"
                  :columns="[{ prop: 'name', label: '名称', minWidth: 160 }]"
                  placeholder="点击选择服务"
                  dialog-title="服务"
                  :search-keys="['name']"
                  style="width: 100%"
                />
              </div>
              <div class="policy-open__more-row">
                <span class="policy-open__more-label">入接口</span>
                <NatTablePickerField
                  v-model="qInIf"
                  :rows="ifacePickerRows"
                  row-key="name"
                  display-key="name"
                  :columns="[{ prop: 'name', label: '名称', minWidth: 160 }]"
                  placeholder="点击选择入接口"
                  dialog-title="入接口"
                  :search-keys="['name']"
                  style="width: 100%"
                />
              </div>
              <div class="policy-open__more-row">
                <span class="policy-open__more-label">出接口</span>
                <NatTablePickerField
                  v-model="qOutIf"
                  :rows="ifacePickerRows"
                  row-key="name"
                  display-key="name"
                  :columns="[{ prop: 'name', label: '名称', minWidth: 160 }]"
                  placeholder="点击选择出接口"
                  dialog-title="出接口"
                  :search-keys="['name']"
                  style="width: 100%"
                />
              </div>
              <div class="policy-open__more-row">
                <span class="policy-open__more-label">接口(BNAT)</span>
                <NatTablePickerField
                  v-model="qBnatIf"
                  :rows="ifacePickerRows"
                  row-key="name"
                  display-key="name"
                  :columns="[{ prop: 'name', label: '名称', minWidth: 160 }]"
                  placeholder="点击选择接口(BNAT)"
                  dialog-title="接口(BNAT)"
                  :search-keys="['name']"
                  style="width: 100%"
                />
              </div>
              <div class="policy-open__more-row">
                <span class="policy-open__more-label">安全域</span>
                <NatTablePickerField
                  v-model="qSecurityZone"
                  :rows="securityZonePickerRows"
                  row-key="name"
                  display-key="name"
                  :columns="[{ prop: 'name', label: '名称', minWidth: 160 }]"
                  placeholder="点击选择安全域"
                  dialog-title="安全域"
                  :search-keys="['name']"
                  style="width: 100%"
                />
              </div>
              <div class="policy-open__more-row">
                <span class="policy-open__more-label">位置参照ID</span>
                <NatTablePickerField
                  v-model="qPositionRef"
                  :rows="positionRefPickerRows"
                  row-key="name"
                  display-key="name"
                  :columns="[{ prop: 'name', label: '名称', minWidth: 160 }]"
                  placeholder="点击选择位置参照"
                  dialog-title="位置参照"
                  :search-keys="['name']"
                  style="width: 100%"
                />
              </div>
            </div>
          </ElPopover>
          <ElButton type="primary" class="policy-open__btn-primary" @click="applyQuery">查询</ElButton>
          <ElButton class="policy-open__btn-reset" @click="clearQuery">重置</ElButton>
        </div>

        <div class="table-toolbar policy-open__table-toolbar">
          <div class="policy-open__toolbar-btns">
            <ElButton type="primary" class="policy-open__btn-primary" :icon="Plus" @click="openAddDialog">
              新建
            </ElButton>
            <ElButton type="primary" class="policy-open__btn-primary" :icon="Download" @click="onExport">
              导出
            </ElButton>
            <ElButton type="danger" :icon="Delete" @click="onBatchDelete">删除</ElButton>
          </div>
          <div class="table-toolbar__right">
            <TableColumnSettingPopover :api="natOpenColumnSettings" />
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
            <ElTableColumn label="序号" type="index" width="56" fixed="left" :index="indexMethod" />
            <template v-for="col in natOpenColumnSettings.sortedColumnDefsForRender" :key="col.key">
              <ElTableColumn
                v-if="col.key === 'device'"
                :label="col.label"
                min-width="120"
                :fixed="natOpenColumnSettings.columnFixedProp(col)"
              >
                <template #default="{ row }">
                  <template v-if="!(row as { __empty?: boolean }).__empty">
                    <MultiLineTableCell
                      :fields="
                        [
                          ...(natOpenColumnSettings.isFieldVisible('device', 'deviceName')
                            ? [{ value: (row as NatOpenListRow).deviceName }]
                            : []),
                          ...(natOpenColumnSettings.isFieldVisible('device', 'deviceIp')
                            ? [{ value: (row as NatOpenListRow).deviceIp }]
                            : []),
                        ] as MultiLineField[]
                      "
                    />
                  </template>
                </template>
              </ElTableColumn>
              <ElTableColumn
                v-else-if="col.key === 'idVr'"
                :label="col.label"
                min-width="160"
                :fixed="natOpenColumnSettings.columnFixedProp(col)"
              >
                <template #default="{ row }">
                  <template v-if="!(row as { __empty?: boolean }).__empty">
                    <MultiLineTableCell :spare="natIdVrColumnSpare(row as NatOpenListRow)">
                      <TableCellFieldRow
                        v-if="natOpenColumnSettings.isFieldVisible('idVr', 'policyId')"
                        :tooltip="(row as NatOpenListRow).policySourcePreview"
                        :disable-tooltip="!listPolicyIdDisplay((row as NatOpenListRow)).includes('ID')"
                      >
                        <span class="policy-nat-open__id-hover">{{
                          listPolicyIdDisplay(row as NatOpenListRow)
                        }}</span>
                      </TableCellFieldRow>
                      <TableCellFieldRow
                        v-if="natOpenColumnSettings.isFieldVisible('idVr', 'vr')"
                        :text="`VR：${(row as NatOpenListRow).vr}`"
                      />
                    </MultiLineTableCell>
                  </template>
                </template>
              </ElTableColumn>
              <ElTableColumn
                v-else-if="col.key === 'modeType'"
                :label="col.label"
                min-width="120"
                :fixed="natOpenColumnSettings.columnFixedProp(col)"
              >
                <template #default="{ row }">
                  <div v-if="!(row as { __empty?: boolean }).__empty">
                    <MultiLineTableCell
                      :fields="
                        [
                          ...(natOpenColumnSettings.isFieldVisible('modeType', 'mode')
                            ? [{ value: modeDisplayLabel((row as NatOpenListRow).mode) }]
                            : []),
                          ...(natOpenColumnSettings.isFieldVisible('modeType', 'natType')
                            ? [{ value: (row as NatOpenListRow).natType }]
                            : []),
                        ] as MultiLineField[]
                      "
                    />
                  </div>
                </template>
              </ElTableColumn>
              <ElTableColumn
                v-else-if="col.key === 'srcInfo'"
                :label="col.label"
                min-width="160"
                :fixed="natOpenColumnSettings.columnFixedProp(col)"
              >
                <template #default="{ row }">
                  <template v-if="!(row as { __empty?: boolean }).__empty">
                    <MultiLineTableCell
                      v-if="(row as NatOpenListRow).mode === 'DNAPT'"
                      :fields="
                        [
                          ...(natOpenColumnSettings.isFieldVisible('srcInfo', 'zone')
                            ? [{ prefix: '域', value: (row as NatOpenListRow).srcZone?.trim() || 'any' }]
                            : []),
                          ...(natOpenColumnSettings.isFieldVisible('srcInfo', 'ip')
                            ? [{ value: (row as NatOpenListRow).srcIp?.trim() || 'any' }]
                            : []),
                        ] as MultiLineField[]
                      "
                    />
                    <MultiLineTableCell
                      v-else-if="(row as NatOpenListRow).mode !== 'BNAT'"
                      :fields="
                        [
                          ...(natOpenColumnSettings.isFieldVisible('srcInfo', 'zone')
                            ? [{ prefix: '域', value: (row as NatOpenListRow).srcZone?.trim() || 'any' }]
                            : []),
                          ...(natOpenColumnSettings.isFieldVisible('srcInfo', 'ip')
                            ? [{ value: (row as NatOpenListRow).srcIp?.trim() || 'any' }]
                            : []),
                        ] as MultiLineField[]
                      "
                    />
                  </template>
                </template>
              </ElTableColumn>
              <ElTableColumn
                v-else-if="col.key === 'dstInfo'"
                :label="col.label"
                min-width="160"
                :fixed="natOpenColumnSettings.columnFixedProp(col)"
              >
                <template #default="{ row }">
                  <template v-if="!(row as { __empty?: boolean }).__empty">
                    <template v-if="(row as NatOpenListRow).mode === 'BNAT'" />
                    <MultiLineTableCell
                      v-else-if="(row as NatOpenListRow).mode === 'SNAT'"
                      :fields="
                        [
                          ...(natOpenColumnSettings.isFieldVisible('dstInfo', 'zone')
                            ? [{ prefix: '域', value: (row as NatOpenListRow).dstZone?.trim() || 'any' }]
                            : []),
                          ...(natOpenColumnSettings.isFieldVisible('dstInfo', 'ip')
                            ? [{ value: (row as NatOpenListRow).dstIp?.trim() || 'any' }]
                            : []),
                        ] as MultiLineField[]
                      "
                    />
                    <MultiLineTableCell
                      v-else-if="(row as NatOpenListRow).dstIp?.trim()"
                      :fields="
                        natOpenColumnSettings.isFieldVisible('dstInfo', 'ip')
                          ? ([{ value: (row as NatOpenListRow).dstIp }] as MultiLineField[])
                          : ([] as MultiLineField[])
                      "
                    />
                  </template>
                </template>
              </ElTableColumn>
              <ElTableColumn
                v-else-if="col.key === 'service'"
                :label="col.label"
                min-width="80"
                :fixed="natOpenColumnSettings.columnFixedProp(col)"
              >
                <template #default="{ row }">
                  <MultiLineTableCell
                    v-if="!(row as { __empty?: boolean }).__empty && (row as NatOpenListRow).mode !== 'BNAT'"
                    :fields="[{ value: (row as NatOpenListRow).service?.trim() || 'any' }]"
                  />
                </template>
              </ElTableColumn>
              <ElTableColumn
                v-else-if="col.key === 'iface'"
                :label="col.label"
                min-width="140"
                :fixed="natOpenColumnSettings.columnFixedProp(col)"
              >
                <template #default="{ row }">
                  <template v-if="!(row as { __empty?: boolean }).__empty">
                    <MultiLineTableCell
                      v-if="
                        (row as NatOpenListRow).mode === 'BNAT' &&
                        (row as NatOpenListRow).bnatIf?.trim() &&
                        natOpenColumnSettings.isFieldVisible('iface', 'bnatIf')
                      "
                      :fields="[{ prefix: '接口', value: (row as NatOpenListRow).bnatIf }]"
                    />
                    <MultiLineTableCell
                      v-else-if="(row as NatOpenListRow).mode !== 'BNAT'"
                      :fields="
                        [
                          ...(natOpenColumnSettings.isFieldVisible('iface', 'inIf')
                            ? [{ prefix: '入接口', value: (row as NatOpenListRow).inIf ?? '' }]
                            : []),
                          ...(natOpenColumnSettings.isFieldVisible('iface', 'outIf')
                            ? [{ prefix: '出接口', value: (row as NatOpenListRow).outIf ?? '' }]
                            : []),
                        ] as MultiLineField[]
                      "
                    />
                  </template>
                </template>
              </ElTableColumn>
              <ElTableColumn
                v-else-if="col.key === 'securityZone'"
                :label="col.label"
                min-width="100"
                :fixed="natOpenColumnSettings.columnFixedProp(col)"
              >
                <template #default="{ row }">
                  <MultiLineTableCell
                    v-if="
                      !(row as { __empty?: boolean }).__empty &&
                      (row as NatOpenListRow).mode === 'BNAT' &&
                      (row as NatOpenListRow).securityZone?.trim()
                    "
                    :fields="[{ value: (row as NatOpenListRow).securityZone }]"
                  />
                </template>
              </ElTableColumn>
              <ElTableColumn
                v-else-if="col.key === 'bnatAddr'"
                :label="col.label"
                min-width="140"
                :fixed="natOpenColumnSettings.columnFixedProp(col)"
              >
                <template #default="{ row }">
                  <MultiLineTableCell
                    v-if="
                      !(row as { __empty?: boolean }).__empty &&
                      (row as NatOpenListRow).virtualIp?.trim() &&
                      (row as NatOpenListRow).realIp?.trim()
                    "
                    :fields="
                      [
                        ...(natOpenColumnSettings.isFieldVisible('bnatAddr', 'virtualIp')
                          ? [{ prefix: '虚拟IP', value: (row as NatOpenListRow).virtualIp ?? '' }]
                          : []),
                        ...(natOpenColumnSettings.isFieldVisible('bnatAddr', 'realIp')
                          ? [{ prefix: '真实IP', value: (row as NatOpenListRow).realIp ?? '' }]
                          : []),
                      ] as MultiLineField[]
                    "
                  />
                </template>
              </ElTableColumn>
              <ElTableColumn
                v-else-if="col.key === 'snatConverted'"
                :label="col.label"
                min-width="120"
                :fixed="natOpenColumnSettings.columnFixedProp(col)"
              >
                <template #default="{ row }">
                  <template v-if="!(row as { __empty?: boolean }).__empty">
                    <MultiLineTableCell
                      v-if="(row as NatOpenListRow).mode === 'SNAT'"
                      :fields="
                        [
                          ...(natOpenColumnSettings.isFieldVisible('snatConverted', 'convert')
                            ? [{ value: snatConvertLabel((row as NatOpenListRow).snatConvert) }]
                            : []),
                          ...(natOpenColumnSettings.isFieldVisible('snatConverted', 'ip')
                            ? [{ value: (row as NatOpenListRow).snatIp ?? '' }]
                            : []),
                        ] as MultiLineField[]
                      "
                    />
                  </template>
                </template>
              </ElTableColumn>
              <ElTableColumn
                v-else-if="col.key === 'dnatConverted'"
                :label="col.label"
                min-width="120"
                :fixed="natOpenColumnSettings.columnFixedProp(col)"
              >
                <template #default="{ row }">
                  <template v-if="!(row as { __empty?: boolean }).__empty">
                    <MultiLineTableCell
                      v-if="(row as NatOpenListRow).mode === 'DNAT' || (row as NatOpenListRow).mode === 'DNAPT'"
                      :fields="
                        [
                          ...(natOpenColumnSettings.isFieldVisible('dnatConverted', 'convert')
                            ? [{ value: dnatConvertLabel((row as NatOpenListRow).dnatConvert) }]
                            : []),
                          ...(natOpenColumnSettings.isFieldVisible('dnatConverted', 'ip')
                            ? [{ value: (row as NatOpenListRow).dnatIp ?? '' }]
                            : []),
                        ] as MultiLineField[]
                      "
                    />
                  </template>
                </template>
              </ElTableColumn>
              <ElTableColumn
                v-else-if="col.key === 'translatedPort'"
                :label="col.label"
                width="88"
                :fixed="natOpenColumnSettings.columnFixedProp(col)"
              >
                <template #default="{ row }">
                  <MultiLineTableCell
                    v-if="
                      !(row as { __empty?: boolean }).__empty &&
                      (row as NatOpenListRow).mode === 'DNAPT' &&
                      (row as NatOpenListRow).translatedPort?.trim()
                    "
                    :fields="[{ value: (row as NatOpenListRow).translatedPort }]"
                  />
                </template>
              </ElTableColumn>
              <ElTableColumn
                v-else-if="col.key === 'position'"
                :label="col.label"
                min-width="120"
                :fixed="natOpenColumnSettings.columnFixedProp(col)"
              >
                <template #default="{ row }">
                  <div v-if="!(row as { __empty?: boolean }).__empty">
                    <MultiLineTableCell :fields="positionFields(row as NatOpenListRow)" />
                  </div>
                </template>
              </ElTableColumn>
              <ElTableColumn
                v-else-if="col.key === 'execStatus'"
                :label="col.label"
                min-width="160"
                :fixed="natOpenColumnSettings.columnFixedProp(col)"
              >
                <template #default="{ row }">
                  <template v-if="!(row as { __empty?: boolean }).__empty">
                    <MultiLineTableCell :spare="false" class="policy-nat-open__exec-multi">
                      <div
                        v-if="natOpenColumnSettings.isFieldVisible('execStatus', 'tag')"
                        class="cell-field-row policy-nat-open__exec-tag-row"
                      >
                        <ElTag
                          size="small"
                          effect="plain"
                          :type="execStatusTagType((row as NatOpenListRow).execStatus)"
                        >
                          {{ (row as NatOpenListRow).execStatus }}
                        </ElTag>
                      </div>
                      <div
                        v-if="
                          natOpenColumnSettings.isFieldVisible('execStatus', 'time') &&
                          (row as NatOpenListRow).execStatus !== '待下发'
                        "
                        class="cell-field-row policy-nat-open__exec-time-row"
                      >
                        <ElTooltip :content="(row as NatOpenListRow).execTime" placement="top" :show-after="280">
                          <span class="cell-field-row__inner">{{ (row as NatOpenListRow).execTime }}</span>
                        </ElTooltip>
                        <span
                          v-if="(row as NatOpenListRow).verifyNeedManual"
                          class="policy-nat-open__verify-icon"
                          @click.stop="onManualVerify(row as NatOpenListRow)"
                        >
                          <ElTooltip content="手动校验" placement="top">
                            <ElIcon :size="16" color="var(--el-color-warning)">
                              <WarningFilled />
                            </ElIcon>
                          </ElTooltip>
                        </span>
                      </div>
                    </MultiLineTableCell>
                  </template>
                </template>
              </ElTableColumn>
              <ElTableColumn
                v-else-if="col.key === 'description'"
                :label="col.label"
                min-width="88"
                :fixed="natOpenColumnSettings.columnFixedProp(col)"
              >
                <template #default="{ row }">
                  <MultiLineTableCell
                    v-if="!(row as { __empty?: boolean }).__empty && (row as NatOpenListRow).description?.trim()"
                    :fields="[{ value: (row as NatOpenListRow).description }]"
                  />
                </template>
              </ElTableColumn>
              <ElTableColumn
                v-else-if="col.key === 'createdInfo'"
                :label="col.label"
                min-width="128"
                :fixed="natOpenColumnSettings.columnFixedProp(col)"
              >
                <template #default="{ row }">
                  <template v-if="!(row as { __empty?: boolean }).__empty">
                    <MultiLineTableCell
                      :fields="
                        [
                          ...(natOpenColumnSettings.isFieldVisible('createdInfo', 'by')
                            ? [{ value: (row as NatOpenListRow).createdBy }]
                            : []),
                          ...(natOpenColumnSettings.isFieldVisible('createdInfo', 'at')
                            ? [{ value: formatDateTime((row as NatOpenListRow).createdAt) }]
                            : []),
                        ] as MultiLineField[]
                      "
                    />
                  </template>
                </template>
              </ElTableColumn>
              <ElTableColumn
                v-else-if="col.key === 'updatedInfo'"
                :label="col.label"
                min-width="128"
                :fixed="natOpenColumnSettings.columnFixedProp(col)"
              >
                <template #default="{ row }">
                  <template v-if="!(row as { __empty?: boolean }).__empty">
                    <MultiLineTableCell
                      :fields="
                        [
                          ...(natOpenColumnSettings.isFieldVisible('updatedInfo', 'by')
                            ? [{ value: (row as NatOpenListRow).updatedBy }]
                            : []),
                          ...(natOpenColumnSettings.isFieldVisible('updatedInfo', 'at')
                            ? [{ value: formatDateTime((row as NatOpenListRow).updatedAt) }]
                            : []),
                        ] as MultiLineField[]
                      "
                    />
                  </template>
                </template>
              </ElTableColumn>
              <ElTableColumn
                v-else-if="col.key === 'operation'"
                :label="col.label"
                min-width="200"
                align="left"
                class-name="op-column"
                :fixed="natOpenColumnSettings.columnFixedProp(col)"
              >
                <template #default="{ row }">
                  <span v-if="!(row as { __empty?: boolean }).__empty" class="op-cell">
                    <ElButton type="primary" link size="small" @click="openEdit(row as NatOpenListRow)">
                      编辑
                    </ElButton>
                    <ElButton type="danger" link size="small" @click="onDeleteRow(row as NatOpenListRow)">
                      删除
                    </ElButton>
                    <ElButton
                      v-if="showDeployOp((row as NatOpenListRow).execStatus)"
                      type="primary"
                      link
                      size="small"
                      @click="openDeploy(row as NatOpenListRow)"
                    >
                      下发
                    </ElButton>
                    <ElButton
                      v-if="showRollbackOp((row as NatOpenListRow).execStatus)"
                      type="warning"
                      link
                      size="small"
                      @click="openRollback(row as NatOpenListRow)"
                    >
                      回撤
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
      </div>
    </PageContent>

    <!-- 添加/编辑：布局对齐 PolicyChangeAdjustDialog（开通策略表单 | 配置命令 + 底部按钮） -->
    <ElDialog
      v-model="addVisible"
      width="min(1180px, 96vw)"
      class="policy-nat-add-dialog"
      align-center
      append-to-body
      destroy-on-close
    >
      <template #header="{ titleId, titleClass }">
        <div class="policy-nat-add-dialog__header">
          <span :id="titleId" :class="titleClass">{{
            editingRowId ? '编辑 NAT 开通' : 'NAT 开通'
          }}</span>
          <DialogPrototypeDoc doc-key="policy-change-nat-open-add" business-short-name="NAT 开通" />
        </div>
      </template>
      <div class="policy-nat-add__body">
        <div class="policy-nat-add__layout">
          <div class="policy-nat-add__form panel">
            <div class="policy-nat-add__panel-title policy-nat-add__panel-title--sticky">开通策略表单</div>
            <div class="policy-nat-add__form-body">
            <ElForm
              label-width="108px"
              label-position="right"
              size="small"
              class="policy-nat-add__form-fields"
              :disabled="editFormReadonly"
            >
              <ElFormItem label="设备" required>
                <NatTablePickerField
                  v-model="devicePickerModel"
                  :rows="devicePickerRows"
                  row-key="id"
                  display-key="name"
                  :composite-keys="{ primary: 'name', secondary: 'ip' }"
                  :columns="[
                    { prop: 'name', label: '名称', minWidth: 160 },
                    { prop: 'ip', label: 'IP', minWidth: 120 },
                  ]"
                  placeholder="点击选择设备"
                  dialog-title="选择设备"
                  :search-keys="['name', 'ip']"
                  :disabled="editFormReadonly"
                />
              </ElFormItem>
              <ElFormItem label="模式" required>
                <ElRadioGroup v-model="form.mode" class="policy-nat-add__radio-wrap" @change="refreshCommand">
                  <ElRadio v-for="o in NAT_MODE_OPTIONS" :key="o.value" :label="o.value">
                    {{ o.label }}
                  </ElRadio>
                </ElRadioGroup>
              </ElFormItem>
              <ElFormItem label="类型" required>
                <ElRadioGroup v-model="form.natType" class="policy-nat-add__radio-wrap">
                  <ElRadio v-for="o in NAT_TYPE_OPTIONS" :key="o.value" :label="o.value">
                    {{ o.label }}
                  </ElRadio>
                </ElRadioGroup>
              </ElFormItem>
              <ElFormItem label="VR" required>
                <NatTablePickerField
                  v-model="form.vr"
                  :rows="vrPickerRows"
                  row-key="name"
                  display-key="name"
                  :columns="[{ prop: 'name', label: 'VR 名称', minWidth: 160 }]"
                  placeholder="点击选择 VR"
                  dialog-title="选择 VR"
                  :search-keys="['name']"
                  :disabled="editFormReadonly"
                />
              </ElFormItem>

              <div v-if="form.mode !== 'BNAT'" class="policy-nat-add__subsection-title">原始数据</div>

              <template v-if="showSrcBlock(form.mode)">
                <ElFormItem>
                  <template #label>
                    <span class="policy-nat-add__label-tip">
                      源安全域
                      <ElTooltip content="从列表选择" placement="top" :show-after="200">
                        <ElIcon class="policy-nat-add__help-icon"><QuestionFilled /></ElIcon>
                      </ElTooltip>
                    </span>
                  </template>
                  <NatTablePickerField
                    v-model="form.srcZone"
                    :rows="zonePickerRows"
                    row-key="name"
                    display-key="name"
                    :columns="[{ prop: 'name', label: '名称', minWidth: 160 }]"
                    placeholder="点击选择源安全域"
                    dialog-title="源安全域"
                    clear-to-any
                    :search-keys="['name']"
                    :disabled="editFormReadonly"
                  />
                </ElFormItem>
                <ElFormItem label="源地址" required>
                  <NatIpKindField v-model="form.srcIp" :disabled="editFormReadonly" />
                </ElFormItem>
              </template>

              <template v-if="showNaptSrcSupplement(form.mode)">
                <ElFormItem>
                  <template #label>
                    <span class="policy-nat-add__label-tip">
                      源安全域
                      <ElTooltip content="从列表选择" placement="top" :show-after="200">
                        <ElIcon class="policy-nat-add__help-icon"><QuestionFilled /></ElIcon>
                      </ElTooltip>
                    </span>
                  </template>
                  <NatTablePickerField
                    v-model="form.srcZone"
                    :rows="zonePickerRows"
                    row-key="name"
                    display-key="name"
                    :columns="[{ prop: 'name', label: '名称', minWidth: 160 }]"
                    placeholder="点击选择源安全域"
                    dialog-title="源安全域"
                    clear-to-any
                    :search-keys="['name']"
                    :disabled="editFormReadonly"
                  />
                </ElFormItem>
                <ElFormItem label="源地址">
                  <NatIpKindField v-model="form.srcIp" :disabled="editFormReadonly" />
                </ElFormItem>
              </template>

              <template v-if="showDstZone(form.mode)">
                <ElFormItem>
                  <template #label>
                    <span class="policy-nat-add__label-tip">
                      目的安全域
                      <ElTooltip content="从列表选择" placement="top" :show-after="200">
                        <ElIcon class="policy-nat-add__help-icon"><QuestionFilled /></ElIcon>
                      </ElTooltip>
                    </span>
                  </template>
                  <NatTablePickerField
                    v-model="form.dstZone"
                    :rows="zonePickerRows"
                    row-key="name"
                    display-key="name"
                    :columns="[{ prop: 'name', label: '名称', minWidth: 160 }]"
                    placeholder="点击选择目的安全域"
                    dialog-title="目的安全域"
                    clear-to-any
                    :search-keys="['name']"
                    :disabled="editFormReadonly"
                  />
                </ElFormItem>
              </template>
              <ElFormItem v-if="showDstIp(form.mode)" label="目的地址" required>
                <NatIpKindField v-model="form.dstIp" :disabled="editFormReadonly" />
              </ElFormItem>

              <ElFormItem v-if="showService(form.mode)">
                <template #label>
                  <span>服务</span>
                </template>
                <NatTablePickerField
                  v-model="form.service"
                  :rows="servicePickerRows"
                  row-key="name"
                  display-key="name"
                  :columns="[{ prop: 'name', label: '服务', minWidth: 160 }]"
                  placeholder="点击选择服务"
                  dialog-title="服务"
                  clear-to-any
                  :search-keys="['name']"
                  :disabled="editFormReadonly"
                />
              </ElFormItem>

              <template v-if="showInOutIf(form.mode)">
                <ElFormItem>
                  <template #label>
                    <span class="policy-nat-add__label-tip">
                      入接口
                      <ElTooltip content="从列表选择" placement="top" :show-after="200">
                        <ElIcon class="policy-nat-add__help-icon"><QuestionFilled /></ElIcon>
                      </ElTooltip>
                    </span>
                  </template>
                  <NatTablePickerField
                    v-model="form.inIf"
                    :rows="ifacePickerRows"
                    row-key="name"
                    display-key="name"
                    :columns="[{ prop: 'name', label: '接口', minWidth: 160 }]"
                    placeholder="点击选择入接口"
                    dialog-title="入接口"
                    :search-keys="['name']"
                    :disabled="editFormReadonly"
                  />
                </ElFormItem>
                <ElFormItem>
                  <template #label>
                    <span class="policy-nat-add__label-tip">
                      出接口
                      <ElTooltip content="从列表选择" placement="top" :show-after="200">
                        <ElIcon class="policy-nat-add__help-icon"><QuestionFilled /></ElIcon>
                      </ElTooltip>
                    </span>
                  </template>
                  <NatTablePickerField
                    v-model="form.outIf"
                    :rows="ifacePickerRows"
                    row-key="name"
                    display-key="name"
                    :columns="[{ prop: 'name', label: '接口', minWidth: 160 }]"
                    placeholder="点击选择出接口"
                    dialog-title="出接口"
                    :search-keys="['name']"
                    :disabled="editFormReadonly"
                  />
                </ElFormItem>
              </template>

              <ElFormItem v-if="showBnatIf(form.mode)">
                <template #label>
                  <span class="policy-nat-add__label-tip">
                    接口
                    <ElTooltip content="从列表选择" placement="top" :show-after="200">
                      <ElIcon class="policy-nat-add__help-icon"><QuestionFilled /></ElIcon>
                    </ElTooltip>
                  </span>
                </template>
                <NatTablePickerField
                  v-model="form.bnatIf"
                  :rows="ifacePickerRows"
                  row-key="name"
                  display-key="name"
                  :columns="[{ prop: 'name', label: '接口', minWidth: 160 }]"
                  placeholder="点击选择接口"
                  dialog-title="接口（BNAT）"
                  :search-keys="['name']"
                  :disabled="editFormReadonly"
                />
              </ElFormItem>
              <ElFormItem v-if="showSecurityZone(form.mode)">
                <template #label>
                  <span class="policy-nat-add__label-tip">
                    安全域
                    <ElTooltip content="从列表选择" placement="top" :show-after="200">
                      <ElIcon class="policy-nat-add__help-icon"><QuestionFilled /></ElIcon>
                    </ElTooltip>
                  </span>
                </template>
                <NatTablePickerField
                  v-model="form.securityZone"
                  :rows="securityZonePickerRows"
                  row-key="name"
                  display-key="name"
                  :columns="[{ prop: 'name', label: '安全域', minWidth: 160 }]"
                  placeholder="点击选择安全域"
                  dialog-title="安全域"
                  clear-to-any
                  :search-keys="['name']"
                  :disabled="editFormReadonly"
                />
              </ElFormItem>

              <template v-if="form.mode === 'BNAT'">
                <ElFormItem label="虚拟 IP" required>
                  <NatIpKindField v-model="virtualIp" :disabled="editFormReadonly" />
                </ElFormItem>
                <ElFormItem label="真实 IP" required>
                  <NatIpKindField v-model="realIp" :disabled="editFormReadonly" />
                </ElFormItem>
              </template>

              <div v-if="form.mode !== 'BNAT'" class="policy-nat-add__subsection-title">转换后信息</div>

              <template v-if="showSnatBlock(form.mode)">
                <ElFormItem label="转换方式">
                  <ElRadioGroup v-model="form.snatConvert" class="policy-nat-add__radio-wrap">
                    <ElRadio label="egressIp">出接口IP（IPv4）</ElRadio>
                    <ElRadio label="specifiedIp">指定IP</ElRadio>
                    <ElRadio label="none">不转换</ElRadio>
                  </ElRadioGroup>
                </ElFormItem>
                <ElFormItem v-if="form.snatConvert === 'specifiedIp'" label="转换后源地址" required>
                  <NatIpKindField v-model="form.snatIp" :disabled="editFormReadonly" />
                </ElFormItem>
              </template>

              <template v-if="showDnatBlock(form.mode)">
                <ElFormItem label="转换方式">
                  <ElRadioGroup v-model="form.dnatConvert" class="policy-nat-add__radio-wrap">
                    <ElRadio label="specifiedIp">指定IP</ElRadio>
                    <ElRadio label="none">不转换</ElRadio>
                  </ElRadioGroup>
                </ElFormItem>
                <ElFormItem v-if="form.dnatConvert === 'specifiedIp'" label="转换后目的地址" required>
                  <NatIpKindField v-model="form.dnatIp" :disabled="editFormReadonly" />
                </ElFormItem>
              </template>

              <ElFormItem v-if="showNaptPort(form.mode)" label="转换端口">
                <ElInput v-model="form.translatedPort" placeholder="1-65535" />
              </ElFormItem>

              <ElFormItem label="位置">
                <div class="policy-nat-add__position-row">
                  <ElSelect
                    v-model="form.position"
                    class="policy-nat-add__position-select"
                    placeholder="请选择位置"
                    :disabled="editFormReadonly"
                  >
                    <ElOption
                      v-for="o in POSITION_RADIO_OPTIONS"
                      :key="o.value"
                      :label="o.label"
                      :value="o.value"
                    />
                  </ElSelect>
                  <NatTablePickerField
                    v-if="form.position === 'before' || form.position === 'after'"
                    v-model="form.positionRef"
                    class="policy-nat-add__position-ref"
                    :rows="positionRefPickerRows"
                    row-key="name"
                    display-key="name"
                    :columns="[{ prop: 'name', label: '策略 ID', minWidth: 160 }]"
                    placeholder="点击选择参照 ID"
                    dialog-title="参照 ID"
                    :search-keys="['name']"
                    :disabled="editFormReadonly"
                  />
                </div>
              </ElFormItem>

              <ElFormItem label="ID" required>
                <div class="policy-nat-add__id-row">
                  <ElRadioGroup v-model="form.idMode" class="policy-nat-add__id-radios">
                    <ElRadio label="system">系统分配</ElRadio>
                    <ElRadio label="custom">自定义</ElRadio>
                  </ElRadioGroup>
                  <ElInput
                    v-if="form.idMode === 'custom'"
                    v-model="form.customId"
                    class="policy-nat-add__id-custom"
                    placeholder="请输入策略 ID"
                    clearable
                    :disabled="editFormReadonly"
                  />
                </div>
              </ElFormItem>

              <ElFormItem label="描述">
                <ElInput v-model="form.description" maxlength="63" show-word-limit placeholder="0-63 字符" />
              </ElFormItem>
            </ElForm>
            </div>
          </div>
          <div class="policy-nat-add__cmd panel">
            <div class="policy-nat-add__cmd-head policy-nat-add__panel-title--sticky">
              <span class="policy-nat-add__panel-title">配置命令</span>
              <div class="policy-nat-add__cmd-actions">
                <ElButton
                  size="small"
                  :icon="RefreshRight"
                  :disabled="editFormReadonly"
                  @click="updateCommandBtn"
                >
                  更新命令
                </ElButton>
                <ElButton size="small" :icon="CopyDocument" @click="copyCommand">复制</ElButton>
                <ElButton size="small" :icon="Download" @click="downloadCommand">下载</ElButton>
              </div>
            </div>
            <div class="policy-nat-add__cmd-body">
              <ElInput
                v-model="commandText"
                type="textarea"
                :autosize="{ minRows: 18, maxRows: 28 }"
                class="policy-nat-add__cmd-text policy-nat-add__cmd-text--fill"
              />
            </div>
          </div>
        </div>
        <div class="policy-nat-add__footer">
          <ElButton type="primary" :disabled="editFormReadonly" @click="onSaveAdd">保存</ElButton>
          <ElButton @click="addVisible = false">取消</ElButton>
        </div>
      </div>
    </ElDialog>

    <ElDialog
      v-model="deployVisible"
      title="配置命令下发"
      width="480px"
      append-to-body
      align-center
      @closed="deployRow = null"
    >
      <div v-if="deployRow" class="policy-nat-open__deploy">
        <ElRadioGroup v-model="deployMode" class="policy-nat-add__radio-wrap">
          <ElRadio label="now">立即下发</ElRadio>
          <ElRadio label="schedule">定时下发</ElRadio>
        </ElRadioGroup>
        <ElDatePicker
          v-if="deployMode === 'schedule'"
          v-model="deployScheduleAt"
          type="datetime"
          placeholder="选择时间"
          format="YYYY-MM-DD HH:mm:ss"
          value-format="YYYY-MM-DD HH:mm:ss"
          style="width: 100%; margin-top: 12px"
        />
      </div>
      <template #footer>
        <ElButton @click="deployVisible = false">取消</ElButton>
        <ElButton type="primary" @click="confirmDeploy">确定</ElButton>
      </template>
    </ElDialog>
  </section>
</template>

<style scoped>
/* 布局与 PolicyChangeOpen 对齐（同组 class 名复用） */
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

.policy-nat-open :deep(.page-content) {
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

/* 顶栏：与策略开通页一致 — 左状态统计 + 右时间过滤 */
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

.policy-open__top-bar-time :deep(.time-filter-bar) {
  padding-bottom: 0;
  border-bottom: none;
}

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

.policy-nat-open :deep(.policy-table-container .is-empty-row td) {
  border-color: var(--el-border-color-lighter);
}

.policy-nat-open__id-hover {
  cursor: default;
  border-bottom: 1px dashed var(--el-color-primary);
}

.policy-nat-open__pre-wrap {
  font-size: 12px;
  line-height: 1.35;
  white-space: pre-line;
  word-break: break-word;
}

.policy-nat-open__exec-multi {
  align-items: flex-start;
}

.policy-nat-open__exec-tag-row {
  line-height: 1.2;
}

.policy-nat-open__exec-time-row {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--el-text-color-regular);
  min-width: 0;
}

.policy-nat-open__exec-time-row .cell-field-row__inner {
  flex: 1;
  min-width: 0;
}

.policy-nat-open__verify-icon {
  cursor: pointer;
  display: inline-flex;
}

.policy-nat-add-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 8px;
  min-width: 0;
}

/* NAT 添加弹窗：与 PolicyChangeAdjustDialog 同构（双栏 1:1 + 分区标题 + 底部居中按钮） */
.policy-nat-add-dialog :deep(.el-dialog__body) {
  padding-top: 8px;
}

.policy-nat-add__body {
  display: flex;
  flex-direction: column;
  gap: 0;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.policy-nat-add__layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: stretch;
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
}

@media (max-width: 960px) {
  .policy-nat-add__layout {
    grid-template-columns: 1fr;
  }
}

.policy-nat-add__form.panel {
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--el-fill-color-light);
  border-radius: 8px;
  padding: 12px;
  border: 1px solid var(--el-border-color-lighter);
}

.policy-nat-add__form-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  max-height: min(70vh, 720px);
  padding-right: 4px;
}

.policy-nat-add__form-fields :deep(.el-form-item) {
  margin-bottom: 10px;
}

.policy-nat-add__cmd.panel {
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--el-fill-color-light);
  border-radius: 8px;
  padding: 12px;
  border: 1px solid var(--el-border-color-lighter);
}

.policy-nat-add__panel-title {
  font-weight: 600;
  margin-bottom: 6px;
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.policy-nat-add__panel-title--sticky {
  position: sticky;
  top: 0;
  z-index: 2;
  margin-bottom: 0;
  padding-bottom: 8px;
  background: var(--el-fill-color-light);
}

.policy-nat-add__cmd.panel .policy-nat-add__panel-title--sticky {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.policy-nat-add__cmd-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.policy-nat-add__cmd-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.policy-nat-add__cmd-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  max-height: min(70vh, 720px);
  display: flex;
  flex-direction: column;
}

.policy-nat-add__cmd-text {
  font-family: ui-monospace, monospace;
  font-size: 12px;
}

.policy-nat-add__cmd-text--fill {
  flex: 1;
  min-height: 0;
  width: 100%;
}

.policy-nat-add__footer {
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-shrink: 0;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.policy-nat-add__cmd-text :deep(textarea) {
  font-family: ui-monospace, monospace;
  font-size: 12px;
}

.policy-nat-add__id-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0 20px;
  width: 100%;
}

.policy-nat-add__id-custom {
  flex: 1;
  min-width: 160px;
  max-width: 320px;
}

.policy-nat-add__position-row {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-width: 0;
}

.policy-nat-add__position-select {
  flex: 0 0 auto;
  width: 160px;
}

.policy-nat-add__position-ref {
  flex: 1;
  min-width: 0;
}

.policy-nat-add__subsection-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 14px 0 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.policy-nat-add__radio-wrap {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  column-gap: 20px;
  row-gap: 8px;
}

.policy-nat-add__radio-wrap :deep(.el-radio),
.policy-nat-add__id-radios :deep(.el-radio) {
  margin-right: 0;
  margin-bottom: 0;
  height: auto;
}

.policy-nat-add__id-radios {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  column-gap: 20px;
  row-gap: 8px;
}

.policy-nat-add__label-tip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.policy-nat-add__help-icon {
  cursor: help;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.policy-nat-open__deploy {
  padding: 8px 0;
}

.policy-nat-open__layout-root {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 12px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.policy-nat-open__main {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.policy-nat-open__more-pop {
  max-height: 420px;
  overflow-y: auto;
}

</style>

<style>
.page-doc-dialog .page-doc-body {
  min-height: 120px;
  max-height: 70vh;
  overflow: auto;
}

.page-doc-dialog .page-doc-markdown {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: var(--el-font-family);
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-primary);
}

.el-overlay-dialog:has(.policy-nat-add-dialog) {
  overflow: hidden !important;
}


.policy-nat-add-dialog.el-dialog {
  display: flex;
  flex-direction: column;
  max-height: min(92vh, 900px);
  margin: 0 auto !important;
  overflow: hidden;
}

.policy-nat-add-dialog .el-dialog__body {
  padding-top: 8px;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  box-sizing: border-box;
}
</style>
