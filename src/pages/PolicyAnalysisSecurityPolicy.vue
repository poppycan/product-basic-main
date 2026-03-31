<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import {
  ElButton,
  ElDialog,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElIcon,
  ElInput,
  ElOption,
  ElPagination,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
  ElTooltip,
  ElTree,
  ElMessage,
  ElMessageBox,
  ElPopover,
  ElProgress,
  ElCheckbox,
  ElCheckboxGroup,
  ElSwitch,
} from 'element-plus';
import {
  Refresh,
  Search,
  Star,
  ArrowDown,
  ArrowUp,
  WarningFilled,
  MoreFilled,
  SetUp,
  Close,
  Setting,
  Plus,
  CirclePlus,
  InfoFilled,
  Link,
  Edit,
} from '@element-plus/icons-vue';
import PageContent from '@/components/PageContent.vue';
import {
  mockDeviceTree,
  mockTagStats,
  mockBusinessTagList,
  mockPolicies,
  searchPolicies,
  computeNormalFieldStats,
  policyRowMatchesFieldLabel,
  tokenizeQuery,
} from '@/api/mock/security-policy';
import type { BusinessTagItem } from '@/api/mock/security-policy';
import type {
  DeviceGroup,
  FirewallDevice,
  NatRule,
  PolicyRow,
  SearchParams,
  TagFilterItem,
  CommonSearchItem,
} from '@/types/security-policy';

const STORAGE_KEY = 'securityPolicy.commonSearches';
const MAX_COMMON = 5;

// ---------- 左侧树 ----------
const deviceKeyword = ref('');
const deviceCount = computed(() => mockDeviceTree.reduce((sum, g) => sum + (g.children?.length ?? 0), 0));

const baseTreeData = computed(() =>
  mockDeviceTree.map((g: DeviceGroup) => ({
    id: g.id,
    label: g.name,
    isGroup: true,
    children: g.children.map((d: FirewallDevice) => ({
      id: d.id,
      label: d.name,
      isGroup: false,
      device: d,
    })),
  }))
);

const treeData = computed(() => {
  const kw = deviceKeyword.value.trim().toLowerCase();
  if (!kw) return baseTreeData.value;
  return baseTreeData.value
    .map((g) => {
      const children = (g.children ?? []).filter((c) => {
        const name = c.device?.name?.toLowerCase?.() ?? '';
        const ip = c.device?.ip?.toLowerCase?.() ?? '';
        return name.includes(kw) || ip.includes(kw);
      });
      return { ...g, children };
    })
    .filter((g) => (g.children?.length ?? 0) > 0);
});

const selectedDeviceIds = ref<string[]>([]);

const defaultProps = { children: 'children', label: 'label' };
const getNodeIcon = (data: { isGroup?: boolean; device?: FirewallDevice }) => {
  if (data.isGroup) return null;
  return data.device?.enabled ? '🟢' : '🔴';
};

const handleTreeCheck = (_data: unknown, checkedInfo: { checkedNodes?: any[] }) => {
  const nodes = checkedInfo?.checkedNodes ?? [];
  const ids = new Set<string>();
  for (const n of nodes) {
    if (n?.isGroup) {
      for (const c of n?.children ?? []) {
        if (c?.id && !c?.isGroup) ids.add(String(c.id));
      }
    } else if (n?.id) {
      ids.add(String(n.id));
    }
  }
  selectedDeviceIds.value = Array.from(ids);
};

// 右键菜单
const contextMenuVisible = ref(false);
const contextMenuPosition = ref({ x: 0, y: 0 });
const contextMenuDevice = ref<FirewallDevice | null>(null);

const onTreeContextMenu = (evt: Event, data: { isGroup?: boolean; device?: FirewallDevice }) => {
  if (data?.isGroup) return;
  evt.preventDefault();
  const e = evt as MouseEvent;
  contextMenuDevice.value = data?.device ?? null;
  contextMenuPosition.value = { x: e.clientX, y: e.clientY };
  contextMenuVisible.value = true;
};

const closeContextMenu = () => {
  contextMenuVisible.value = false;
  contextMenuDevice.value = null;
};

const handleDeviceManage = () => {
  ElMessage.info('设备管理（URL 占位）');
  closeContextMenu();
};
const handleDeviceDetail = () => {
  ElMessage.info('设备详情弹窗（占位）');
  closeContextMenu();
};
const handleConfigUpdate = () => {
  ElMessage.info('配置更新弹窗（占位）');
  closeContextMenu();
};
const handleConfigDownload = () => {
  ElMessage.success('配置下载（占位）');
  closeContextMenu();
};

function downloadDeviceConfig(device: FirewallDevice) {
  const blob = new Blob([`device=${device.name}\nip=${device.ip ?? '-'}\nconfig=placeholder\n`], {
    type: 'text/plain;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${device.name}-config.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

const devicePropsVisible = ref(false);
const devicePropsDevice = ref<FirewallDevice | null>(null);
function openDeviceProps(device: FirewallDevice) {
  devicePropsDevice.value = device;
  devicePropsVisible.value = true;
  closeContextMenu();
}
const handleDeviceDelete = () => {
  ElMessageBox.confirm('确定删除选中设备？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      ElMessage.success('已删除（占位）');
      closeContextMenu();
    })
    .catch(() => closeContextMenu());
};

// ---------- 检索（精简大气：单输入框 + 图标） ----------
type AdvancedValueType = 'ip' | 'port' | 'protocol' | 'action' | 'text' | 'number';

interface AdvancedField {
  key: string;
  label: string;
  valueType: AdvancedValueType;
}

const searchMode = ref<'normal' | 'advanced'>('normal');
/** 普通/高级共用：普通为自由文本；高级为字段构建表达式 */
const searchInput = ref('');
const anyMode = ref<SearchParams['anyMode']>('');
const matchMode = ref<SearchParams['matchMode']>('partial');
/** 从收藏回显高级表达式时，在尚未重建 token 前用于检索 */
const appliedAdvancedQueryRef = ref<string | null>(null);
const tagFilters = ref<TagFilterItem[]>([]);

/** 高级检索可匹配字段（含类型信息） */
const ADVANCED_FIELDS: AdvancedField[] = [
  { key: 'srcIp', label: '源IP', valueType: 'ip' },
  { key: 'srcZone', label: '源区域', valueType: 'text' },
  { key: 'dstIp', label: '目的IP', valueType: 'ip' },
  { key: 'dstZone', label: '目的区域', valueType: 'text' },
  { key: 'port', label: '端口', valueType: 'port' },
  { key: 'protocol', label: '协议', valueType: 'protocol' },
  { key: 'snatFromIp', label: '转换前源IP', valueType: 'ip' },
  { key: 'snatToIp', label: '转换后源IP', valueType: 'ip' },
  { key: 'dnatFromIp', label: '转换前目的IP', valueType: 'ip' },
  { key: 'dnatToIp', label: '转换后目的IP', valueType: 'ip' },
  { key: 'dnatFromPort', label: '转换前端口', valueType: 'port' },
  { key: 'dnatToPort', label: '转换后端口', valueType: 'port' },
  { key: 'priority', label: '优先级', valueType: 'number' },
  { key: 'lines', label: '关联专线', valueType: 'text' },
  { key: 'owner', label: '负责人', valueType: 'text' },
  { key: 'applicant', label: '申请人', valueType: 'text' },
  { key: 'executor', label: '执行人', valueType: 'text' },
  { key: 'business', label: '业务', valueType: 'text' },
  { key: 'remark', label: '备注', valueType: 'text' },
  { key: 'comment', label: '注释', valueType: 'text' },
  { key: 'ticket', label: '工单', valueType: 'text' },
  { key: 'action', label: '动作', valueType: 'action' },
];

// -------- 高级检索：命令式编辑器（/ 命令面板 + 状态机）--------
type AdvPhase = 'field' | 'command' | 'operator' | 'value' | 'connector';
type AdvToken =
  | { id: string; type: 'paren'; value: '(' | ')' }
  | { id: string; type: 'connector'; value: 'and' | 'or' }
  | { id: string; type: 'condition'; field: AdvancedField; operator: string; values: string[] };

const advTokens = ref<AdvToken[]>([]);
const advPhase = ref<AdvPhase>('field');
const advInput = ref('');
const advInputRef = ref<HTMLInputElement | null>(null);
const advMenuOpen = ref(false);
const advMenuIndex = ref(0);
const advFieldSuggestions = ref<AdvancedField[]>([]);
/** 从 / 命令选择「字段」后：字段面板为顶部搜索 + 全量/过滤列表 */
const advFieldFromCommand = ref(false);
const advFieldPanelSearchKeyword = ref('');
const advFieldSearchInputRef = ref<{ focus: () => void } | null>(null);

const advDisplayedFieldList = computed(() => {
  const kw = advFieldPanelSearchKeyword.value.trim().toLowerCase();
  if (!kw) return ADVANCED_FIELDS;
  return ADVANCED_FIELDS.filter((f) => f.label.toLowerCase().includes(kw));
});

watch(advFieldPanelSearchKeyword, () => {
  advMenuIndex.value = 0;
});

const advCurrentField = ref<AdvancedField | null>(null);
const advCurrentOperator = ref<string>('');
const advCurrentValues = ref<string[]>([]);

const advCommands = [
  { key: 'field', label: '字段（字段）' },
  { key: 'operator', label: '操作符（=/!=/in/nin/>=/<=）' },
  { key: 'value', label: '值（值）' },
  { key: 'connector', label: '连接词（end/and/or）' },
  { key: 'parenL', label: '子表达（（' },
  { key: 'parenR', label: '子表达 ）（' },
] as const;

type AdvCommandKey = (typeof advCommands)[number]['key'];

const availableOperators = computed(() => {
  const f = advCurrentField.value;
  if (!f) return ['=', '!=', 'in', 'nin', '>=', '<='];
  const t = f.valueType;
  if (t === 'protocol' || t === 'action') return ['=', '!=', 'in', 'nin'];
  if (t === 'ip') return ['=', '!=', 'in', 'nin'];
  if (t === 'port' || t === 'number') return ['=', '!=', '>=', '<=', 'in', 'nin'];
  return ['=', '!=', 'in', 'nin'];
});

const advValueOptions = computed(() => {
  const f = advCurrentField.value;
  if (!f) return [] as string[];
  if (f.valueType === 'protocol') return ['TCP', 'UDP', 'ICMP'];
  if (f.valueType === 'action') return ['允许', '拒绝'];
  return [] as string[];
});

const advancedExpressionText = computed(() => {
  const parts: string[] = [];
  for (const t of advTokens.value) {
    if (t.type === 'paren') parts.push(t.value);
    if (t.type === 'connector') parts.push(t.value);
    if (t.type === 'condition') parts.push(`${t.field.label}${t.operator}${t.values.join(',')}`);
  }
  return parts.join(' ');
});

watch(advancedExpressionText, (text) => {
  if (searchMode.value === 'advanced') searchInput.value = text;
});

watch(
  advTokens,
  () => {
    if (appliedAdvancedQueryRef.value && advTokens.value.length > 0) {
      appliedAdvancedQueryRef.value = null;
    }
  },
  { deep: true }
);

const matchModeOptions: {
  value: SearchParams['matchMode'];
  label: string;
  desc: string;
}[] = [
  {
    value: 'fullInclude',
    label: '全包含',
    desc: '检索条件全部体现在结果条目中，检索条件范围≤结果条目范围',
  },
  {
    value: 'exclude',
    label: '排除条件',
    desc: '结果条目完全排除所输入的检索条件',
  },
  {
    value: 'equal',
    label: '相等',
    desc: '检索条件与结果条目完全一致',
  },
  {
    value: 'partial',
    label: '部分匹配',
    desc: '结果条目满足检索条件中的任意一项',
  },
];

const rowsForFieldStats = computed(() => {
  const ids = selectedDeviceIds.value;
  if (ids?.length) return mockPolicies.filter((p) => ids.includes(p.deviceId));
  return mockPolicies;
});

const normalFieldStats = computed(() => {
  if (searchMode.value !== 'normal') return [] as { label: string; count: number }[];
  const q = searchInput.value.trim();
  if (!q) return [];
  return computeNormalFieldStats(rowsForFieldStats.value, q);
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const highlightQuerySource = computed(() => {
  if (searchMode.value === 'normal') return searchInput.value.trim();
  return (appliedAdvancedQueryRef.value ?? advancedExpressionText.value ?? '').trim();
});

function buildHighlightHtml(text: string, query: string): string {
  const raw = String(text ?? '');
  const q = query.trim();
  if (!q) return escapeHtml(raw);
  const tokens = tokenizeQuery(q);
  if (!tokens.length) return escapeHtml(raw);
  const pattern = tokens
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .filter(Boolean)
    .join('|');
  if (!pattern) return escapeHtml(raw);
  const parts = raw.split(new RegExp(`(${pattern})`, 'gi'));
  return parts
    .map((part) => {
      if (part === '') return '';
      const test = new RegExp(`^(${pattern})$`, 'i');
      if (test.test(part)) {
        return `<mark class="search-hit">${escapeHtml(part)}</mark>`;
      }
      return escapeHtml(part);
    })
    .join('');
}

function highlightSearchHtml(text: string | number | undefined | null): string {
  return buildHighlightHtml(String(text ?? ''), highlightQuerySource.value);
}

function advOpenMenu() {
  advMenuOpen.value = true;
  advMenuIndex.value = 0;
}
function advCloseMenu() {
  advMenuOpen.value = false;
  advMenuIndex.value = 0;
}

function advSearchFields(q: string) {
  const kw = q.trim().toLowerCase();
  if (!kw) {
    advFieldSuggestions.value = [];
    return;
  }
  advFieldSuggestions.value = ADVANCED_FIELDS.filter((f) => f.label.toLowerCase().includes(kw));
}

function advOpenFieldPanelFromCommand() {
  advFieldFromCommand.value = true;
  advFieldPanelSearchKeyword.value = '';
  advMenuIndex.value = 0;
  advOpenMenu();
  nextTick(() => {
    advFieldSearchInputRef.value?.focus?.();
  });
}

function advFocusInput() {
  setTimeout(() => advInputRef.value?.focus(), 0);
}

function advStartFieldEdit() {
  advCurrentField.value = null;
  advCurrentOperator.value = '';
  advCurrentValues.value = [];
  advPhase.value = 'field';
  advInput.value = '';
  advOpenFieldPanelFromCommand();
}

function advStartOperatorEdit() {
  if (!advCurrentField.value) {
    ElMessage.warning('请先选择字段');
    return;
  }
  advPhase.value = 'operator';
  advMenuIndex.value = 0;
  advOpenMenu();
  advFocusInput();
}

function advSelectField(f: AdvancedField) {
  advFieldFromCommand.value = false;
  advFieldPanelSearchKeyword.value = '';
  advCurrentField.value = f;
  advPhase.value = 'operator';
  advInput.value = '';
  advCloseMenu();
  advOpenMenu();
  advFocusInput();
}

function advSelectOperator(op: string) {
  advCurrentOperator.value = op;
  advPhase.value = 'value';
  advInput.value = '';
  advCurrentValues.value = [];
  advCloseMenu();
  // 枚举值直接弹出选项，平铺换行
  if (advValueOptions.value.length) {
    advOpenMenu();
    nextTick(() => advFocusInput());
  } else {
    advFocusInput();
  }
}

/** 枚举值选中：单选，多选用逗号输入 */
function advSelectEnumValue(v: string) {
  if (!v) return;
  advCurrentValues.value = [v];
}

function advSelectCommand(key: AdvCommandKey) {
  // 约束：必须选中字段后才能启用「值」「操作符」
  if ((key === 'value' || key === 'operator') && !advCurrentField.value) {
    ElMessage.warning('请先选择字段');
    return;
  }
  advCloseMenu();
  advInput.value = '';
  if (key === 'field') {
    advPhase.value = 'field';
    advOpenFieldPanelFromCommand();
    return;
  }
  if (key === 'operator') {
    advPhase.value = 'operator';
    advOpenMenu();
    return;
  }
  if (key === 'value') {
    advPhase.value = 'value';
    if (advValueOptions.value.length) {
      advOpenMenu();
      nextTick(() => advFocusInput());
    }
    return;
  }
  if (key === 'connector') {
    advPhase.value = 'connector';
    advOpenMenu();
    return;
  }
  if (key === 'parenL') {
    advInsertParen('(');
    // 选中左括号后：进入字段命令
    advPhase.value = 'field';
    advFocusInput();
    return;
  }
  if (key === 'parenR') {
    advInsertParen(')');
    // 选中右括号后：默认进入连接词命令
    advPhase.value = 'connector';
    advOpenMenu();
    advFocusInput();
  }
}

function advConfirmValue(): boolean {
  const f = advCurrentField.value;
  if (!f) {
    ElMessage.warning('请先选择字段');
    return false;
  }
  if (!advCurrentOperator.value) {
    ElMessage.warning('请先选择操作符');
    return false;
  }
  if (advValueOptions.value.length) {
    if (!advCurrentValues.value.length) {
      ElMessage.warning('请先选择值');
      return false;
    }
    return true;
  }
  const raw = advInput.value.trim();
  if (!raw) {
    ElMessage.warning('请先输入值');
    return false;
  }
  const values = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (!values.length) {
    ElMessage.warning('请先输入值');
    return false;
  }
  // 格式校验（保持原有提示）
  if (f.valueType === 'ip' && values.some((v) => !validateIp(v))) {
    ElMessage.warning('仅支持IP格式');
    return false;
  }
  if ((f.valueType === 'port' || f.valueType === 'number') && values.some((v) => !validatePort(v))) {
    ElMessage.warning('仅支持端口格式');
    return false;
  }
  if (f.valueType === 'protocol' && values.some((v) => !validateProtocol(v))) {
    ElMessage.warning('仅支持tcp,udp,icmp格式');
    return false;
  }
  advCurrentValues.value = values;
  return true;
}

function advFinalizeCondition() {
  const f = advCurrentField.value!;
  const token: AdvToken = {
    id: `t-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type: 'condition',
    field: f,
    operator: advCurrentOperator.value,
    values: [...advCurrentValues.value],
  };
  advTokens.value = [...advTokens.value, token];
  advCurrentField.value = null;
  advCurrentOperator.value = '';
  advCurrentValues.value = [];
  advInput.value = '';
  advPhase.value = 'field';
  advCloseMenu();
}

function advSelectConnector(conn: 'end' | 'and' | 'or') {
  // 约束：连接词可跟在「值」后（有字段）或「固化条件」后（最后 token 为 condition 或 )）
  const lastToken = advTokens.value[advTokens.value.length - 1];
  const lastCanFollowConnector =
    lastToken?.type === 'condition' ||
    (lastToken?.type === 'paren' && (lastToken as { value?: string }).value === ')');
  const canSelectConnector =
    advCurrentField.value ||
    advPhase.value === 'value' ||
    (advPhase.value === 'connector' && lastCanFollowConnector);
  if (!canSelectConnector) {
    ElMessage.warning('请先选择字段');
    return;
  }
  // 若当前处于 value 阶段，先确认值
  if (advPhase.value === 'value') {
    if (!advConfirmValue()) return;
  }
  // 若有未固化的完整条件（字段+操作符+值），必须先固化
  const hasCompleteCondition =
    advCurrentField.value &&
    advCurrentOperator.value &&
    (advCurrentValues.value.length > 0 || advInput.value.trim());
  if (hasCompleteCondition) {
    // 值仅在 advInput 中时，需先同步到 advCurrentValues
    if (advCurrentValues.value.length === 0 && advInput.value.trim()) {
      if (!advConfirmValue()) return;
    }
    advFinalizeCondition();
  }
  if (conn === 'end') {
    advPhase.value = 'field';
    advCloseMenu();
    return;
  }
  advTokens.value = [
    ...advTokens.value,
    { id: `t-${Date.now()}-${Math.random().toString(36).slice(2)}`, type: 'connector', value: conn },
  ];
  advPhase.value = 'field';
  advCloseMenu();
}

function advInsertParen(p: '(' | ')') {
  advTokens.value = [
    ...advTokens.value,
    { id: `t-${Date.now()}-${Math.random().toString(36).slice(2)}`, type: 'paren', value: p },
  ];
  advInput.value = '';
  advCloseMenu();
  if (p === ')') {
    advPhase.value = 'connector';
    advOpenMenu();
  } else {
    advPhase.value = 'field';
  }
}

function advRemoveToken(id: string) {
  advTokens.value = advTokens.value.filter((t) => t.id !== id);
}

const advPlaceholder = computed(() => {
  if (advPhase.value === 'field') return '输入/选择输入命令格式，逗号多值，“-”范围，“（）”子表达';
  if (advPhase.value === 'operator') return '选择操作符';
  if (advPhase.value === 'value') return advValueOptions.value.length ? '选择值' : '输入值（逗号多值、-范围）';
  return '';
});

function advHandleInput() {
  if (advPhase.value === 'field') {
    if (advInput.value.startsWith('/')) {
      advPhase.value = 'command';
      advFieldFromCommand.value = false;
      advOpenMenu();
      return;
    }
    if (advFieldFromCommand.value) {
      if (advInput.value.trim()) {
        advFieldFromCommand.value = false;
        advSearchFields(advInput.value);
        advMenuOpen.value = true;
        advMenuIndex.value = 0;
      }
      return;
    }
    advSearchFields(advInput.value);
    if (advFieldSuggestions.value.length) {
      advMenuOpen.value = true;
      advMenuIndex.value = 0;
    } else {
      advCloseMenu();
    }
  }
}

function advFieldSearchKeydown(e: Event | KeyboardEvent) {
  if (!(e instanceof KeyboardEvent)) return;
  const list = advDisplayedFieldList.value;
  const len = list.length;
  if (e.key === 'ArrowDown' && len) {
    e.preventDefault();
    advMenuIndex.value = (advMenuIndex.value + 1) % len;
  } else if (e.key === 'ArrowUp' && len) {
    e.preventDefault();
    advMenuIndex.value = (advMenuIndex.value - 1 + len) % len;
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const f = list[advMenuIndex.value];
    if (f) advSelectField(f);
  }
}

function advHandleDelete() {
  // 删除逻辑：从当前构建态或已固化 token 中移除最后一项
  if (advInput.value.trim()) {
    advInput.value = '';
    advCurrentValues.value = [];
    advCloseMenu();
    return;
  }
  if (advCurrentValues.value.length > 0) {
    advCurrentValues.value = [];
    advCloseMenu();
    return;
  }
  if (advCurrentOperator.value) {
    advCurrentOperator.value = '';
    advPhase.value = 'field';
    advCloseMenu();
    return;
  }
  if (advCurrentField.value) {
    advCurrentField.value = null;
    advCurrentOperator.value = '';
    advCurrentValues.value = [];
    advPhase.value = 'field';
    advCloseMenu();
    return;
  }
  if (advTokens.value.length > 0) {
    advTokens.value = advTokens.value.slice(0, -1);
    advCloseMenu();
  }
}

function advHandleKeydown(e: KeyboardEvent) {
  // Delete/Backspace：删除最后输入或最后 token
  if (e.key === 'Delete' || e.key === 'Backspace') {
    advHandleDelete();
    e.preventDefault();
    return;
  }

  // 空输入按 Enter：提示
  if (e.key === 'Enter' && !advMenuOpen.value && !advancedExpressionText.value && !advInput.value.trim() && advPhase.value === 'field') {
    ElMessage.warning('请输入查询条件！');
    e.preventDefault();
    return;
  }

  // 触发快捷：= 进入操作符
  if (e.key === '=' && advPhase.value === 'field' && advCurrentField.value) {
    advPhase.value = 'operator';
    advOpenMenu();
    e.preventDefault();
    return;
  }

  // 括号快捷（仅在非空表达式/或通过命令时生效；空输入按规则仍走字段模糊匹配）
  if ((e.key === '(' || e.key === ')') && advPhase.value !== 'field') {
    advInsertParen(e.key as '(' | ')');
    e.preventDefault();
    return;
  }

  // 方向键选择
  if (advMenuOpen.value && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
    const max =
      advPhase.value === 'command'
        ? advCommands.length
        : advPhase.value === 'operator'
          ? availableOperators.value.length
          : advPhase.value === 'connector'
            ? 3
            : advPhase.value === 'value' && advValueOptions.value.length
              ? advValueOptions.value.length
              : advPhase.value === 'field' && advFieldFromCommand.value
                ? advDisplayedFieldList.value.length
                : advFieldSuggestions.value.length;
    if (max > 0) {
      if (e.key === 'ArrowDown') advMenuIndex.value = (advMenuIndex.value + 1) % max;
      else advMenuIndex.value = (advMenuIndex.value - 1 + max) % max;
      e.preventDefault();
    }
    return;
  }

  // Enter 选择
  if (e.key === 'Enter') {
    e.preventDefault();
    if (advMenuOpen.value) {
      if (advPhase.value === 'command') {
        const cmd = advCommands[advMenuIndex.value];
        if (!cmd) return;
        advSelectCommand(cmd.key);
        return;
      }
      if (advPhase.value === 'field') {
        const f = advFieldFromCommand.value
          ? advDisplayedFieldList.value[advMenuIndex.value]
          : advFieldSuggestions.value[advMenuIndex.value];
        if (f) advSelectField(f);
        return;
      }
      if (advPhase.value === 'operator') {
        const op = availableOperators.value[advMenuIndex.value];
        if (op) advSelectOperator(op);
        return;
      }
      if (advPhase.value === 'value' && advValueOptions.value.length) {
        const v = advValueOptions.value[advMenuIndex.value];
        if (v) advSelectEnumValue(v);
        return;
      }
      if (advPhase.value === 'connector') {
        const opts: Array<'end' | 'and' | 'or'> = ['end', 'and', 'or'];
        const c = opts[advMenuIndex.value];
        if (c) advSelectConnector(c);
        return;
      }
    } else {
      // 未打开菜单时 Enter 的默认行为
      if (advPhase.value === 'value') {
        if (!advConfirmValue()) return;
        advPhase.value = 'connector';
        advOpenMenu();
        return;
      }
      if (advPhase.value === 'field') {
        // 条件完整且连接词已选 end -> 再次 Enter 触发检索
        if (advancedExpressionText.value) {
          doSearch();
        }
      }
    }
  }
}

const resetAdvancedBuilder = () => {
  advTokens.value = [];
  advPhase.value = 'field';
  advInput.value = '';
  advMenuOpen.value = false;
  advMenuIndex.value = 0;
  advFieldSuggestions.value = [];
  advFieldFromCommand.value = false;
  advFieldPanelSearchKeyword.value = '';
  advCurrentField.value = null;
  advCurrentOperator.value = '';
  advCurrentValues.value = [];
};

function validateIp(v: string): boolean {
  const value = v.trim();
  if (!value) return false;
  // 单 IP
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
  // 掩码
  const cidr = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
  // 区间：a-b
  const range = /^(.+)-(.+)$/;
  if (ipv4.test(value)) {
    return value.split('.').every((n) => {
      const num = parseInt(n, 10);
      return num >= 0 && num <= 255;
    });
  }
  if (cidr.test(value)) {
    const segs = value.split('/');
    const ipPart = segs[0];
    const maskPart = segs[1];
    if (!ipPart || maskPart === undefined) return false;
    const mask = parseInt(maskPart, 10);
    if (mask < 0 || mask > 32) return false;
    return ipPart.split('.').every((n) => {
      const num = parseInt(n, 10);
      return num >= 0 && num <= 255;
    });
  }
  const rangeMatch = value.match(range);
  if (rangeMatch) {
    const left = rangeMatch[1]?.trim() ?? '';
    const right = rangeMatch[2]?.trim() ?? '';
    if (!left || !right) return false;
    return validateIp(left) && validateIp(right);
  }
  return false;
}
function validatePort(v: string): boolean {
  const value = v.trim();
  if (!value) return false;
  // 单端口
  if (/^\d+$/.test(value)) {
    const n = parseInt(value, 10);
    return !Number.isNaN(n) && n >= 1 && n <= 65535;
  }
  // 区间
  const m = value.match(/^(\d+)-(\d+)$/);
  if (m) {
    const start = parseInt(m[1] ?? '0', 10);
    const end = parseInt(m[2] ?? '0', 10);
    if ([start, end].some((n) => Number.isNaN(n))) return false;
    if (start < 1 || end > 65535) return false;
    return start <= end;
  }
  return false;
}
function validateProtocol(v: string): boolean {
  return /^(tcp|udp|icmp)$/i.test(v.trim());
}

function validateAdvancedInput(): string | null {
  // 未完成条件阻断
  if (advCurrentField.value || advCurrentOperator.value || advInput.value.trim() || advCurrentValues.value.length) {
    return '请先完成当前条件';
  }
  return null;
}

function normalizeMatchModeLocal(m: string | undefined): SearchParams['matchMode'] {
  if (m === 'all') return 'partial';
  if (m === 'include') return 'fullInclude';
  if (m === 'fullInclude' || m === 'exclude' || m === 'equal' || m === 'partial') return m;
  return 'partial';
}

const searchParams = computed<SearchParams>(() => {
  const base: SearchParams = {
    anyMode: anyMode.value,
    matchMode: matchMode.value,
    deviceIds: selectedDeviceIds.value,
    tagFilters: tagFilters.value,
    searchMode: searchMode.value,
  };
  if (searchMode.value === 'advanced') {
    const q = appliedAdvancedQueryRef.value ?? advancedExpressionText.value;
    return { ...base, queryText: q?.trim() || undefined };
  }
  return {
    ...base,
    normalQueryText: searchInput.value.trim() || undefined,
  };
});

function getSearchInputFromParams(p: Partial<SearchParams>): string {
  if (p?.searchMode === 'advanced' && p?.queryText) return p.queryText;
  if (p?.normalQueryText) return p.normalQueryText;
  const arr = [p?.policyNameOrId, p?.action, p?.srcIp, p?.dstIp, p?.port].filter(Boolean);
  return arr.join(' ');
}

const doSearch = () => {
  if (searchMode.value === 'advanced') {
    const err = validateAdvancedInput();
    if (err) {
      ElMessage.warning(err);
      return;
    }
  }
  fieldDistFilterLabel.value = null;
  loading.value = true;
  currentPage.value = 1;
  setTimeout(() => {
    const res = searchPolicies(searchParams.value);
    tableData.value = res.items;
    total.value = res.total;
    tagStats.value = res.tagStats;
    loading.value = false;
  }, 300);
};

// reset 时不触发 watch 自动检索与“未完成条件”提示
const suppressAutoSearch = ref(false);

const resetSearch = () => {
  suppressAutoSearch.value = true;
  searchInput.value = '';
  anyMode.value = '';
  matchMode.value = 'partial';
  tagFilters.value = [];
  fieldDistFilterLabel.value = null;
  appliedAdvancedQueryRef.value = null;
  resetAdvancedBuilder();
  setTimeout(() => {
    suppressAutoSearch.value = false;
    doSearch();
  }, 0);
};

const toggleToAdvancedMode = () => {
  searchMode.value = 'advanced';
  appliedAdvancedQueryRef.value = null;
  searchInput.value = advancedExpressionText.value || '';
};
const toggleToNormalMode = () => {
  searchMode.value = 'normal';
  appliedAdvancedQueryRef.value = null;
};

function switchSearchMode(mode: 'normal' | 'advanced') {
  fieldDistFilterLabel.value = null;
  if (mode === 'advanced') toggleToAdvancedMode();
  else toggleToNormalMode();
}

/** 供模板中模式切换按钮使用，避免 v-if 分支内对 searchMode 类型收窄导致误判 */
function isSearchMode(mode: 'normal' | 'advanced') {
  return searchMode.value === mode;
}

const onSearchKeydown = (e: Event) => {
  if (searchMode.value === 'advanced') return;
  if ((e as KeyboardEvent).key === 'Enter') doSearch();
};

// 常用检索
const commonSearches = ref<CommonSearchItem[]>([]);
const loadCommonSearches = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    commonSearches.value = raw ? JSON.parse(raw) : [];
  } catch {
    commonSearches.value = [];
  }
};
const saveAsCommon = () => {
  if (searchMode.value === 'advanced') {
    if (!advancedExpressionText.value?.trim()) {
      ElMessage.warning('请输入检索条件后再收藏');
      return;
    }
  } else if (!searchInput.value.trim()) {
    ElMessage.warning('请输入检索条件后再收藏');
    return;
  }
  const list = [...commonSearches.value];
  const item: CommonSearchItem = {
    id: Date.now().toString(),
    label:
      searchMode.value === 'advanced'
        ? advancedExpressionText.value?.slice(0, 20) || '未命名条件'
        : searchInput.value?.slice(0, 20) || '未命名条件',
    params: { ...searchParams.value },
    createdAt: Date.now(),
  };
  list.unshift(item);
  if (list.length > MAX_COMMON) list.length = MAX_COMMON;
  commonSearches.value = list;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  ElMessage.success('已收藏，常用检索已同步');
};
const removeCommon = (id: string) => {
  commonSearches.value = commonSearches.value.filter((c) => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(commonSearches.value));
};
const applyCommon = (item: CommonSearchItem) => {
  const p = item.params;
  if (p.searchMode === 'advanced' && p.queryText) {
    appliedAdvancedQueryRef.value = p.queryText as string;
  } else {
    appliedAdvancedQueryRef.value = null;
  }
  if (p.searchMode) {
    searchMode.value = p.searchMode;
  } else if (p.queryText && !p.normalQueryText) {
    searchMode.value = 'advanced';
  } else {
    searchMode.value = 'normal';
  }
  searchInput.value =
    p && 'queryText' in p && p.queryText && searchMode.value === 'advanced'
      ? (p.queryText as string)
      : getSearchInputFromParams(p ?? {}) ?? '';
  if (p?.anyMode !== undefined) anyMode.value = p.anyMode;
  if (p?.matchMode) matchMode.value = normalizeMatchModeLocal(p.matchMode as string);
  if (p?.tagFilters) tagFilters.value = p.tagFilters ?? [];
  doSearch();
};

// ---------- 标签统计（可折叠） ----------
const tagStatsCollapsed = ref(true);
const tagStats = ref(mockTagStats);
const toggleTagStats = () => {
  tagStatsCollapsed.value = !tagStatsCollapsed.value;
};
function refreshTagStats() {
  doSearch();
}

// 标签过滤 - 大类开关（未勾选则整类不展示，子项勾选无效）；子项在勾选大类后生效
const tagSettingVisible = ref(false);
const lifecycleCategoryEnabled = ref(true);
const qualityCategoryEnabled = ref(true);
const riskCategoryEnabled = ref(true);
const businessCategoryEnabled = ref(true);
const lifecycleVisibleKeys = ref<string[]>(Object.keys(mockTagStats.lifecycle));
const qualityVisibleKeys = ref<string[]>(Object.keys(mockTagStats.quality));
const riskVisibleKeys = ref<string[]>(Object.keys(mockTagStats.risk ?? {}));
const businessVisibleKeys = ref<string[]>(Object.keys(mockTagStats.business).slice(0, 10));

const LIFECYCLE_LABELS: Record<string, string> = {
  disabled: '已停用',
  expired: '已过期',
  expire5d: '5天内到期',
  expire30d: '30天内到期',
  archiveMissing: '档案缺失',
};
const QUALITY_LABELS: Record<string, string> = {
  redundant: '冗余',
  conflict: '冲突',
  hidden: '隐藏拒绝',
  duplicate: '重复',
  emptyZone: '空区域',
  emptyObject: '空对象',
};
const RISK_LABELS: Record<string, string> = {
  matrixViolation: '矩阵访问违规',
  highRiskPort: '高危端口违规',
  containsAny: '含any策略',
  broadPolicy: '宽泛策略',
  logDisabled: '日志未启用',
  remarkEmpty: '备注为空',
};
const OPTIMIZE_LABELS: Record<string, string> = {
  ...Object.fromEntries(Object.entries(RISK_LABELS).map(([k, v]) => [k, v])),
  redundant: '冗余策略',
  conflict: '冲突策略',
  hidden: '隐藏拒绝',
  duplicate: '重复策略',
  emptyZone: '空区域',
  emptyObject: '空对象',
  invalid: '无效',
  zombie: '僵尸策略',
};

const LIFECYCLE_TOOLTIP = '已过期：引用时间对象已过有效期\n已停用：策略状态为已停用\n5天内到期：还有5天即将过期的策略\n30天内到期：还有30天即将过期的策略\n档案缺失：档案信息为空的策略';
const QUALITY_TOOLTIP = '冗余：小范围允许策略（含源/目的域、源/目的IP、服务），被高优先级高的大范围允许策略完全包含，小范围允许策略冗余\n冲突：源IP、目的IP、服务、源和目的区域相同，动作不同的策略\n隐藏拒绝：小范围拒绝策略（含源/目的域、源/目的IP、服务），被高优先级高的大范围允许策略完全包含\n重复：源/目的域、源/目的IP、服务、动作都完全相同的策略\n空区域：源区域或目的区域为空的策略\n空对象：引用对象为空的策略';
const RISK_TOOLTIP = '矩阵访问违规：不符合合规矩阵访问规则的策略\n高危端口违规：含高危端口的策略\n含any策略：策略源/目的/服务任意包含any\n宽泛策略：IP数量或端口数量>阈值数量的\n日志未启用：未启用日志的策略\n备注为空：无备注信息的策略';
const BUSINESS_TOOLTIP = '用户自定义标签';

const visibleLifecycleEntries = computed(() =>
  Object.entries(tagStats.value.lifecycle)
    .filter(([k]) => lifecycleVisibleKeys.value.includes(k))
    .map(([k, v]) => ({ key: k, label: LIFECYCLE_LABELS[k] ?? k, count: v }))
);
const visibleQualityEntries = computed(() =>
  Object.entries(tagStats.value.quality)
    .filter(([k]) => qualityVisibleKeys.value.includes(k))
    .map(([k, v]) => ({ key: k, label: QUALITY_LABELS[k] ?? k, count: v }))
);
const visibleRiskEntries = computed(() =>
  Object.entries(tagStats.value.risk ?? {})
    .filter(([k]) => riskVisibleKeys.value.includes(k))
    .map(([k, v]) => ({ key: k, label: RISK_LABELS[k] ?? k, count: v }))
);
const visibleBusinessEntries = computed(() =>
  Object.entries(tagStats.value.business)
    .filter(([k]) => businessVisibleKeys.value.includes(k))
    .map(([k, v]) => ({ key: k, label: k, count: v }))
);
const allBusinessEntries = computed(() =>
  Object.entries(tagStats.value.business).map(([k, v]) => ({ key: k, label: k, count: v }))
);
const businessMoreVisible = ref(false);
const addBusinessVisible = ref(false);
const addBusinessName = ref('');
const editBusinessVisible = ref(false);
const editBusinessName = ref('');
const editBusinessOriginal = ref('');

function openAddBusiness() {
  addBusinessName.value = '';
  addBusinessVisible.value = true;
}
function saveAddBusiness() {
  const name = addBusinessName.value.trim();
  if (!name) return;
  if (!(name in tagStats.value.business)) tagStats.value.business[name] = 0;
  if (!businessVisibleKeys.value.includes(name) && businessVisibleKeys.value.length < 10) {
    businessVisibleKeys.value = [...businessVisibleKeys.value, name];
  }
  addBusinessVisible.value = false;
}
function openEditBusiness(name: string) {
  editBusinessOriginal.value = name;
  editBusinessName.value = name;
  editBusinessVisible.value = true;
}
function saveEditBusiness() {
  const from = editBusinessOriginal.value;
  const to = editBusinessName.value.trim();
  if (!from || !to) return;
  if (from === to) {
    editBusinessVisible.value = false;
    return;
  }
  const count = tagStats.value.business[from] ?? 0;
  delete tagStats.value.business[from];
  tagStats.value.business[to] = count;
  businessVisibleKeys.value = businessVisibleKeys.value.map((k) => (k === from ? to : k));
  // 已选过滤项也同步 label
  tagFilters.value = tagFilters.value.map((f) => (f.category === 'business' && f.label === from ? { ...f, label: to, key: to } : f));
  editBusinessVisible.value = false;
}
function deleteBusiness(name: string) {
  ElMessageBox.confirm('是否删除该业务标签？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      delete tagStats.value.business[name];
      businessVisibleKeys.value = businessVisibleKeys.value.filter((k) => k !== name);
      tagFilters.value = tagFilters.value.filter((f) => !(f.category === 'business' && f.label === name));
    })
    .catch(() => {});
}

const toggleTagFilter = (category: 'lifecycle' | 'quality' | 'risk' | 'business', key: string, _label: string) => {
  const item: TagFilterItem = { category, key, label: _label || key };
  const idx = tagFilters.value.findIndex((f) => f.category === category && f.key === key);
  if (idx >= 0) tagFilters.value = tagFilters.value.filter((_, i) => i !== idx);
  else tagFilters.value = [...tagFilters.value, item];
  doSearch();
};

const isTagSelected = (category: string, key: string) =>
  tagFilters.value.some((f) => f.category === category && f.key === key);

// ---------- 列表与分页 ----------
const loading = ref(false);
const tableData = ref<PolicyRow[]>([]);
/** 条件分布：点击标签后仅保留该字段命中当前检索词的行 */
const fieldDistFilterLabel = ref<string | null>(null);

/** 有检索/条件可清空时显示重置按钮 */
const showResetSearchIcon = computed(() => {
  if (searchMode.value === 'normal') {
    if (searchInput.value.trim()) return true;
    if (anyMode.value === 'include' || anyMode.value === 'exclude') return true;
    if (matchMode.value !== 'partial') return true;
    if (fieldDistFilterLabel.value) return true;
    return false;
  }
  const expr = (appliedAdvancedQueryRef.value ?? advancedExpressionText.value ?? '').trim();
  if (expr) return true;
  if (advTokens.value.length > 0) return true;
  if (advInput.value.trim()) return true;
  if (advCurrentField.value || advCurrentOperator.value || advCurrentValues.value.length > 0) return true;
  return false;
});

watch(searchInput, () => {
  fieldDistFilterLabel.value = null;
});
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
  if (tableResizeObserver && policyTableContainerRef.value) {
    tableResizeObserver.disconnect();
    tableResizeObserver = null;
  }
});
const total = ref(0);
const pageSize = ref(10);
const currentPage = ref(1);

function toggleFieldDistFilter(label: string) {
  if (fieldDistFilterLabel.value === label) {
    fieldDistFilterLabel.value = null;
  } else {
    fieldDistFilterLabel.value = label;
    currentPage.value = 1;
  }
}

function createEmptyRow(): PolicyRow {
  return {
    id: '',
    name: '',
    deviceId: '',
    deviceName: '',
    deviceIp: '',
    enabled: false,
    priority: 0,
    action: 'allow',
    srcZone: '',
    srcIp: [],
    dstZone: '',
    dstIp: [],
    service: [],
    snatRules: [],
    dnatRules: [],
    snatSourceIps: [],
    dnatDest: '',
    lines: [],
    remark: '',
    remarkFlags: {},
    hitCount: 0,
    hitLastTime: '',
    tags: [],
    lifecycleFlags: [],
    qualityFlags: [],
    containsAny: false,
  };
}

const tableDataForPagination = computed(() => {
  const base = tableData.value.filter((r) => r.id);
  if (!fieldDistFilterLabel.value || searchMode.value !== 'normal' || !searchInput.value.trim()) {
    return base;
  }
  const q = searchInput.value.trim();
  return base.filter((r) => policyRowMatchesFieldLabel(r, fieldDistFilterLabel.value!, q));
});

const displayTotal = computed(() => tableDataForPagination.value.length);

watch(displayTotal, (t) => {
  const maxP = Math.max(1, Math.ceil(t / pageSize.value) || 1);
  if (currentPage.value > maxP) currentPage.value = maxP;
});

const paginatedTableData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const slice = tableDataForPagination.value.slice(start, start + pageSize.value);
  if (slice.length >= pageSize.value) return slice;
  const padCount = pageSize.value - slice.length;
  return [...slice, ...Array.from({ length: padCount }, () => createEmptyRow())];
});

function indexMethod(index: number) {
  return (currentPage.value - 1) * pageSize.value + index + 1;
}

function onPageChange(page: number) {
  currentPage.value = page;
}
function onSizeChange(size: number) {
  pageSize.value = size;
  currentPage.value = 1;
}

// 操作栏：仅保留详情、回收
const OPERATIONS = [
  { key: 'detail', label: '详情', handler: (row?: PolicyRow) => { if (row?.id) { rowDetailData.value = row; rowDetailVisible.value = true; } } },
  { key: 'recycle', label: '回收', handler: () => { window.location.href = '/work-order'; } },
];
const visibleOps = computed(() => OPERATIONS);

// 策略明细弹窗
const rowDetailVisible = ref(false);
const rowDetailData = ref<PolicyRow | null>(null);
const optimizeVisible = ref(false);

// 策略明细弹窗
const detailMaximized = ref(false);
const TAG_COLORS = ['#67c23a', '#409eff', '#e6a23c', '#f56c6c', '#909399'];
// 策略明细弹窗用虚拟数据
const detailServiceList = [
  { serviceName: '', dstPort: '', protocol: 'ip', srcPort: '', dstIp: '', icmpType: '', icmpCode: '', protocolNo: '' },
  { serviceName: 'https', dstPort: '443', protocol: 'TCP', srcPort: '2309', dstIp: '192.168.10.15', icmpType: '', icmpCode: '', protocolNo: '' },
  { serviceName: 'http', dstPort: '80', protocol: 'TCP', srcPort: '-', dstIp: '192.168.10.15', icmpType: '', icmpCode: '', protocolNo: '' },
];
const detailRefObjects: { type: string; name: string; members: string; excluded: string; effective: string; secPolicy: string; natPolicy: string; source: string }[] = [
  { type: '地址', name: 'Office', members: '192.168.0.2-192.168.0.9', excluded: '192.168.0.7', effective: '192.168.0.2-192.168.0.6,192.168.0.8-192.168.0.9', secPolicy: 'block01,block02', natPolicy: 'snatrul_02,snatrul_19', source: 'object-group ip address Office\n  network 192.168.0.2 255.255.255.248' },
];
const detailAccessList: { srcIp: string; natSrcIp: string; dstIp: string; transformDest: string; dstPort: string; protocol: string; firstTime: string; lastTime: string; count: number; firstLink: string }[] = [
  { srcIp: '192.168.1.5', natSrcIp: '110.1.1.1', dstIp: '10.0.0.5', transformDest: '172.168.8.12:80', dstPort: '80', protocol: 'TCP', firstTime: '2026-03-06 11:10', lastTime: '2026-03-07 12:10', count: 22, firstLink: '专线001' },
  { srcIp: '192.168.1.6', natSrcIp: '-', dstIp: '10.0.0.6', transformDest: '10.0.0.6', dstPort: '443', protocol: 'TCP', firstTime: '2026-03-05 09:00', lastTime: '2026-03-07 14:30', count: 15, firstLink: '专线002' },
];
const detailHitInfo = [
  { label: '策略', percentage: 85, count: 22 },
  { label: '服务', percentage: 70, count: 18 },
  { label: '端口', percentage: 60, count: 15 },
  { label: '源IP', percentage: 45, count: 12 },
  { label: '目的IP', percentage: 55, count: 14 },
];
/** 源 IP hover 行：直接 IP 单独一行，对象名一行 + 对象 IP 每行加点 */
function srcIpHoverLines(row: PolicyRow): string[] {
  const lines: string[] = [];
  for (const item of row.srcIp || []) {
    const objIps = row.srcIpObjectIps?.[item];
    if (objIps?.length) {
      lines.push(item);
      objIps.forEach((ip) => lines.push('·' + ip));
    } else {
      lines.push(item);
    }
  }
  return lines;
}
/** 目的 IP hover 行：同上 */
function dstIpHoverLines(row: PolicyRow): string[] {
  const lines: string[] = [];
  for (const item of row.dstIp || []) {
    const objIps = row.dstIpObjectIps?.[item];
    if (objIps?.length) {
      lines.push(item);
      objIps.forEach((ip) => lines.push('·' + ip));
    } else {
      lines.push(item);
    }
  }
  return lines;
}
/** 服务 hover 行：服务名一行 + 若有对象明细则下一行加点显示协议端口 */
function serviceHoverLines(row: PolicyRow): string[] {
  const lines: string[] = [];
  for (const item of row.service || []) {
    lines.push(item);
    const detail = row.serviceObjectDetails?.[item];
    if (detail) lines.push('·' + detail);
  }
  return lines;
}
function getSecPolicyUrl(name: string): string {
  return `/policy-detail?name=${encodeURIComponent(name)}`;
}
function getNatPolicyUrl(name: string): string {
  return `/nat-detail?name=${encodeURIComponent(name)}`;
}
function gotoSecPolicy(name: string) {
  window.location.href = getSecPolicyUrl(name);
}
function gotoNatPolicy(name?: string) {
  window.location.href = name ? getNatPolicyUrl(name) : '/nat-policy';
}
function gotoTagManage() {
  window.location.href = '/tag-manage'; // 占位，内容待补充
}

// 策略明细-源数据（配置文件格式，多行）
const detailSourceData = computed(() => {
  const d = rowDetailData.value;
  if (!d) return '';
  return `rule permit tcp source ${(d.srcIp && d.srcIp[0]) || 'any'} destination ${(d.dstIp && d.dstIp[0]) || 'any'} service ${(d.service && d.service[0]) || 'any'}`;
});

// 批量操作
const selectedRows = ref<PolicyRow[]>([]);
function onSelectionChange(rows: PolicyRow[]) {
  selectedRows.value = rows;
}
const batchCommandVisible = ref(false);

// ---------- 列设置 ----------
interface ColumnDef {
  key: string;
  label: string;
  visible: boolean;
  fixed: 'left' | 'right' | false | '';
  order: number;
  checked?: boolean;
}
interface ColumnTemplate {
  id: string;
  name: string;
  columns: ColumnDef[];
}
const COLUMN_STORAGE_KEY = 'securityPolicy.columnTemplates';

const defaultColumnDefs: ColumnDef[] = [
  { key: 'deviceInfo', label: '设备信息', visible: true, fixed: false, order: 0 },
  { key: 'policyInfo', label: '策略信息', visible: true, fixed: false, order: 1 },
  { key: 'src', label: '源', visible: true, fixed: false, order: 2 },
  { key: 'dst', label: '目的', visible: true, fixed: false, order: 3 },
  { key: 'service', label: '服务', visible: true, fixed: false, order: 4 },
  { key: 'action', label: '动作', visible: true, fixed: false, order: 5 },
  { key: 'optimizeType', label: '优化类型', visible: true, fixed: false, order: 6 },
  { key: 'statusPriority', label: '状态/优先级', visible: true, fixed: false, order: 7 },
  { key: 'natInfo', label: 'NAT信息', visible: true, fixed: false, order: 8 },
  { key: 'archive', label: '档案', visible: true, fixed: false, order: 9 },
  { key: 'remark', label: '策略备注', visible: true, fixed: false, order: 10 },
];

function deepCloneCols(cols: ColumnDef[]): ColumnDef[] {
  return cols.map((c) => ({ ...c, checked: false }));
}

const columnSettingVisible = ref(false);
const columnSettingKeyword = ref('');
const columnSettingTemplate = ref('default');
const columnDefs = ref<ColumnDef[]>(deepCloneCols(defaultColumnDefs));

const defaultTemplate: ColumnTemplate = { id: 'default', name: '默认列表', columns: defaultColumnDefs };
const columnTemplates = ref<ColumnTemplate[]>([defaultTemplate]);

try {
  const stored = localStorage.getItem(COLUMN_STORAGE_KEY);
  if (stored) {
    const parsed = JSON.parse(stored) as ColumnTemplate[];
    if (Array.isArray(parsed) && parsed.length) {
      columnTemplates.value = [defaultTemplate, ...parsed.filter((t) => t.id !== 'default')];
    }
  }
} catch {
  /* ignore */
}

const filteredColumnDefs = computed(() => {
  const kw = columnSettingKeyword.value.trim().toLowerCase();
  if (!kw) return [...columnDefs.value].sort((a, b) => a.order - b.order);
  return [...columnDefs.value]
    .filter((c) => c.label.toLowerCase().includes(kw))
    .sort((a, b) => a.order - b.order);
});

function filterColumnList() {
  // Enter 触发过滤，computed 已响应 keyword，无需额外逻辑
}

function onColumnTemplateChange(id: string) {
  const t = columnTemplates.value.find((x) => x.id === id);
  if (t) columnDefs.value = deepCloneCols(t.columns);
}

function resetColumnTemplate() {
  columnSettingTemplate.value = 'default';
  columnDefs.value = deepCloneCols(defaultColumnDefs);
}

function batchColumnOp(op: 'hide' | 'show' | 'pinTop' | 'pinBottom' | 'moveUp' | 'moveDown') {
  const checked = columnDefs.value.filter((c) => c.checked);
  if (!checked.length) {
    ElMessage.warning('请先勾选要操作的列');
    return;
  }
  const sorted = [...columnDefs.value].sort((a, b) => a.order - b.order);
  const keys = new Set(checked.map((c) => c.key));
  if (op === 'hide') {
    checked.forEach((c) => (c.visible = false));
  } else if (op === 'show') {
    checked.forEach((c) => (c.visible = true));
  } else if (op === 'pinTop') {
    let minOrder = Math.min(...sorted.map((c) => c.order));
    checked.forEach((c) => {
      c.fixed = 'left';
      c.order = --minOrder;
    });
  } else if (op === 'pinBottom') {
    let maxOrder = Math.max(...sorted.map((c) => c.order));
    checked.forEach((c) => {
      c.fixed = 'right';
      c.order = ++maxOrder;
    });
  } else if (op === 'moveUp') {
    checked.forEach((c) => {
      const idx = sorted.findIndex((x) => x.key === c.key);
      if (idx > 0) {
        const prev = sorted[idx - 1];
        if (prev && !keys.has(prev.key)) {
          [c.order, prev.order] = [prev.order, c.order];
        }
      }
    });
  } else if (op === 'moveDown') {
    checked.forEach((c) => {
      const idx = sorted.findIndex((x) => x.key === c.key);
      if (idx >= 0 && idx < sorted.length - 1) {
        const next = sorted[idx + 1];
        if (next && !keys.has(next.key)) {
          [c.order, next.order] = [next.order, c.order];
        }
      }
    });
  }
}

const saveTemplateVisible = ref(false);
const saveTemplateName = ref('');
function openSaveColumnTemplate() {
  saveTemplateName.value = '';
  saveTemplateVisible.value = true;
}
function saveColumnTemplate() {
  const name = saveTemplateName.value.trim();
  if (!name) {
    ElMessage.warning('请输入模版名称');
    return;
  }
  const id = `tpl_${Date.now()}`;
  const tpl: ColumnTemplate = {
    id,
    name,
    columns: columnDefs.value.map(({ key, label, visible, fixed, order }) => ({
      key,
      label,
      visible,
      fixed,
      order,
    })),
  };
  const extra = columnTemplates.value.filter((t) => t.id !== 'default');
  columnTemplates.value = [defaultTemplate, ...extra, tpl];
  columnSettingTemplate.value = id;
  localStorage.setItem(
    COLUMN_STORAGE_KEY,
    JSON.stringify(columnTemplates.value.filter((t) => t.id !== 'default'))
  );
  saveTemplateVisible.value = false;
  ElMessage.success('已保存');
}

watch(
  [selectedDeviceIds, tagFilters],
  () => {
    if (suppressAutoSearch.value) return;
    doSearch();
  },
  { deep: true }
);

function natRulesTooltip(rules: NatRule[] | undefined): string {
  return rules?.map((r) => `${r.fromIp}转${r.toIp}:${r.ruleName}${r.valid ? '有效' : '无效'}`).join('\n') || '';
}
function optimizeTagsDisplay(row: PolicyRow): string[] {
  const risk = (row.riskFlags || []).map((k) => OPTIMIZE_LABELS[k] ?? RISK_LABELS[k] ?? k);
  const quality = (row.qualityFlags || []).map((k) => OPTIMIZE_LABELS[k] ?? QUALITY_LABELS[k] ?? k);
  return [...risk, ...quality];
}
function optimizeTagsTip(row: PolicyRow): string {
  return optimizeTagsDisplay(row).join('，') || '-';
}
const optimizeDialogRow = ref<PolicyRow | null>(null);
function openOptimizeDialog(row: PolicyRow) {
  optimizeDialogRow.value = row;
  optimizeVisible.value = true;
}
// 档案格式：业务标签(逗号)｜业务员系统｜用途｜申请人｜负责人｜工单号｜执行人/日期。专线来自 row.lines 不存档案。
function parseArchive(archive: string) {
  const s = (archive || '').split('｜');
  if (s.length >= 7) {
    return {
      businessTags: s[0] ? s[0].split(',').map((t) => t.trim()).filter(Boolean) : [],
      business: s[1] || '',
      purpose: s[2] || '',
      applicant: s[3] || '',
      owner: s[4] || '',
      ticket: s[5] || '',
      executorDate: s[6] || '',
    };
  }
  return {
    businessTags: [] as string[],
    business: s[0] || '',
    purpose: s[1] || '',
    applicant: s[2] || '',
    owner: s[3] || '',
    ticket: s[4] || '',
    executorDate: s[5] || '',
  };
}
function buildArchiveString(p: { businessTags: string[]; business: string; purpose: string; applicant: string; owner: string; ticket: string; executorDate: string }) {
  const tags = p.businessTags.join(',');
  const core = [p.business, p.purpose, p.applicant, p.owner, p.ticket, p.executorDate];
  const prefix = tags ? `${tags}｜` : '';
  return prefix + core.join('｜');
}
function formatArchiveDisplay(row: PolicyRow) {
  const parsed = parseArchive(row.archive || '');
  const tagsStr = parsed.businessTags.join('，');
  const core = [parsed.business, parsed.purpose, parsed.applicant, parsed.owner, parsed.ticket, parsed.executorDate].filter(Boolean).join('｜');
  const linesStr = (row.lines || []).join('，');
  const parts: string[] = [];
  if (tagsStr) parts.push(tagsStr);
  if (core) parts.push(core);
  if (linesStr) parts.push(linesStr);
  return parts.join(' | ') || '';
}

const archiveEditVisible = ref(false);
const archiveEditRow = ref<PolicyRow | null>(null);
const archiveForm = ref({
  businessTags: [] as BusinessTagItem[],
  business: '',
  purpose: '',
  applicant: '',
  owner: '',
  ticket: '',
  executorDate: '',
});
const archiveBusinessTagPopoverVisible = ref(false);
const archiveAddTagVisible = ref(false);
const archiveNewTagName = ref('');
const businessTagListForEdit = ref<BusinessTagItem[]>([]);
const archiveSelectedTagIds = ref<string[]>([]);

function displayTagsShort(tags: BusinessTagItem[], max = 2) {
  if (!tags.length) return '';
  if (tags.length <= max) return tags.map((t) => t.name).join('，');
  return tags.slice(0, max).map((t) => t.name).join('，') + ` +${tags.length - max}`;
}

function openArchiveEdit(row: PolicyRow) {
  archiveEditRow.value = row;
  const parsed = parseArchive(row.archive || '');
  businessTagListForEdit.value = [...mockBusinessTagList];
  const tagNames = parsed.businessTags;
  archiveSelectedTagIds.value = businessTagListForEdit.value.filter((t) => tagNames.includes(t.name)).map((t) => t.id);
  const selectedTags = businessTagListForEdit.value.filter((t) => archiveSelectedTagIds.value.includes(t.id));
  archiveForm.value = {
    businessTags: selectedTags,
    business: parsed.business,
    purpose: parsed.purpose,
    applicant: parsed.applicant,
    owner: parsed.owner,
    ticket: parsed.ticket,
    executorDate: parsed.executorDate,
  };
  archiveBusinessTagPopoverVisible.value = false;
  archiveAddTagVisible.value = false;
  archiveNewTagName.value = '';
  archiveEditVisible.value = true;
}
watch(archiveSelectedTagIds, (ids) => {
  archiveForm.value.businessTags = businessTagListForEdit.value.filter((t) => ids.includes(t.id));
}, { deep: true });
function saveArchiveAddTag() {
  const name = archiveNewTagName.value.trim();
  if (!name) {
    ElMessage.warning('标签名称必填');
    return;
  }
  const newTag: BusinessTagItem = {
    id: `tag-new-${Date.now()}`,
    name,
    createdAt: new Date().toLocaleString('zh-CN'),
    createdBy: '当前用户',
  };
  businessTagListForEdit.value = [...businessTagListForEdit.value, newTag];
  archiveSelectedTagIds.value = [...archiveSelectedTagIds.value, newTag.id];
  archiveForm.value.businessTags = [...archiveForm.value.businessTags, newTag];
  archiveAddTagVisible.value = false;
  archiveNewTagName.value = '';
  ElMessage.success('已添加标签');
}
function saveArchiveEdit() {
  const row = archiveEditRow.value;
  if (!row) return;
  const tagNames = archiveForm.value.businessTags.map((t) => t.name);
  row.archive = buildArchiveString({
    businessTags: tagNames,
    business: archiveForm.value.business,
    purpose: archiveForm.value.purpose,
    applicant: archiveForm.value.applicant,
    owner: archiveForm.value.owner,
    ticket: archiveForm.value.ticket,
    executorDate: archiveForm.value.executorDate,
  });
  archiveEditVisible.value = false;
}

const archiveEditBatchVisible = ref(false);
const archiveBatchPolicies = ref<PolicyRow[]>([]);
const archiveBatchPolicyIds = ref<string[]>([]);
const archiveBatchPolicyPopoverVisible = ref(false);
const archiveBatchForm = ref({
  businessTags: [] as BusinessTagItem[],
  business: '',
  purpose: '',
  applicant: '',
  owner: '',
  ticket: '',
  executorDate: '',
});
const archiveBatchSelectedTagIds = ref<string[]>([]);
const archiveBatchTagList = ref<BusinessTagItem[]>([]);
const archiveBatchTagPopoverVisible = ref(false);
const archiveBatchPolicyTableRef = ref<InstanceType<typeof ElTable> | null>(null);

function displayPoliciesShort(policies: PolicyRow[], max = 2) {
  if (!policies.length) return '';
  if (policies.length <= max) return policies.map((p) => p.name).join('，');
  return policies.slice(0, max).map((p) => p.name).join('，') + ` +${policies.length - max}`;
}

function openArchiveEditBatch() {
  const sel = selectedRows.value.length ? [...selectedRows.value] : [];
  archiveBatchPolicies.value = sel;
  archiveBatchPolicyIds.value = sel.map((r) => r.id);
  archiveBatchTagList.value = [...mockBusinessTagList];
  archiveBatchForm.value = {
    businessTags: [],
    business: '',
    purpose: '',
    applicant: '',
    owner: '',
    ticket: '',
    executorDate: '',
  };
  archiveBatchSelectedTagIds.value = [];
  archiveBatchPolicyPopoverVisible.value = false;
  archiveBatchTagPopoverVisible.value = false;
  archiveEditBatchVisible.value = true;
}
watch(archiveBatchPolicyPopoverVisible, (visible) => {
  if (visible && archiveBatchPolicyIds.value.length) {
    nextTick(() => {
      const tbl = archiveBatchPolicyTableRef.value;
      if (tbl) {
        tableData.value.forEach((r) => {
          tbl.toggleRowSelection(r, archiveBatchPolicyIds.value.includes(r.id));
        });
      }
    });
  }
});
function onArchiveBatchPolicyChange(rows: PolicyRow[]) {
  archiveBatchPolicies.value = rows;
  archiveBatchPolicyIds.value = rows.map((r) => r.id);
}
watch(archiveBatchSelectedTagIds, (ids) => {
  archiveBatchForm.value.businessTags = archiveBatchTagList.value.filter((t) => ids.includes(t.id));
}, { deep: true });
function saveArchiveEditBatch() {
  const policies = archiveBatchPolicies.value;
  if (!policies.length) {
    ElMessage.warning('请选择策略');
    return;
  }
  const f = archiveBatchForm.value;
  const tagNames = f.businessTags.map((t) => t.name);
  policies.forEach((row) => {
    const parsed = parseArchive(row.archive || '');
    const updates = {
      businessTags: tagNames.length ? tagNames : parsed.businessTags,
      business: f.business || parsed.business,
      purpose: f.purpose || parsed.purpose,
      applicant: f.applicant || parsed.applicant,
      owner: f.owner || parsed.owner,
      ticket: f.ticket || parsed.ticket,
      executorDate: f.executorDate || parsed.executorDate,
    };
    row.archive = buildArchiveString(updates);
  });
  ElMessage.success('档案已更新');
  archiveEditBatchVisible.value = false;
}
const tagEditVisible = ref(false);
const expireExportVisible = ref(false);

const tagEditPolicies = ref<PolicyRow[]>([]);
const tagEditPolicyIds = ref<string[]>([]);
const tagEditTagIds = ref<string[]>([]);
const tagEditPolicyPopoverVisible = ref(false);
const tagEditTagPopoverVisible = ref(false);
const tagListForEdit = computed(() =>
  Object.entries(tagStats.value.business).map(([name]) => ({ id: name, name, remark: '' }))
);
const tagEditPolicyDisplay = computed(() =>
  tagEditPolicies.value.map((r) => r.name).join('，')
);
const tagEditTagDisplay = computed(() =>
  tagEditTagIds.value
    .map((id) => tagListForEdit.value.find((t) => t.id === id)?.name ?? id)
    .join('，')
);
watch(tagEditPolicyPopoverVisible, (visible) => {
  if (visible && tagEditPolicyIds.value.length) {
    nextTick(() => {
      const tbl = tagEditPolicyTableRef.value;
      if (tbl) {
        tableData.value.forEach((r) => {
          tbl.toggleRowSelection(r, tagEditPolicyIds.value.includes(r.id));
        });
      }
    });
  }
});
function saveTagEdit() {
  ElMessage.info('保存成功（占位）');
  tagEditVisible.value = false;
}
function cancelTagEdit() {
  tagEditVisible.value = false;
}
const tagEditPolicyTableRef = ref<InstanceType<typeof ElTable> | null>(null);
function onTagEditPolicySelectionChange(rows: PolicyRow[]) {
  tagEditPolicies.value = rows;
  tagEditPolicyIds.value = rows.map((r) => r.id);
}

const natDialogVisible = ref(false);
const natDialogData = ref<{
  type: 'snat' | 'dnat';
  rules: PolicyRow['snatRules'] | PolicyRow['dnatRules'];
  title: string;
} | null>(null);
const natSelectedRules = ref<NatRule[]>([]);
function openNatDialog(row: PolicyRow, type: 'snat' | 'dnat') {
  const rules = type === 'snat' ? row.snatRules : row.dnatRules;
  if (!rules?.length) return;
  natDialogData.value = {
    type,
    rules,
    title: type === 'snat' ? '源NAT关联信息' : '目的NAT关联信息',
  };
  natDialogVisible.value = true;
}
function onNatSelectionChange(rows: NatRule[]) {
  natSelectedRules.value = rows;
}

// 初始加载
loadCommonSearches();
doSearch();
</script>

<template>
  <PageContent class="security-policy-page">
    <div class="security-policy-layout">
      <!-- 左侧设备树（固定高度、独立滚动） -->
      <div class="left-panel">
        <div class="panel-title-row">
          <span class="panel-title">设备（{{ deviceCount }}）</span>
          <ElTooltip content="添加设备">
            <span class="device-add-icon" @click="ElMessage.info('添加设备（占位）')">
              <ElIcon :size="20"><CirclePlus /></ElIcon>
            </span>
          </ElTooltip>
        </div>
        <ElInput
          v-model="deviceKeyword"
          size="small"
          class="device-search"
          placeholder="输入关键字"
          clearable
          @keydown.enter.prevent
        />
        <div class="tree-wrap">
          <ElTree
            :data="treeData"
            :props="defaultProps"
            show-checkbox
            node-key="id"
            :default-expand-all="true"
            @check="handleTreeCheck"
            @node-contextmenu="onTreeContextMenu"
          >
            <template #default="{ node, data }">
              <span class="tree-node">
                <span v-if="!data.isGroup" class="node-icon">{{ getNodeIcon(data) }}</span>
                <span class="node-label">{{ node.label }}</span>
                <span v-if="!data.isGroup" class="node-ops" @click.stop>
                  <ElDropdown trigger="click" placement="right-start">
                    <span class="node-ops__btn">
                      <ElIcon><MoreFilled /></ElIcon>
                    </span>
                    <template #dropdown>
                      <ElDropdownMenu>
                        <ElDropdownItem @click="handleDeviceManage">设备管理</ElDropdownItem>
                        <ElDropdownItem @click="handleDeviceDetail">设备详情</ElDropdownItem>
                        <ElDropdownItem @click="handleConfigUpdate">配置更新</ElDropdownItem>
                        <ElDropdownItem @click="downloadDeviceConfig(data.device)">配置下载</ElDropdownItem>
                        <ElDropdownItem @click="openDeviceProps(data.device)">属性</ElDropdownItem>
                        <ElDropdownItem divided @click="handleDeviceDelete">设备删除</ElDropdownItem>
                      </ElDropdownMenu>
                    </template>
                  </ElDropdown>
                </span>
              </span>
            </template>
          </ElTree>
        </div>
      </div>

      <!-- 右键菜单（仅防火墙节点） -->
      <div
        v-show="contextMenuVisible"
        class="context-menu"
        :style="{ left: contextMenuPosition.x + 'px', top: contextMenuPosition.y + 'px' }"
        @click.stop
      >
        <div class="context-item" @click="handleDeviceManage">设备管理</div>
        <div class="context-item" @click="handleDeviceDetail">设备详情</div>
        <div class="context-item" @click="handleConfigUpdate">配置更新</div>
        <div class="context-item" @click="handleConfigDownload">配置下载</div>
        <div class="context-item danger" @click="handleDeviceDelete">设备删除</div>
      </div>
      <div v-show="contextMenuVisible" class="context-menu-mask" @click="closeContextMenu" />

      <!-- 右侧 -->
      <div class="right-panel">
        <!-- 检索栏：搜索引擎风格；普通/高级明确切换 -->
        <div class="search-bar search-bar--engine">
          <div v-if="searchMode === 'normal'" class="search-normal-wrap">
            <div class="search-row search-row--engine">
              <ElInput
                v-model="searchInput"
                placeholder="请输入检索的条件"
                size="large"
                class="search-input search-input--engine"
                @keydown="onSearchKeydown"
              >
                <template #prefix>
                  <div class="search-mode-tabs-wrap search-mode-tabs-wrap--in-input">
                    <div class="search-mode-tabs" role="tablist">
                      <button
                        type="button"
                        class="search-mode-tab"
                        :class="{ 'is-active': isSearchMode('normal') }"
                        role="tab"
                        :aria-selected="isSearchMode('normal')"
                        @click="switchSearchMode('normal')"
                      >
                        普通检索
                      </button>
                      <button
                        type="button"
                        class="search-mode-tab"
                        :class="{ 'is-active': isSearchMode('advanced') }"
                        role="tab"
                        :aria-selected="isSearchMode('advanced')"
                        @click="switchSearchMode('advanced')"
                      >
                        高级检索
                      </button>
                    </div>
                  </div>
                </template>
                <template #suffix>
                  <span class="search-suffix search-suffix--compact">
                    <ElTooltip v-if="showResetSearchIcon" content="清空条件">
                      <span class="search-reset-btn" role="button" tabindex="0" @click="resetSearch">
                        <ElIcon class="search-reset-btn__icon"><Close /></ElIcon>
                      </span>
                    </ElTooltip>
                    <span class="search-suffix-end">
                      <ElTooltip content="收藏当前条件">
                        <ElIcon class="search-icon" @click="saveAsCommon"><Star /></ElIcon>
                      </ElTooltip>
                      <ElButton
                        type="primary"
                        size="small"
                        class="search-submit-btn"
                        :icon="Search"
                        aria-label="搜索"
                        @click="doSearch"
                      />
                    </span>
                  </span>
                </template>
              </ElInput>
              <ElPopover
                placement="bottom-end"
                :width="360"
                trigger="click"
                popper-class="more-search-popover-wrap"
              >
                <template #reference>
                  <button
                    type="button"
                    class="more-search-link more-search-link--icon-only"
                    aria-label="更多检索条件"
                    title="更多检索条件"
                  >
                    <ElIcon class="more-search-link__icon"><MoreFilled /></ElIcon>
                  </button>
                </template>
                <div class="more-search-popover">
                  <div class="more-search-popover__row">
                    <span class="more-search-popover__label">匹配方式</span>
                    <div class="more-search-popover__buttons">
                      <ElTooltip
                        v-for="m in matchModeOptions"
                        :key="m.value"
                        placement="top"
                        popper-class="match-mode-tooltip-popper"
                      >
                        <template #content>
                          <div class="match-mode-tip">
                            <div class="match-mode-tip__title">{{ m.label }}</div>
                            <p class="match-mode-tip__desc">{{ m.desc }}</p>
                          </div>
                        </template>
                        <button
                          type="button"
                          class="more-search-pill"
                          :class="{ 'is-active': matchMode === m.value }"
                          @click="matchMode = m.value"
                        >
                          {{ m.label }}
                        </button>
                      </ElTooltip>
                    </div>
                  </div>
                  <div v-if="searchMode === 'normal'" class="more-search-popover__row">
                    <span class="more-search-popover__label">是否含 any</span>
                    <div class="more-search-popover__buttons">
                      <ElTooltip placement="top" popper-class="match-mode-tooltip-popper">
                        <template #content>
                          <div class="match-mode-tip">
                            <div class="match-mode-tip__title">是</div>
                            <p class="match-mode-tip__desc">结果条目需过滤出含 any 的策略（源/目的/服务）</p>
                          </div>
                        </template>
                        <button
                          type="button"
                          class="more-search-pill"
                          :class="{ 'is-active': anyMode === 'include' }"
                          @click="anyMode = anyMode === 'include' ? '' : 'include'"
                        >
                          是
                        </button>
                      </ElTooltip>
                      <ElTooltip placement="top" popper-class="match-mode-tooltip-popper">
                        <template #content>
                          <div class="match-mode-tip">
                            <div class="match-mode-tip__title">否</div>
                            <p class="match-mode-tip__desc">结果条目需过滤出不含 any 的策略</p>
                          </div>
                        </template>
                        <button
                          type="button"
                          class="more-search-pill"
                          :class="{ 'is-active': anyMode === 'exclude' }"
                          @click="anyMode = anyMode === 'exclude' ? '' : 'exclude'"
                        >
                          否
                        </button>
                      </ElTooltip>
                    </div>
                  </div>
                </div>
              </ElPopover>
            </div>
          </div>

          <div v-else class="search-advanced-wrap">
            <!-- 高级模式：同一输入框内展示已添加条件标签 + 当前构建 + 连接词 -->
            <div class="search-row search-row--engine">
              <div class="search-input search-input--engine search-input--advanced">
              <div class="search-mode-tabs-wrap search-mode-tabs-wrap--in-input">
                <div class="search-mode-tabs" role="tablist">
                  <button
                    type="button"
                    class="search-mode-tab"
                    :class="{ 'is-active': isSearchMode('normal') }"
                    role="tab"
                    :aria-selected="isSearchMode('normal')"
                    @click="switchSearchMode('normal')"
                  >
                    普通检索
                  </button>
                  <button
                    type="button"
                    class="search-mode-tab"
                    :class="{ 'is-active': isSearchMode('advanced') }"
                    role="tab"
                    :aria-selected="isSearchMode('advanced')"
                    @click="switchSearchMode('advanced')"
                  >
                    高级检索
                  </button>
                </div>
              </div>
              <div class="search-input__inner search-input__inner--advanced">
                <!-- 已添加 token（条件/连接词/括号） -->
                <template v-for="t in advTokens" :key="t.id">
                  <template v-if="t.type === 'paren'">
                    <span class="adv-inline-chip adv-inline-chip--paren">{{ t.value }}</span>
                  </template>
                  <template v-else-if="t.type === 'connector'">
                    <span class="adv-inline-chip adv-inline-chip--connector">{{ t.value }}</span>
                  </template>
                  <template v-else>
                    <span class="adv-inline-condition">
                      <span class="adv-inline-chip adv-inline-chip--field">{{ t.field.label }}</span>
                      <span class="adv-inline-chip adv-inline-chip--op">{{ t.operator }}</span>
                      <span class="adv-inline-chip adv-inline-chip--value">{{ t.values.join(', ') }}</span>
                    </span>
                    <ElIcon class="adv-inline-remove" @click="advRemoveToken(t.id)"><Close /></ElIcon>
                  </template>
                </template>

                <!-- 单输入框：根据命令阶段显示下拉内容 -->
                <div class="adv-inline-field-wrap">
                  <!-- 当前构建回显：字段 / 操作符（必须回显且可点击切换） -->
                  <span
                    v-if="advCurrentField"
                    class="adv-inline-chip adv-inline-chip--field"
                    @click="advStartFieldEdit"
                    title="点击重新选择字段"
                  >
                    {{ advCurrentField.label }}
                  </span>
                  <span
                    v-if="advCurrentOperator"
                    class="adv-inline-chip adv-inline-chip--op"
                    @click="advStartOperatorEdit"
                    title="点击切换操作符"
                  >
                    {{ advCurrentOperator }}
                  </span>
                  <input
                    v-model="advInput"
                    ref="advInputRef"
                    type="text"
                    class="adv-inline-input"
                    :placeholder="advPlaceholder"
                    @input="advHandleInput"
                    @keydown="advHandleKeydown"
                  />
                  <div v-if="advMenuOpen" class="adv-inline-suggestions">
                    <!-- / 命令列表 -->
                    <template v-if="advPhase === 'command'">
                      <div
                        v-for="(c, idx) in advCommands"
                        :key="c.key"
                        class="adv-inline-option"
                        :class="{ 'is-active': idx === advMenuIndex }"
                        @mousedown.prevent="advSelectCommand(c.key)"
                      >
                        {{ c.label }}
                      </div>
                    </template>
                    <!-- 字段匹配：从 / 选「字段」或「字段」编辑时：顶部搜索 + 全量/过滤列表 -->
                    <template v-else-if="advPhase === 'field' && advFieldFromCommand">
                      <div class="adv-field-panel-search">
                        <ElInput
                          ref="advFieldSearchInputRef"
                          v-model="advFieldPanelSearchKeyword"
                          size="small"
                          placeholder="搜索字段，Enter 过滤并确认选中"
                          @keydown.stop="advFieldSearchKeydown"
                        />
                      </div>
                      <div
                        v-for="(f, idx) in advDisplayedFieldList"
                        :key="f.key"
                        class="adv-inline-option"
                        :class="{ 'is-active': idx === advMenuIndex }"
                        @mousedown.prevent="advSelectField(f)"
                      >
                        {{ f.label }}
                      </div>
                      <div
                        v-if="!advDisplayedFieldList.length"
                        class="adv-inline-option adv-inline-option--empty"
                      >
                        无匹配字段
                      </div>
                    </template>
                    <template v-else-if="advPhase === 'field'">
                      <div
                        v-for="(f, idx) in advFieldSuggestions"
                        :key="f.key"
                        class="adv-inline-option"
                        :class="{ 'is-active': idx === advMenuIndex }"
                        @mousedown.prevent="advSelectField(f)"
                      >
                        {{ f.label }}
                      </div>
                    </template>
                    <!-- 操作符 -->
                    <template v-else-if="advPhase === 'operator'">
                      <div
                        v-for="(op, idx) in availableOperators"
                        :key="op"
                        class="adv-inline-option"
                        :class="{ 'is-active': idx === advMenuIndex }"
                        @mousedown.prevent="advSelectOperator(op)"
                      >
                        {{ op }}
                      </div>
                    </template>
                    <!-- 值（枚举）：平铺换行显示，无勾选符号 -->
                    <template v-else-if="advPhase === 'value' && advValueOptions.length">
                      <div
                        v-for="(v, idx) in advValueOptions"
                        :key="v"
                        class="adv-inline-option"
                        :class="{ 'is-active': idx === advMenuIndex }"
                        @mousedown.prevent.stop="advSelectEnumValue(v)"
                        @click.prevent.stop="advSelectEnumValue(v)"
                      >
                        {{ v }}
                      </div>
                    </template>
                    <!-- 连接词 -->
                    <template v-else-if="advPhase === 'connector'">
                      <div
                        v-for="(v, idx) in ['end', 'and', 'or']"
                        :key="v"
                        class="adv-inline-option"
                        :class="{ 'is-active': idx === advMenuIndex }"
                        @mousedown.prevent="advSelectConnector(v as any)"
                      >
                        {{ v }}
                      </div>
                    </template>
                  </div>
                </div>
              </div>
              <span class="search-input__suffix search-suffix search-suffix--compact">
                <ElTooltip v-if="showResetSearchIcon" content="清空条件">
                  <span class="search-reset-btn" role="button" tabindex="0" @click="resetSearch">
                    <ElIcon class="search-reset-btn__icon"><Close /></ElIcon>
                  </span>
                </ElTooltip>
                <span class="search-suffix-end">
                  <ElTooltip content="收藏当前条件">
                    <ElIcon class="search-icon" @click="saveAsCommon"><Star /></ElIcon>
                  </ElTooltip>
                  <ElButton
                    type="primary"
                    size="small"
                    class="search-submit-btn"
                    :icon="Search"
                    aria-label="搜索"
                    @click="doSearch"
                  />
                </span>
              </span>
            </div>
            <span class="search-engine-more-spacer" aria-hidden="true" />
            </div>
          </div>

          <div v-if="commonSearches.length" class="common-searches">
            <span class="common-label">收藏条件：</span>
            <div class="common-tags">
              <ElTag
                v-for="c in commonSearches"
                :key="c.id"
                class="common-tag"
                closable
                @close="removeCommon(c.id)"
                @click="applyCommon(c)"
              >
                {{ c.label }}
              </ElTag>
            </div>
          </div>

          <div v-if="searchMode === 'normal' && normalFieldStats.length" class="field-stats-bar">
            <span class="field-stats-label">条件分布</span>
            <div class="field-stats-tags">
              <button
                v-for="s in normalFieldStats"
                :key="s.label"
                type="button"
                class="field-stat-chip"
                :class="{ 'is-active': fieldDistFilterLabel === s.label }"
                @click="toggleFieldDistFilter(s.label)"
              >
                {{ s.label }} <em class="field-stat-num">{{ s.count }}</em>
              </button>
            </div>
          </div>
        </div>

        <!-- 策略标签统计（可折叠，默认收起） -->
        <div class="tag-stats-section">
          <div class="tag-stats-header" @click="toggleTagStats">
            <span class="tag-title">
              统计
              <ElTooltip content="设置显示的子标签统计项">
                <ElIcon class="tag-setting" @click.stop="tagSettingVisible = true"><Setting /></ElIcon>
              </ElTooltip>
              <ElTooltip content="刷新统计信息">
                <ElIcon class="tag-refresh" @click.stop="refreshTagStats"><Refresh /></ElIcon>
              </ElTooltip>
            </span>
            <ElIcon><ArrowDown v-if="tagStatsCollapsed" /><ArrowUp v-else /></ElIcon>
          </div>
          <div v-show="!tagStatsCollapsed" class="tag-stats-body">
            <div v-if="lifecycleCategoryEnabled" class="tag-group">
              <span class="tag-group-title">
                生命状态
                <ElTooltip :content="LIFECYCLE_TOOLTIP" popper-class="tag-stats-tooltip-popper"><ElIcon class="tag-tip"><InfoFilled /></ElIcon></ElTooltip>
              </span>
              <ElTag
                v-for="it in visibleLifecycleEntries"
                :key="'l-' + it.key"
                :type="isTagSelected('lifecycle', it.key) ? 'primary' : 'info'"
                size="small"
                class="filter-tag"
                @click="toggleTagFilter('lifecycle', it.key, it.label)"
              >
                {{ it.label }} {{ it.count }}
              </ElTag>
            </div>
            <div v-if="qualityCategoryEnabled" class="tag-group">
              <span class="tag-group-title">
                策略质量
                <ElTooltip :content="QUALITY_TOOLTIP" popper-class="tag-stats-tooltip-popper"><ElIcon class="tag-tip"><InfoFilled /></ElIcon></ElTooltip>
              </span>
              <ElTag
                v-for="it in visibleQualityEntries"
                :key="'q-' + it.key"
                :type="isTagSelected('quality', it.key) ? 'primary' : 'info'"
                size="small"
                class="filter-tag"
                @click="toggleTagFilter('quality', it.key, it.label)"
              >
                {{ it.label }} {{ it.count }}
              </ElTag>
            </div>
            <div v-if="riskCategoryEnabled" class="tag-group">
              <span class="tag-group-title">
                风险与合规
                <ElTooltip :content="RISK_TOOLTIP" popper-class="tag-stats-tooltip-popper"><ElIcon class="tag-tip"><InfoFilled /></ElIcon></ElTooltip>
              </span>
              <ElTag
                v-for="it in visibleRiskEntries"
                :key="'r-' + it.key"
                :type="isTagSelected('risk', it.key) ? 'primary' : 'info'"
                size="small"
                class="filter-tag"
                @click="toggleTagFilter('risk', it.key, it.label)"
              >
                {{ it.label }} {{ it.count }}
              </ElTag>
            </div>
            <div v-if="businessCategoryEnabled" class="tag-group">
              <span class="tag-group-title">
                业务标签
                <ElTooltip :content="BUSINESS_TOOLTIP" popper-class="tag-stats-tooltip-popper"><ElIcon class="tag-tip"><InfoFilled /></ElIcon></ElTooltip>
              </span>
              <span class="business-row">
                <ElTag
                  v-for="it in visibleBusinessEntries"
                  :key="'b-' + it.key"
                  :type="isTagSelected('business', it.key) ? 'primary' : 'info'"
                  size="small"
                  class="filter-tag"
                  @click="toggleTagFilter('business', it.key, it.label)"
                >
                  <ElDropdown trigger="contextmenu">
                    <span class="biz-tag">{{ it.label }} {{ it.count }}</span>
                    <template #dropdown>
                      <ElDropdownMenu>
                        <ElDropdownItem @click="openEditBusiness(it.key)">编辑</ElDropdownItem>
                        <ElDropdownItem divided @click="deleteBusiness(it.key)">删除</ElDropdownItem>
                      </ElDropdownMenu>
                    </template>
                  </ElDropdown>
                </ElTag>
                <ElPopover v-model:visible="businessMoreVisible" placement="bottom-start" :width="360" trigger="click">
                  <template #reference>
                    <ElIcon v-if="allBusinessEntries.length > visibleBusinessEntries.length" class="biz-more"><MoreFilled /></ElIcon>
                  </template>
                  <div class="biz-more-panel">
                    <ElTag
                      v-for="it in allBusinessEntries"
                      :key="'bm-' + it.key"
                      size="small"
                      class="filter-tag"
                      :type="isTagSelected('business', it.key) ? 'primary' : 'info'"
                      @click="toggleTagFilter('business', it.key, it.label)"
                    >
                      {{ it.label }} {{ it.count }}
                    </ElTag>
                  </div>
                </ElPopover>
                <ElTooltip content="添加业务标签">
                  <ElIcon class="biz-add" @click="openAddBusiness"><Plus /></ElIcon>
                </ElTooltip>
                <ElTooltip content="标签管理">
                  <ElIcon class="biz-manage" @click="gotoTagManage"><Link /></ElIcon>
                </ElTooltip>
              </span>
            </div>
          </div>
        </div>

        <!-- 标签过滤设置 -->
        <ElDialog v-model="tagSettingVisible" title="标签过滤设置" width="620px">
          <div class="tag-setting-body">
            <div class="tag-setting-group">
              <ElCheckbox v-model="lifecycleCategoryEnabled" class="tag-setting-category-master">
                显示「生命状态」大类
              </ElCheckbox>
              <ElCheckboxGroup v-model="lifecycleVisibleKeys" :disabled="!lifecycleCategoryEnabled">
                <ElCheckbox v-for="k in Object.keys(tagStats.lifecycle)" :key="'sl-' + k" :label="k">
                  {{ LIFECYCLE_LABELS[k] ?? k }}
                </ElCheckbox>
              </ElCheckboxGroup>
            </div>
            <div class="tag-setting-group">
              <ElCheckbox v-model="qualityCategoryEnabled" class="tag-setting-category-master">
                显示「策略质量」大类
              </ElCheckbox>
              <ElCheckboxGroup v-model="qualityVisibleKeys" :disabled="!qualityCategoryEnabled">
                <ElCheckbox v-for="k in Object.keys(tagStats.quality)" :key="'sq-' + k" :label="k">
                  {{ QUALITY_LABELS[k] ?? k }}
                </ElCheckbox>
              </ElCheckboxGroup>
            </div>
            <div class="tag-setting-group">
              <ElCheckbox v-model="riskCategoryEnabled" class="tag-setting-category-master">
                显示「风险与合规」大类
              </ElCheckbox>
              <ElCheckboxGroup v-model="riskVisibleKeys" :disabled="!riskCategoryEnabled">
                <ElCheckbox v-for="k in Object.keys(tagStats.risk || {})" :key="'sr-' + k" :label="k">
                  {{ RISK_LABELS[k] ?? k }}
                </ElCheckbox>
              </ElCheckboxGroup>
            </div>
            <div class="tag-setting-group">
              <ElCheckbox v-model="businessCategoryEnabled" class="tag-setting-category-master">
                显示「业务标签」大类
              </ElCheckbox>
              <ElCheckboxGroup
                v-model="businessVisibleKeys"
                :max="10"
                :disabled="!businessCategoryEnabled"
              >
                <ElCheckbox v-for="k in Object.keys(tagStats.business)" :key="'sb-' + k" :label="k">
                  {{ k }}
                </ElCheckbox>
              </ElCheckboxGroup>
            </div>
          </div>
        </ElDialog>

        <!-- 业务标签添加/编辑 -->
        <ElDialog v-model="addBusinessVisible" title="添加业务标签" width="420px">
          <ElInput v-model="addBusinessName" placeholder="标签名" />
          <template #footer>
            <ElButton @click="addBusinessVisible = false">取消</ElButton>
            <ElButton type="primary" @click="saveAddBusiness">保存</ElButton>
          </template>
        </ElDialog>
        <ElDialog v-model="editBusinessVisible" title="编辑业务标签" width="420px">
          <ElInput v-model="editBusinessName" placeholder="标签名" />
          <template #footer>
            <ElButton @click="editBusinessVisible = false">取消</ElButton>
            <ElButton type="primary" @click="saveEditBusiness">保存</ElButton>
          </template>
        </ElDialog>

        <!-- 列表区域：铺满空白，仅表格内部出现滚动条 -->
        <div class="table-area" v-loading="loading">
          <div class="table-wrap">
            <div class="table-toolbar">
              <ElDropdown trigger="click">
                <ElButton type="primary" size="small">导出<ElIcon class="el-icon--right"><ArrowDown /></ElIcon></ElButton>
                <template #dropdown>
                  <ElDropdownMenu>
                    <ElDropdownItem @click="ElMessage.info('导出全部（占位）')">全部</ElDropdownItem>
                    <ElDropdownItem @click="ElMessage.info('导出选中（占位）')">选中</ElDropdownItem>
                    <ElDropdownItem @click="ElMessage.info('导出当前页（占位）')">当前页</ElDropdownItem>
                  </ElDropdownMenu>
                </template>
              </ElDropdown>
              <ElDropdown trigger="click">
                <ElButton type="primary" size="small">查看命令<ElIcon class="el-icon--right"><ArrowDown /></ElIcon></ElButton>
                <template #dropdown>
                  <ElDropdownMenu>
                    <ElDropdownItem @click="batchCommandVisible = true">全部</ElDropdownItem>
                    <ElDropdownItem @click="batchCommandVisible = true">选中</ElDropdownItem>
                    <ElDropdownItem @click="batchCommandVisible = true">当前页</ElDropdownItem>
                  </ElDropdownMenu>
                </template>
              </ElDropdown>
              <ElButton type="primary" size="small" @click="openArchiveEditBatch">编辑档案</ElButton>
              <ElButton type="primary" size="small" @click="expireExportVisible = true">到期策略导出</ElButton>
              <div class="table-toolbar__right">
                <ElPopover
                  v-model:visible="columnSettingVisible"
                  placement="bottom-end"
                  :width="420"
                  trigger="click"
                >
                  <template #reference>
                    <span class="column-setting-icon" title="列设置">
                      <ElIcon :size="18"><SetUp /></ElIcon>
                    </span>
                  </template>
                  <div class="column-setting-panel">
                    <div class="column-setting-header">
                      <ElInput
                        v-model="columnSettingKeyword"
                        placeholder="输入关键字"
                        size="small"
                        clearable
                        class="column-setting-search"
                        @keydown.enter="filterColumnList"
                      >
                        <template #prefix>
                          <ElIcon><Search /></ElIcon>
                        </template>
                      </ElInput>
                      <div class="column-setting-tpl">
                        <ElSelect
                          v-model="columnSettingTemplate"
                          size="small"
                          placeholder="模版"
                          class="column-setting-select"
                          @change="onColumnTemplateChange"
                        >
                          <ElOption
                            v-for="t in columnTemplates"
                            :key="t.id"
                            :label="t.name"
                            :value="t.id"
                          />
                        </ElSelect>
                        <ElButton type="primary" size="small" @click="resetColumnTemplate">重置</ElButton>
                      </div>
                    </div>
                    <div class="column-setting-batch">
                      <ElButton type="primary" size="small" @click="batchColumnOp('hide')">隐藏</ElButton>
                      <ElButton type="primary" size="small" @click="batchColumnOp('show')">显示</ElButton>
                      <ElButton type="primary" size="small" @click="batchColumnOp('pinTop')">置顶</ElButton>
                      <ElButton type="primary" size="small" @click="batchColumnOp('pinBottom')">置底</ElButton>
                      <ElButton type="primary" size="small" @click="batchColumnOp('moveUp')">上移</ElButton>
                      <ElButton type="primary" size="small" @click="batchColumnOp('moveDown')">下移</ElButton>
                    </div>
                    <div class="column-setting-list">
                      <div class="column-setting-list-header">
                        <span class="col-check">序号</span>
                        <span class="col-name">表头名称</span>
                        <span class="col-vis">隐藏/显示</span>
                        <span class="col-fix">固定位置</span>
                      </div>
                      <div
                        v-for="(col, idx) in filteredColumnDefs"
                        :key="col.key"
                        class="column-setting-row"
                      >
                        <span class="col-check">
                          <ElCheckbox v-model="col.checked" />
                        </span>
                        <span class="col-num">{{ idx + 1 }}</span>
                        <span class="col-name">{{ col.label }}</span>
                        <span class="col-vis">
                          <ElSwitch v-model="col.visible" size="small" />
                        </span>
                        <span class="col-fix">
                          <ElButton
                            :type="col.fixed === 'left' ? 'primary' : 'default'"
                            size="small"
                            @click="col.fixed = 'left'"
                          >左</ElButton>
                          <ElButton
                            :type="col.fixed === false || col.fixed === '' ? 'primary' : 'default'"
                            size="small"
                            @click="col.fixed = false"
                          >不固定</ElButton>
                          <ElButton
                            :type="col.fixed === 'right' ? 'primary' : 'default'"
                            size="small"
                            @click="col.fixed = 'right'"
                          >右</ElButton>
                        </span>
                      </div>
                    </div>
                    <div class="column-setting-footer">
                      <ElButton type="primary" @click="openSaveColumnTemplate">另存为</ElButton>
                    </div>
                  </div>
                </ElPopover>
              </div>
            </div>
            <div class="policy-table-container" ref="policyTableContainerRef">
              <ElTable
                :data="paginatedTableData"
                :max-height="tableMaxHeight"
                border
                stripe
                @selection-change="onSelectionChange"
              >
            <ElTableColumn type="selection" width="44" fixed="left" />
            <ElTableColumn label="序号" type="index" width="60" fixed="left" :index="indexMethod" />
            <ElTableColumn label="策略信息" min-width="120">
              <template #default="{ row }">
                <div v-if="row.id" class="cell-two-line">
                  <div class="cell-line cell-ellipsis" v-html="highlightSearchHtml(row.name)" />
                  <div class="cell-line cell-ellipsis">
                    <span>ID：</span><span v-html="highlightSearchHtml(row.id)" />
                  </div>
                </div>
              </template>
            </ElTableColumn>
            <ElTableColumn label="源" min-width="160">
              <template #default="{ row }">
                <div v-if="row.id" class="cell-two-line">
                  <div class="cell-line cell-ellipsis" v-html="highlightSearchHtml('域：' + row.srcZone)" />
                  <ElTooltip placement="top" :disabled="!row.srcIp?.length" popper-class="tag-stats-tooltip-popper">
                    <template #content>
                      <div class="hover-ip-list">
                        <div v-for="(line, idx) in srcIpHoverLines(row)" :key="idx" class="hover-ip-line">{{ line }}</div>
                      </div>
                    </template>
                    <div
                      class="cell-line cell-ellipsis"
                      v-html="highlightSearchHtml(row.srcIp?.length ? 'IP：' + row.srcIp.join('，') : 'IP：-')"
                    />
                  </ElTooltip>
                </div>
              </template>
            </ElTableColumn>
            <ElTableColumn label="目的" min-width="160">
              <template #default="{ row }">
                <div v-if="row.id" class="cell-two-line">
                  <div class="cell-line cell-ellipsis" v-html="highlightSearchHtml('域：' + row.dstZone)" />
                  <ElTooltip placement="top" :disabled="!row.dstIp?.length" popper-class="tag-stats-tooltip-popper">
                    <template #content>
                      <div class="hover-ip-list">
                        <div v-for="(line, idx) in dstIpHoverLines(row)" :key="idx" class="hover-ip-line">{{ line }}</div>
                      </div>
                    </template>
                    <div
                      class="cell-line cell-ellipsis"
                      v-html="highlightSearchHtml(row.dstIp?.length ? 'IP：' + row.dstIp.join('，') : 'IP：-')"
                    />
                  </ElTooltip>
                </div>
              </template>
            </ElTableColumn>
            <ElTableColumn label="服务" min-width="90">
              <template #default="{ row }">
                <div v-if="row.id" class="cell-two-line service-cell">
                  <ElTooltip placement="top" :disabled="!row.service?.length" popper-class="tag-stats-tooltip-popper">
                    <template #content>
                      <div class="hover-ip-list">
                        <div v-for="(line, idx) in serviceHoverLines(row)" :key="idx" class="hover-ip-line">{{ line }}</div>
                      </div>
                    </template>
                    <div
                      class="cell-line cell-ellipsis service-text"
                      v-html="highlightSearchHtml(row.service?.length ? row.service.join('，') : '-')"
                    />
                  </ElTooltip>
                </div>
              </template>
            </ElTableColumn>
            <ElTableColumn label="动作" width="70">
              <template #default="{ row }">
                <ElTag v-if="row.id" :type="row.action === 'allow' ? 'success' : 'danger'" size="small">
                  <span v-html="highlightSearchHtml(row.action === 'allow' ? '允许' : '拒绝')" />
                </ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn label="优化类型" min-width="140">
              <template #default="{ row }">
                <div v-if="row.id" class="cell-two-line optimize-type-cell">
                  <ElTooltip
                    v-if="optimizeTagsDisplay(row).length > 0"
                    :content="optimizeTagsTip(row)"
                    placement="top"
                  >
                    <span
                      class="optimize-text-link"
                      @click="openOptimizeDialog(row)"
                      v-html="highlightSearchHtml(optimizeTagsDisplay(row).join('，'))"
                    />
                  </ElTooltip>
                  <span v-else class="optimize-text-empty"></span>
                </div>
              </template>
            </ElTableColumn>
            <ElTableColumn label="状态/优先级" min-width="100" class-name="col-no-wrap">
              <template #default="{ row }">
                <div v-if="row.id" class="status-priority-cell">
                  <ElTag :type="row.enabled ? 'success' : 'danger'" size="small">{{ row.enabled ? '启用' : '停用' }}</ElTag>
                  <span class="priority-val" v-html="highlightSearchHtml(row.priority)" />
                </div>
              </template>
            </ElTableColumn>
            <ElTableColumn label="设备信息" width="120">
              <template #default="{ row }">
                <div v-if="row.id" class="cell-two-line">
                  <div class="cell-line" v-html="highlightSearchHtml(row.deviceName)" />
                  <div class="cell-line" v-html="highlightSearchHtml(row.deviceIp ?? '')" />
                </div>
              </template>
            </ElTableColumn>
            <ElTableColumn label="NAT信息" width="200">
              <template #default="{ row }">
                <div
                  v-if="row.id && ((row.snatSourceIps && row.snatSourceIps.length) || row.dnatDest)"
                  class="nat-cell"
                  :class="{ 'nat-cell--single': !(row.snatSourceIps && row.snatSourceIps.length) || !row.dnatDest }"
                >
                  <div v-if="row.snatSourceIps && row.snatSourceIps.length" class="nat-cell-line">
                    <ElTooltip
                      v-if="row.snatRules && row.snatRules.length"
                      :content="natRulesTooltip(row.snatRules)"
                    >
                      <ElIcon class="nat-icon" @click.stop="openNatDialog(row, 'snat')"><WarningFilled /></ElIcon>
                    </ElTooltip>
                    <ElTooltip :content="row.snatSourceIps.join('，')">
                      <span class="nat-cell-text" v-html="highlightSearchHtml('snat：' + row.snatSourceIps.join('，'))" />
                    </ElTooltip>
                  </div>
                  <div v-if="row.dnatDest" class="nat-cell-line">
                    <ElTooltip
                      v-if="row.dnatRules && row.dnatRules.length"
                      :content="natRulesTooltip(row.dnatRules)"
                    >
                      <ElIcon class="nat-icon" @click.stop="openNatDialog(row, 'dnat')"><WarningFilled /></ElIcon>
                    </ElTooltip>
                    <ElTooltip :content="row.dnatDest">
                      <span class="nat-cell-text" v-html="highlightSearchHtml('dnat：' + row.dnatDest)" />
                    </ElTooltip>
                  </div>
                </div>
              </template>
            </ElTableColumn>
            <ElTableColumn label="档案" min-width="200" class-name="archive-column-cell">
              <template #default="{ row }">
                <div class="archive-cell">
                  <span class="archive-text-wrap">
                    <ElTooltip v-if="formatArchiveDisplay(row)" :content="formatArchiveDisplay(row)" placement="top">
                      <span class="archive-text archive-text-two-line" v-html="highlightSearchHtml(formatArchiveDisplay(row))" />
                    </ElTooltip>
                    <span v-else class="archive-text archive-text-two-line">&nbsp;</span>
                  </span>
                  <ElIcon class="archive-edit-icon" @click.stop="openArchiveEdit(row)"><Edit /></ElIcon>
                </div>
              </template>
            </ElTableColumn>
            <ElTableColumn label="策略备注" min-width="180">
              <template #default="{ row }">
                <div v-if="row.id" class="cell-two-line remark-cell">
                  <ElTooltip v-if="row.remark" :content="row.remark" placement="top">
                    <span class="cell-line cell-ellipsis" v-html="highlightSearchHtml(row.remark)" />
                  </ElTooltip>
                  <span v-else class="cell-line cell-ellipsis"></span>
                </div>
              </template>
            </ElTableColumn>
            <ElTableColumn label="操作" min-width="100" fixed="right" class-name="op-column">
              <template #default="{ row }">
                <span v-if="row.id" class="op-cell">
                  <ElButton
                    v-for="op in visibleOps"
                    :key="op.key"
                    link
                    type="primary"
                    size="small"
                    @click="op.handler(row)"
                  >
                    {{ op.label }}
                  </ElButton>
                </span>
              </template>
            </ElTableColumn>
          </ElTable>
          </div>
          <div class="table-pagination">
            <ElPagination
              v-model:current-page="currentPage"
              v-model:page-size="pageSize"
              :total="displayTotal"
              :page-sizes="[10, 20, 50, 100, 200]"
              layout="total, sizes, prev, pager, next"
              @current-change="onPageChange"
              @size-change="onSizeChange"
            />
          </div>
        </div>
      </div>
    </div>
    </div>

    <!-- NAT 关联信息弹窗 -->
    <ElDialog v-model="natDialogVisible" :title="natDialogData?.title" width="720px">
      <div class="table-toolbar">
        <ElDropdown trigger="click">
          <ElButton size="small">
            导出<ElIcon class="el-icon--right"><ArrowDown /></ElIcon>
          </ElButton>
          <template #dropdown>
            <ElDropdownMenu>
              <ElDropdownItem @click="ElMessage.info('导出全部 NAT 规则（占位）')">全部</ElDropdownItem>
              <ElDropdownItem @click="ElMessage.info('导出选中 NAT 规则（占位）')">选中</ElDropdownItem>
              <ElDropdownItem @click="ElMessage.info('导出当前页 NAT 规则（占位）')">当前页</ElDropdownItem>
            </ElDropdownMenu>
          </template>
        </ElDropdown>
      </div>
      <ElTable
        :data="[...(natDialogData?.rules ?? []), ...Array.from({ length: Math.max(0, 10 - (natDialogData?.rules?.length || 0)) }, () => ({ fromIp: '', toIp: '', ruleName: '', valid: undefined }))]"
        border
        size="small"
        @selection-change="onNatSelectionChange"
      >
        <ElTableColumn type="selection" width="44" />
        <ElTableColumn prop="fromIp" label="转换前IP" width="140" />
        <ElTableColumn prop="toIp" label="转换后IP" width="160" />
        <ElTableColumn
          v-if="natDialogData?.type === 'dnat'"
          label="转换前端口"
          width="120"
        >
          <template #default>
            <span>-</span>
          </template>
        </ElTableColumn>
        <ElTableColumn
          v-if="natDialogData?.type === 'dnat'"
          label="转换后端口"
          width="120"
        >
          <template #default>
            <span>-</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="有效性" width="90">
          <template #default="{ row }">
            <span v-if="row.valid === true">有效</span>
            <span v-else-if="row.valid === false">无效</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="关联nat策略" min-width="160">
          <template #default="{ row }">
            <ElButton
              v-if="row.ruleName"
              link
              type="primary"
              size="small"
              @click="() => gotoNatPolicy(row.ruleName)"
            >
              {{ row.ruleName }}
            </ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
      <div class="table-pagination">
        <ElPagination
          :total="natDialogData?.rules?.length || 0"
          :page-size="10"
          layout="total, prev, pager, next"
        />
      </div>
    </ElDialog>

    <!-- 策略明细弹窗 -->
    <ElDialog
      v-model="rowDetailVisible"
      title="明细"
      :width="detailMaximized ? '100%' : '960px'"
      :fullscreen="detailMaximized"
      class="policy-detail-dialog"
      :close-on-click-modal="true"
      @closed="detailMaximized = false"
    >
      <template #header>
        <div class="policy-detail-header">
          <div class="policy-detail-header-left">
            <span v-for="(tag, i) in (rowDetailData?.tags || [])" :key="tag" class="tag-block" :style="{ background: TAG_COLORS[i % TAG_COLORS.length] }" />
            <span class="policy-detail-desc">
              {{ rowDetailData?.name || rowDetailData?.id }}/{{ rowDetailData?.id }}（<span class="desc-status" :class="rowDetailData?.enabled ? 'enabled' : 'disabled'">{{ rowDetailData?.enabled ? '启用' : '停用' }}</span>）：<span class="desc-src">{{ rowDetailData?.srcZone || '-' }}，{{ (rowDetailData?.srcIp && rowDetailData.srcIp.length) ? rowDetailData.srcIp.join('，') : '-' }}</span>><span class="desc-dst">{{ rowDetailData?.dstZone || '-' }}，{{ (rowDetailData?.dstIp && rowDetailData.dstIp.length) ? rowDetailData.dstIp.join('，') : '-' }}</span>：<span class="desc-svc">{{ (rowDetailData?.service && rowDetailData.service.length) ? rowDetailData.service.join(',') : '-' }}</span>，<span class="desc-action" :class="rowDetailData?.action === 'allow' ? 'allow' : 'deny'">{{ rowDetailData?.action === 'allow' ? '允许' : '拒绝' }}</span>
            </span>
          </div>
          <div class="policy-detail-header-right">
            <span>首次命中时间：{{ rowDetailData?.hitFirstTime || '2026-03-06 11:10' }}</span>
            <span>最近命中时间：{{ rowDetailData?.hitLastTime || '2026-03-07 12:10' }}</span>
          </div>
          <div class="policy-detail-header-actions">
            <ElButton class="detail-max-btn" text @click="detailMaximized = !detailMaximized">
              {{ detailMaximized ? '还原' : '最大化' }}
            </ElButton>
          </div>
        </div>
      </template>
      <div v-if="rowDetailData" class="policy-detail-body">
        <div class="policy-detail-content">
          <div class="policy-detail-row">
            <div class="policy-detail-section base-info">
              <div class="section-title">基础信息</div>
              <div class="info-grid">
                <div class="info-row"><span class="info-k">防火墙</span><span class="info-v">{{ rowDetailData.deviceName || '-' }}</span></div>
                <div class="info-row"><span class="info-k">源区域</span><span class="info-v">{{ rowDetailData.srcZone || '-' }}</span></div>
                <div class="info-row"><span class="info-k">源IP</span><span class="info-v">{{ (rowDetailData.srcIp && rowDetailData.srcIp.length) ? rowDetailData.srcIp.join('，') : '-' }}</span></div>
                <div class="info-row"><span class="info-k">目的区域</span><span class="info-v">{{ rowDetailData.dstZone || '-' }}</span></div>
                <div class="info-row"><span class="info-k">目的IP</span><span class="info-v">{{ (rowDetailData.dstIp && rowDetailData.dstIp.length) ? rowDetailData.dstIp.join('，') : '-' }}</span></div>
                <div class="info-row"><span class="info-k">优先级</span><span class="info-v">{{ rowDetailData.priority ?? '-' }}</span></div>
                <div class="info-row"><span class="info-k">命中次数</span><span class="info-v">{{ rowDetailData.hitCount ?? '-' }}</span></div>
                <div class="info-row"><span class="info-k">有效期</span><span class="info-v">-</span></div>
              </div>
              <div class="info-remark">
                <span class="info-k">备注</span>
                <span class="info-v">{{ rowDetailData.remark || '-' }}</span>
              </div>
              <div class="info-source">
                <span class="info-k">源数据</span>
                <pre class="info-v">{{ detailSourceData }}</pre>
              </div>
            </div>
            <div class="policy-detail-section hit-info">
              <div class="section-title">命中信息</div>
              <div class="hit-bars">
                <div v-for="h in detailHitInfo" :key="h.label" class="hit-item">
                  <span class="hit-label">{{ h.label }}命中率</span>
                  <div class="hit-bar-wrap">
                    <ElProgress :percentage="h.percentage" :show-text="false" />
                    <span class="hit-count">{{ h.count }}次</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="policy-detail-row">
            <div class="policy-detail-section">
              <div class="section-title">服务列表</div>
              <div class="detail-table-wrap">
                <ElTable :data="detailServiceList" border size="small" max-height="200">
                  <ElTableColumn type="index" label="序号" width="60" />
                  <ElTableColumn prop="serviceName" label="服务名称" min-width="100" />
                  <ElTableColumn prop="dstPort" label="目的端口" width="90" />
                  <ElTableColumn prop="protocol" label="协议" width="90" />
                  <ElTableColumn prop="srcPort" label="源端口" width="90" />
                  <ElTableColumn prop="dstIp" label="目的IP" min-width="120" />
                  <ElTableColumn prop="icmpType" label="ICMP类型" width="90" />
                  <ElTableColumn prop="icmpCode" label="ICMP编码" width="90" />
                  <ElTableColumn prop="protocolNo" label="协议号" width="80" />
                  <template #empty>
                    <div class="table-empty">当前页没有数据</div>
                  </template>
                </ElTable>
              </div>
            </div>
            <div class="policy-detail-section valid-ip">
              <div class="section-title">
                有效IP
                <ElTooltip placement="top" effect="dark" popper-class="valid-ip-tooltip-popper">
                  <template #content>
                    <span class="valid-ip-tooltip-text">1、源区域与源IP有交叉部分为有效IP；<br />2、目的区域与目的IP交叉部分为有效目的IP</span>
                  </template>
                  <ElIcon class="valid-ip-tip"><InfoFilled /></ElIcon>
                </ElTooltip>
              </div>
              <div class="valid-ip-body">
                <div class="valid-ip-row">
                  <span class="info-k">有效源IP</span>
                  <span class="info-v">{{ (rowDetailData.srcIp && rowDetailData.srcIp[0]) || '192.168.11.0/24' }}</span>
                </div>
                <div class="valid-ip-row">
                  <span class="info-k">有效目的IP</span>
                  <span class="info-v">{{ (rowDetailData.dstIp && rowDetailData.dstIp[0]) || '10.0.0.0/8' }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="policy-detail-row">
            <div class="policy-detail-section">
              <div class="section-title">引用对象</div>
              <div class="detail-table-wrap">
                <ElTable :data="detailRefObjects" border size="small" max-height="200">
                  <ElTableColumn type="index" label="序号" width="60" />
                  <ElTableColumn prop="type" label="类型" width="80" />
                  <ElTableColumn prop="name" label="名称" min-width="100" />
                  <ElTableColumn prop="members" label="成员" min-width="120" />
                  <ElTableColumn prop="excluded" label="排除成员" min-width="100" />
                  <ElTableColumn prop="effective" label="有效成员" min-width="120" />
                  <ElTableColumn label="关联安全策略" min-width="140">
                    <template #default="{ row }">
                      <span v-for="(n, i) in (row.secPolicy || '').split(',').filter(Boolean)" :key="i">
                        <a v-if="n" href="#" class="detail-link" @click.prevent="gotoSecPolicy(n)">{{ n }}</a><span v-if="(i as number) < (row.secPolicy || '').split(',').filter(Boolean).length - 1">，</span>
                      </span>
                      <span v-if="!row.secPolicy">-</span>
                    </template>
                  </ElTableColumn>
                  <ElTableColumn label="关联NAT策略" min-width="140">
                    <template #default="{ row }">
                      <span v-for="(n, i) in (row.natPolicy || '').split(',').filter(Boolean)" :key="i">
                        <a v-if="n" href="#" class="detail-link" @click.prevent="gotoNatPolicy(n)">{{ n }}</a><span v-if="(i as number) < (row.natPolicy || '').split(',').filter(Boolean).length - 1">，</span>
                      </span>
                      <span v-if="!row.natPolicy">-</span>
                    </template>
                  </ElTableColumn>
                  <ElTableColumn prop="source" label="源数据" min-width="120" show-overflow-tooltip />
                  <template #empty>
                    <div class="table-empty">当前页没有数据</div>
                  </template>
                </ElTable>
              </div>
            </div>
            <div class="policy-detail-section">
              <div class="section-title">策略访问</div>
              <div class="detail-table-wrap">
                <ElTable :data="detailAccessList" border size="small" max-height="200">
                  <ElTableColumn type="index" label="序号" width="60" />
                  <ElTableColumn prop="srcIp" label="源IP" min-width="100" />
                  <ElTableColumn prop="natSrcIp" label="转换前源IP" min-width="110" />
                  <ElTableColumn prop="dstIp" label="目的IP" min-width="100" />
                  <ElTableColumn prop="transformDest" label="转换目的信息" min-width="120" />
                  <ElTableColumn prop="dstPort" label="目的端口" width="90" />
                  <ElTableColumn prop="protocol" label="协议" width="80" />
                  <ElTableColumn prop="firstTime" label="首次发现时间" width="120" />
                  <ElTableColumn prop="lastTime" label="最近发现时间" width="120" />
                  <ElTableColumn prop="count" label="发现次数" width="90" />
                  <ElTableColumn prop="firstLink" label="首次发现连路" min-width="100" />
                  <template #empty>
                    <div class="table-empty">当前页没有数据</div>
                  </template>
                </ElTable>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ElDialog>
    <ElDialog v-model="optimizeVisible" title="策略优化" width="640px">
      <div style="min-height: 160px; color: var(--el-text-color-secondary);">策略优化内容后续补充（占位）。</div>
    </ElDialog>
    <ElDialog v-model="batchCommandVisible" title="配置命令" width="640px">
      <div style="min-height: 160px; color: var(--el-text-color-secondary);">配置命令内容后续补充（占位）。</div>
    </ElDialog>
    <ElDialog v-model="archiveEditBatchVisible" title="编辑档案" width="680px">
      <div class="archive-edit-form">
        <div class="archive-edit-row">
          <span class="archive-edit-label">策略</span>
          <div class="archive-edit-tag-wrap">
            <ElPopover
              v-model:visible="archiveBatchPolicyPopoverVisible"
              placement="bottom-start"
              :width="600"
              trigger="click"
            >
              <template #reference>
                <ElInput
                  :model-value="displayPoliciesShort(archiveBatchPolicies, 2)"
                  readonly
                  placeholder="点击选择策略（支持多选）"
                  class="archive-tag-input"
                  @click="archiveBatchPolicyPopoverVisible = !archiveBatchPolicyPopoverVisible"
                />
              </template>
              <ElTable
                ref="archiveBatchPolicyTableRef"
                :data="tableData"
                max-height="260"
                size="small"
                @selection-change="onArchiveBatchPolicyChange"
              >
                <ElTableColumn type="selection" width="44" />
                <ElTableColumn prop="name" label="策略名" min-width="100" />
                <ElTableColumn prop="id" label="ID" width="80" />
                <ElTableColumn label="源IP" min-width="100">
                  <template #default="{ row }">{{ (row.srcIp || []).slice(0, 2).join(',') || '-' }}</template>
                </ElTableColumn>
                <ElTableColumn label="目的IP" min-width="100">
                  <template #default="{ row }">{{ (row.dstIp || []).slice(0, 2).join(',') || '-' }}</template>
                </ElTableColumn>
                <ElTableColumn label="服务" min-width="90">
                  <template #default="{ row }">{{ (row.service || []).slice(0, 2).join(',') || '-' }}</template>
                </ElTableColumn>
                <ElTableColumn label="动作" width="70">
                  <template #default="{ row }">{{ row.action === 'allow' ? '允许' : '拒绝' }}</template>
                </ElTableColumn>
              </ElTable>
            </ElPopover>
          </div>
        </div>
        <div class="archive-edit-row">
          <span class="archive-edit-label">业务标签</span>
          <div class="archive-edit-tag-wrap">
            <ElPopover
              v-model:visible="archiveBatchTagPopoverVisible"
              placement="bottom-start"
              :width="400"
              trigger="click"
            >
              <template #reference>
                <ElInput
                  :model-value="archiveBatchForm.businessTags.length ? displayTagsShort(archiveBatchForm.businessTags, 2) : ''"
                  readonly
                  placeholder="点击选择标签（支持多选）"
                  class="archive-tag-input"
                  @click="archiveBatchTagPopoverVisible = !archiveBatchTagPopoverVisible"
                />
              </template>
              <ElCheckboxGroup v-model="archiveBatchSelectedTagIds">
                <div v-for="t in archiveBatchTagList" :key="t.id" class="archive-tag-item">
                  <ElCheckbox :label="t.id">{{ t.name }}</ElCheckbox>
                  <span class="archive-tag-meta">{{ t.createdAt }} / {{ t.createdBy }}</span>
                </div>
              </ElCheckboxGroup>
            </ElPopover>
          </div>
        </div>
        <div class="archive-edit-row">
          <span class="archive-edit-label">业务员系统</span>
          <ElInput v-model="archiveBatchForm.business" placeholder="留空不更新" clearable />
        </div>
        <div class="archive-edit-row">
          <span class="archive-edit-label">用途</span>
          <ElInput v-model="archiveBatchForm.purpose" placeholder="留空不更新" clearable />
        </div>
        <div class="archive-edit-row">
          <span class="archive-edit-label">申请人</span>
          <ElInput v-model="archiveBatchForm.applicant" placeholder="留空不更新" clearable />
        </div>
        <div class="archive-edit-row">
          <span class="archive-edit-label">负责人</span>
          <ElInput v-model="archiveBatchForm.owner" placeholder="留空不更新" clearable />
        </div>
        <div class="archive-edit-row">
          <span class="archive-edit-label">工单号</span>
          <ElInput v-model="archiveBatchForm.ticket" placeholder="留空不更新" clearable />
        </div>
        <div class="archive-edit-row">
          <span class="archive-edit-label">执行人/日期</span>
          <ElInput v-model="archiveBatchForm.executorDate" placeholder="留空不更新" clearable />
        </div>
      </div>
      <template #footer>
        <ElButton @click="archiveEditBatchVisible = false">取消</ElButton>
        <ElButton type="primary" @click="saveArchiveEditBatch">保存</ElButton>
      </template>
    </ElDialog>
    <ElDialog v-model="archiveEditVisible" title="编辑档案" width="640px">
      <div class="archive-edit-form">
        <div class="archive-edit-row">
          <span class="archive-edit-label">策略</span>
          <ElInput :model-value="archiveEditRow?.name" readonly placeholder="-" />
        </div>
        <div class="archive-edit-row">
          <span class="archive-edit-label">业务标签</span>
          <div class="archive-edit-tag-wrap">
            <ElPopover
              v-model:visible="archiveBusinessTagPopoverVisible"
              placement="bottom-start"
              :width="400"
              trigger="click"
            >
              <template #reference>
                <ElInput
                  :model-value="displayTagsShort(archiveForm.businessTags, 2)"
                  readonly
                  placeholder="点击选择标签（支持多选）"
                  class="archive-tag-input"
                  @click="archiveBusinessTagPopoverVisible = !archiveBusinessTagPopoverVisible"
                />
              </template>
              <ElCheckboxGroup v-model="archiveSelectedTagIds">
                <div v-for="t in businessTagListForEdit" :key="t.id" class="archive-tag-item">
                  <ElCheckbox :label="t.id">{{ t.name }}</ElCheckbox>
                  <span class="archive-tag-meta">{{ t.createdAt }} / {{ t.createdBy }}</span>
                </div>
              </ElCheckboxGroup>
            </ElPopover>
            <ElIcon class="archive-add-tag-icon" @click="archiveAddTagVisible = true"><Plus /></ElIcon>
          </div>
          <ElDialog v-model="archiveAddTagVisible" title="添加标签" width="400px" append-to-body>
            <ElInput v-model="archiveNewTagName" placeholder="标签名称（必填）" clearable />
            <template #footer>
              <ElButton @click="archiveAddTagVisible = false">取消</ElButton>
              <ElButton type="primary" @click="saveArchiveAddTag">保存</ElButton>
            </template>
          </ElDialog>
        </div>
        <div class="archive-edit-row">
          <span class="archive-edit-label">业务员系统</span>
          <ElInput v-model="archiveForm.business" placeholder="请输入" clearable />
        </div>
        <div class="archive-edit-row">
          <span class="archive-edit-label">用途</span>
          <ElInput v-model="archiveForm.purpose" placeholder="请输入" clearable />
        </div>
        <div class="archive-edit-row">
          <span class="archive-edit-label">申请人</span>
          <ElInput v-model="archiveForm.applicant" placeholder="请输入" clearable />
        </div>
        <div class="archive-edit-row">
          <span class="archive-edit-label">负责人</span>
          <ElInput v-model="archiveForm.owner" placeholder="请输入" clearable />
        </div>
        <div class="archive-edit-row">
          <span class="archive-edit-label">工单号</span>
          <ElInput v-model="archiveForm.ticket" placeholder="请输入" clearable />
        </div>
        <div class="archive-edit-row">
          <span class="archive-edit-label">执行人/日期</span>
          <ElInput v-model="archiveForm.executorDate" placeholder="请输入" clearable />
        </div>
        <div class="archive-edit-row">
          <span class="archive-edit-label">专线</span>
          <div class="archive-edit-lines-wrap">
            <ElInput :model-value="(archiveEditRow?.lines || []).join('，')" readonly placeholder="-" />
            <ElTooltip content="专线自动关联仅作回显，暂不支持手动编辑，若未开通专线业务可忽略该配置" placement="top">
              <ElIcon class="archive-lines-tip"><InfoFilled /></ElIcon>
            </ElTooltip>
          </div>
        </div>
      </div>
      <template #footer>
        <ElButton @click="archiveEditVisible = false">取消</ElButton>
        <ElButton type="primary" @click="saveArchiveEdit">保存</ElButton>
      </template>
    </ElDialog>
    <ElDialog v-model="tagEditVisible" title="编辑标签" width="560px">
      <div class="tag-edit-form">
        <div class="tag-edit-row">
          <span class="tag-edit-label">策略：</span>
          <ElPopover
            v-model:visible="tagEditPolicyPopoverVisible"
            placement="bottom-start"
            :width="520"
            trigger="click"
          >
            <template #reference>
              <ElInput
                :model-value="tagEditPolicyDisplay"
                readonly
                placeholder="点击选择策略（支持多选）"
                @click="tagEditPolicyPopoverVisible = !tagEditPolicyPopoverVisible"
              />
            </template>
            <ElTable
              ref="tagEditPolicyTableRef"
              :data="tableData"
              max-height="220"
              size="small"
              @selection-change="onTagEditPolicySelectionChange"
            >
              <ElTableColumn type="selection" width="44" />
              <ElTableColumn prop="name" label="名称" min-width="100" />
              <ElTableColumn prop="id" label="ID" width="80" />
              <ElTableColumn prop="priority" label="优先级" width="70" />
              <ElTableColumn label="源" min-width="90">
                <template #default="{ row }">{{ row.srcZone }} {{ (row.srcIp || []).slice(0, 2).join(',') }}</template>
              </ElTableColumn>
              <ElTableColumn label="目的" min-width="90">
                <template #default="{ row }">{{ row.dstZone }} {{ (row.dstIp || []).slice(0, 2).join(',') }}</template>
              </ElTableColumn>
              <ElTableColumn label="服务" min-width="90">
                <template #default="{ row }">{{ (row.service || []).slice(0, 2).join(',') }}</template>
              </ElTableColumn>
              <ElTableColumn prop="action" label="动作" width="60" />
            </ElTable>
          </ElPopover>
        </div>
        <div class="tag-edit-row">
          <span class="tag-edit-label">标签：</span>
          <ElPopover
            v-model:visible="tagEditTagPopoverVisible"
            placement="bottom-start"
            :width="360"
            trigger="click"
          >
            <template #reference>
              <ElInput
                :model-value="tagEditTagDisplay"
                readonly
                placeholder="点击选择标签（支持多选）"
                @click="tagEditTagPopoverVisible = !tagEditTagPopoverVisible"
              />
            </template>
            <ElCheckboxGroup v-model="tagEditTagIds">
              <div v-for="t in tagListForEdit" :key="t.id" class="tag-edit-tag-option">
                <ElCheckbox :label="t.id">{{ t.name }}</ElCheckbox>
                <span v-if="t.remark" class="tag-edit-tag-remark">{{ t.remark }}</span>
              </div>
            </ElCheckboxGroup>
          </ElPopover>
        </div>
      </div>
      <template #footer>
        <ElButton @click="cancelTagEdit">取消</ElButton>
        <ElButton type="primary" @click="saveTagEdit">保存</ElButton>
      </template>
    </ElDialog>
    <ElDialog v-model="expireExportVisible" title="到期策略导出" width="640px">
      <div style="min-height: 160px; color: var(--el-text-color-secondary);">到期策略导出内容后续补充（占位）。</div>
    </ElDialog>
    <ElDialog v-model="saveTemplateVisible" title="另存为列设置模版" width="400px">
      <ElInput v-model="saveTemplateName" placeholder="输入模版名称" clearable @keydown.enter="saveColumnTemplate" />
      <template #footer>
        <ElButton @click="saveTemplateVisible = false">取消</ElButton>
        <ElButton type="primary" @click="saveColumnTemplate">保存</ElButton>
      </template>
    </ElDialog>

    <!-- 设备属性弹窗 -->
    <ElDialog v-model="devicePropsVisible" title="属性" width="640px">
      <div class="device-props">
        <div class="device-props__row"><span class="k">名称</span><span class="v">{{ devicePropsDevice?.name || '-' }}</span></div>
        <div class="device-props__row"><span class="k">IP</span><span class="v">{{ devicePropsDevice?.ip || '-' }}</span></div>
        <div class="device-props__row"><span class="k">型号</span><span class="v">{{ devicePropsDevice?.model || '-' }}</span></div>
        <div class="device-props__row"><span class="k">状态</span><span class="v">{{ devicePropsDevice?.enabled ? '启用' : '停用' }}</span></div>
        <div class="device-props__row"><span class="k">获取方式</span><span class="v">{{ devicePropsDevice?.fetchMode || '-' }}</span></div>
        <div class="device-props__row"><span class="k">采集周期</span><span class="v">{{ devicePropsDevice?.collectCycle || '-' }}</span></div>
        <div class="device-props__row"><span class="k">位置</span><span class="v">{{ devicePropsDevice?.location || '-' }}</span></div>
        <div class="device-props__row"><span class="k">设备组</span><span class="v">-</span></div>
        <div class="device-props__row"><span class="k">DNAT匹配方式</span><span class="v">{{ devicePropsDevice?.dnatMatchMode || '-' }}</span></div>
        <div class="device-props__row"><span class="k">web管理访问</span><span class="v">{{ devicePropsDevice?.webManage || '-' }}</span></div>
        <div class="device-props__row"><span class="k">合规分析</span><span class="v">{{ devicePropsDevice?.complianceEnabled ? '启用' : '停用' }}</span></div>
        <div class="device-props__row"><span class="k">配置备份</span><span class="v">{{ devicePropsDevice?.backupEnabled ? '启用' : '停用' }}</span></div>
        <div class="device-props__row"><span class="k">策略分析</span><span class="v">{{ devicePropsDevice?.policyAnalysisEnabled ? '启用' : '停用' }}</span></div>
        <div class="device-props__row"><span class="k">设备性能分析</span><span class="v">{{ devicePropsDevice?.performanceEnabled ? '启用' : '停用' }}</span></div>
        <div class="device-props__row"><span class="k">硬件版本</span><span class="v">{{ devicePropsDevice?.hardwareVersion || '-' }}</span></div>
        <div class="device-props__row"><span class="k">备注</span><span class="v">{{ devicePropsDevice?.remark || '-' }}</span></div>
        <div class="device-props__row"><span class="k">最近更新时间</span><span class="v">{{ devicePropsDevice?.updatedAt || '-' }}</span></div>
        <div class="device-props__row"><span class="k">创建时间</span><span class="v">{{ devicePropsDevice?.createdAt || '-' }}</span></div>
        <div class="device-props__row"><span class="k">创建人</span><span class="v">{{ devicePropsDevice?.createdBy || '-' }}</span></div>
      </div>
    </ElDialog>
  </PageContent>
</template>

<style scoped>
.security-policy-page {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  border: none;
  box-shadow: none;
}
.security-policy-layout {
  flex: 1;
  display: flex;
  gap: 12px;
  min-height: 0;
  overflow: hidden;
}
.left-panel {
  width: 260px;
  flex-shrink: 0;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
.panel-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  flex-shrink: 0;
}
.panel-title {
  font-weight: 500;
  font-size: 13px;
  flex-shrink: 0;
}
.device-add-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--el-color-primary) 0%, var(--el-color-primary-light-3) 100%);
  color: #fff;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}
.device-add-icon:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(var(--el-color-primary-rgb), 0.4);
}
.device-search {
  margin-bottom: 8px;
  flex-shrink: 0;
}
.tree-wrap {
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  padding: 4px;
}
.tree-node {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  justify-content: space-between;
}
.node-icon {
  font-size: 10px;
}
.node-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.node-ops__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  cursor: pointer;
  color: var(--el-text-color-secondary);
}
.node-ops__btn:hover {
  background: var(--el-fill-color-light);
  color: var(--el-color-primary);
}
.device-props__row {
  display: flex;
  gap: 12px;
  padding: 6px 0;
  border-bottom: 1px dashed var(--el-border-color-lighter);
}
.device-props__row .k {
  width: 120px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}
.device-props__row .v {
  flex: 1;
  min-width: 0;
  word-break: break-word;
}
.right-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 0;
  overflow: hidden;
}
.search-bar {
  padding: 12px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  background: var(--el-fill-color-light);
}
.search-bar--engine {
  --search-mode-switch-h: 28px;
  --search-tab-active-bg: #e8f5f0;
  --search-tab-active-color: #047857;
  --search-tab-muted: #94a3b8;
  --search-engine-h: 40px;
}
/* 检索条本体由输入框 + 右侧「更多」构成，避免与外层再套一层边框；左右无内边距以便与下方统计卡片外缘对齐 */
.search-bar.search-bar--engine {
  border: none;
  background: transparent;
  box-shadow: none;
  padding: 0;
}
.search-mode-tabs-wrap {
  display: inline-flex;
  align-items: flex-start;
  padding-bottom: 7px;
}
.search-mode-tabs-wrap--in-input {
  align-items: center;
  padding-bottom: 0;
  padding-right: 10px;
  margin-right: 2px;
  border-right: 1px solid #e2e8f0;
}
.more-search-link__icon {
  transform: rotate(90deg);
  font-size: 16px;
}
.search-row.search-row--engine > :deep(.el-popover) {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
}
.search-row.search-row--engine :deep(.el-tooltip__trigger) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  outline: none;
}
.more-search-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: var(--search-mode-switch-h);
  min-height: var(--search-mode-switch-h);
  padding: 0 10px;
  box-sizing: border-box;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--el-color-primary);
  font-size: 12px;
  line-height: 1.35;
  cursor: pointer;
  transition: background 0.15s;
}
.more-search-link--icon-only {
  width: auto;
  height: auto;
  min-height: unset;
  min-width: unset;
  padding: 2px;
  gap: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--el-color-primary);
  box-sizing: border-box;
}
.more-search-link--icon-only:hover {
  background: var(--el-fill-color-light);
}
.more-search-link:hover:not(.more-search-link--icon-only) {
  background: var(--el-color-primary-light-9);
}
.more-search-popover {
  padding: 4px 0;
}
.more-search-popover__row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.more-search-popover__row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}
.more-search-popover__label {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
}
.more-search-popover__buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.more-search-pill {
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid var(--el-border-color);
  background: var(--el-fill-color-blank);
  color: var(--el-text-color-regular);
  font-size: 12px;
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s,
    color 0.15s;
}
.more-search-pill:hover {
  border-color: var(--el-color-primary-light-5);
  color: var(--el-color-primary);
}
.more-search-pill.is-active {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-weight: 600;
}
.search-hit {
  color: var(--el-color-success);
  text-decoration: underline;
  background: transparent !important;
  font-weight: inherit;
  padding: 0;
}
mark.search-hit {
  background: transparent !important;
}
.search-mode-tabs {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
}
.search-mode-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  padding: 4px 12px;
  min-height: var(--search-mode-switch-h);
  box-sizing: border-box;
  font-size: 12px;
  line-height: 1.35;
  color: var(--el-text-color-secondary);
  background: transparent;
  white-space: nowrap;
  border-radius: 6px;
  transition:
    background 0.15s,
    color 0.15s;
}
.search-mode-tab:not(.is-active)::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -6px;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid var(--el-border-color-lighter);
  opacity: 0.5;
  pointer-events: none;
}
.search-mode-tab:hover:not(.is-active) {
  color: var(--el-color-primary);
  background: var(--el-fill-color-light);
}
.search-mode-tab.is-active {
  color: var(--el-color-primary);
  font-weight: 600;
  background: var(--el-color-primary-light-9);
  box-shadow: none;
}
.search-mode-tab.is-active::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -6px;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid var(--el-color-primary-light-9);
  opacity: 1;
  pointer-events: none;
}
/* 嵌入输入框内：参考图样式（薄荷绿选中、灰字未选、竖线分隔），去掉底部小三角 */
.search-mode-tabs-wrap--in-input .search-mode-tab:not(.is-active)::after,
.search-mode-tabs-wrap--in-input .search-mode-tab.is-active::after {
  display: none;
}
.search-mode-tabs-wrap--in-input .search-mode-tab {
  color: var(--search-tab-muted);
  font-weight: 500;
}
.search-mode-tabs-wrap--in-input .search-mode-tab:hover:not(.is-active) {
  color: #64748b;
  background: transparent;
}
.search-mode-tabs-wrap--in-input .search-mode-tab.is-active {
  color: var(--search-tab-active-color);
  font-weight: 600;
  background: var(--search-tab-active-bg);
  box-shadow: none;
}
.search-normal-wrap,
.search-advanced-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.search-row--engine {
  display: flex;
  align-items: center;
  gap: 4px;
}
.search-engine-more-spacer {
  flex-shrink: 0;
  width: 22px;
  align-self: stretch;
  min-height: var(--search-engine-h);
  pointer-events: none;
}
.search-row.search-row--engine .search-input--engine {
  flex: 1;
  min-width: 0;
}
/* 普通检索 ElInput 与高级检索自定义外壳共用同一套「输入框」皮肤（对齐 large .el-input__wrapper） */
.search-row.search-row--engine .search-input--engine :deep(.el-input__wrapper),
.search-row.search-row--engine .search-input--engine.search-input--advanced {
  border-radius: 8px;
  box-shadow: 0 0 0 1px #e2e8f0 inset;
  border: none;
  background-color: #fff;
}
.search-row.search-row--engine .search-input--engine :deep(.el-input__wrapper) {
  padding-left: 4px;
  /* 与 40px 行高、32px 查询按钮对齐：上下各约 4px 留白，右侧与之一致 */
  padding-right: 4px;
  min-height: var(--search-engine-h);
  height: var(--search-engine-h);
  box-sizing: border-box;
}
.search-row.search-row--engine .search-input--engine :deep(.el-input__prefix) {
  margin-right: 4px;
}
.search-row.search-row--engine .search-input--engine :deep(.el-input__prefix-inner) {
  display: inline-flex;
  align-items: center;
}
.search-row.search-row--engine .search-input--engine.search-input--advanced {
  padding: 1px 4px 1px 4px;
  display: flex;
  align-items: center;
  min-height: var(--search-engine-h);
  width: 100%;
  background: #fff;
  box-sizing: border-box;
  transition: box-shadow 0.2s;
}
.search-row.search-row--engine .search-submit-btn.el-button--primary {
  min-width: 36px;
  height: 32px;
  padding: 0 12px;
  border-radius: 6px;
  border: none;
  margin-left: 0;
}
.search-row.search-row--engine .search-submit-btn.el-button--primary :deep(.el-icon) {
  font-size: 16px;
}
.search-input--advanced > .search-mode-tabs-wrap--in-input {
  flex-shrink: 0;
}
.search-row.search-row--engine .search-input--engine :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--el-color-primary) inset;
}
.search-row.search-row--engine .search-input--engine.search-input--advanced:focus-within {
  box-shadow: 0 0 0 1px var(--el-color-primary) inset;
}
.search-suffix--compact {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  padding-right: 0;
}
.search-suffix-end {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.search-toolbar-normal,
.search-toolbar-advanced {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 6px 4px 2px;
}
.match-mode-icons {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.match-mode-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  background: var(--el-fill-color-blank);
  color: var(--el-text-color-regular);
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s,
    color 0.15s;
}
.match-mode-btn:hover {
  border-color: var(--el-color-primary-light-5);
  color: var(--el-color-primary);
}
.match-mode-btn.is-active {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}
.match-mode-tip__title {
  font-weight: 600;
  margin-bottom: 4px;
}
.match-mode-tip__desc {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--el-text-color-secondary);
  max-width: 280px;
}
.any-toggle-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}
.any-pill {
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--el-border-color);
  background: var(--el-fill-color-blank);
  color: var(--el-text-color-regular);
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s,
    color 0.15s;
}
.any-pill:hover {
  border-color: var(--el-color-primary-light-5);
  color: var(--el-color-primary);
}
.any-pill.is-active {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}
.field-stats-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--el-fill-color-light);
  border: 1px dashed var(--el-border-color-lighter);
}
.field-stats-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}
.field-stats-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.field-stat-chip {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid transparent;
  background: var(--el-color-info-light-9);
  color: var(--el-text-color-primary);
  cursor: pointer;
  font-family: inherit;
  transition:
    border-color 0.15s,
    background 0.15s;
}
.field-stat-chip:hover {
  border-color: var(--el-color-primary-light-5);
}
.field-stat-chip.is-active {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}
.field-stat-num {
  font-style: normal;
  font-weight: 600;
  color: var(--el-color-primary);
  margin-left: 2px;
}
.search-row {
  display: flex;
  align-items: center;
  gap: 0;
}
.search-row .search-input {
  flex: 1;
  min-width: 0;
}
.search-row .search-input :deep(.el-input__wrapper) {
  border-radius: 8px;
}
.search-icon {
  cursor: pointer;
  font-size: 16px;
  margin: 0 4px;
}
.search-row.search-row--engine .search-suffix--compact .search-icon {
  margin: 0;
  color: var(--el-input-icon-color, var(--el-text-color-placeholder));
}
.search-icon:hover {
  color: var(--el-color-primary);
}
.search-reset-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0 4px;
  padding: 0;
  border-radius: 0;
  background: transparent;
  color: var(--el-input-icon-color, var(--el-text-color-placeholder));
  cursor: pointer;
  flex-shrink: 0;
  transition: color 0.15s;
}
.search-reset-btn:hover {
  background: transparent;
  color: var(--el-color-primary);
}
.search-reset-btn__icon {
  font-size: 16px;
}
.search-suffix {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.match-select {
  width: 100px;
}
/* 匹配下拉：去掉外边框（含 focus/hover 态） */
.match-select :deep(.el-select__wrapper),
.match-select :deep(.el-input__wrapper) {
  padding: 4px 8px;
  border: none !important;
  box-shadow: none !important;
  background: transparent;
}
.match-select :deep(.el-select__wrapper:hover),
.match-select :deep(.el-select__wrapper.is-focused),
.match-select :deep(.el-select__wrapper.is-focus),
.match-select :deep(.el-input__wrapper:hover),
.match-select :deep(.el-input__wrapper.is-focused),
.match-select :deep(.el-input__wrapper.is-focus) {
  border: none !important;
  box-shadow: none !important;
}
.any-icon {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
  border: none;
  background: transparent;
  color: var(--el-text-color-regular);
}
.any-icon:hover {
  color: var(--el-color-primary);
}
.any-icon--active {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}
.any-icon--exclude .any-icon-slash {
  text-decoration: line-through;
}
.common-searches {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 4px;
}
.common-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.common-tag {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-7);
  cursor: pointer;
}
/* 高级模式：外层皮肤已随 .search-input--engine 与普通过检共用；以下仅保留内部布局 */
.search-input--advanced .search-input__inner {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 3px 0;
}
.search-input--advanced .search-input__inner--advanced {
  align-content: center;
}
.search-input--advanced .search-input__suffix.search-suffix {
  margin-left: auto;
  flex-shrink: 0;
}
.adv-inline-condition {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}
.adv-inline-chip {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 20px;
  white-space: nowrap;
  box-shadow: 0 0 0 1px rgba(148, 163, 184, 0.35);
}
.adv-inline-chip--field {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-weight: 500;
}
.adv-inline-chip--op {
  background: var(--el-fill-color-lighter);
  color: var(--el-text-color-regular);
}
.adv-inline-chip--value {
  background: var(--el-fill-color);
  color: var(--el-text-color-regular);
}
.adv-inline-chip--connector {
  background: #e5e7eb;
  color: var(--el-text-color-primary);
}
.adv-inline-chip-close {
  cursor: pointer;
  font-size: 12px;
  margin-left: 2px;
}
.adv-inline-chip-close:hover {
  color: var(--el-color-danger);
}
.adv-inline-remove {
  cursor: pointer;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.adv-inline-remove:hover {
  color: var(--el-color-danger);
}
.adv-inline-field-wrap {
  position: relative;
  display: inline-flex;
  min-width: 140px;
}
.adv-inline-input {
  border: none;
  outline: none;
  font-size: 14px;
  line-height: 22px;
  padding: 2px 4px;
  min-width: 120px;
  background: transparent;
  color: var(--el-text-color-regular);
}
.adv-inline-input::placeholder {
  color: var(--el-text-color-placeholder);
}
.adv-inline-value-input {
  min-width: 100px;
  max-width: 180px;
}
.adv-inline-suggestions {
  position: absolute;
  z-index: 9999;
  left: 0;
  top: 100%;
  margin-top: 2px;
  min-width: 160px;
  max-height: 200px;
  overflow: auto;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  box-shadow: var(--el-box-shadow-light);
}
.adv-inline-suggestions:has(.adv-field-panel-search) {
  min-width: 220px;
  max-height: 280px;
}
.adv-field-panel-search {
  padding: 6px 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
  position: sticky;
  top: 0;
  z-index: 1;
}
.adv-inline-option--empty {
  color: var(--el-text-color-placeholder);
  cursor: default;
}
.adv-inline-option--empty:hover {
  background: transparent;
}
.adv-inline-option {
  display: block;
  padding: 6px 10px;
  font-size: 12px;
  cursor: pointer;
}
.adv-inline-option.is-active {
  background: var(--el-color-primary-light-7);
  color: var(--el-color-primary);
}
.adv-inline-option:hover {
  background: var(--el-color-primary-light-9);
}
.adv-inline-chip--paren {
  background: var(--el-fill-color-lighter);
  color: var(--el-text-color-primary);
  font-weight: 600;
}
.adv-inline-op,
.adv-inline-connector {
  width: 72px;
}
.adv-inline-op :deep(.el-input__wrapper),
.adv-inline-connector :deep(.el-input__wrapper) {
  padding: 2px 6px;
  box-shadow: none;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
}
.adv-inline-value {
  min-width: 100px;
  max-width: 140px;
}
.adv-inline-value :deep(.el-input__wrapper) {
  padding: 2px 6px;
  border-radius: 4px;
}
.tag-stats-section {
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  overflow: hidden;
}
.tag-stats-header {
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--el-fill-color-lighter);
}
.tag-stats-body {
  padding: 8px 12px;
}
.tag-group {
  margin-bottom: 8px;
}
.tag-group-title {
  margin-right: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.filter-tag {
  margin: 2px 4px 2px 0;
  cursor: pointer;
}
.tag-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}
.tag-setting,
.tag-refresh,
.tag-tip {
  cursor: help;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.tag-setting,
.tag-refresh {
  cursor: pointer;
}
.tag-setting:hover,
.tag-refresh:hover,
.tag-tip:hover {
  color: var(--el-color-primary);
}
.business-row {
  display: inline-flex;
  align-items: center;
  flex-wrap: nowrap;
  max-width: 100%;
  overflow: hidden;
  gap: 4px;
  font-size: 12px;
}
.biz-more,
.biz-add,
.biz-manage {
  cursor: pointer;
  color: var(--el-text-color-secondary);
  margin-left: 4px;
}
.biz-more:hover,
.biz-add:hover,
.biz-manage:hover {
  color: var(--el-color-primary);
}
.biz-more-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.tag-setting-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.tag-setting-category-master {
  display: flex;
  margin-bottom: 8px;
  font-weight: 600;
}
.tag-setting-group :deep(.el-checkbox-group) {
  margin-left: 24px;
}
.table-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 0 8px;
}
.table-toolbar__right {
  margin-left: auto;
}
.column-setting-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  color: var(--el-text-color-regular);
  cursor: pointer;
  border-radius: 4px;
  transition: color 0.2s, background 0.2s;
}
.column-setting-icon:hover {
  color: var(--el-color-primary);
  background: var(--el-fill-color-light);
}
.status-priority-cell {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}
.status-priority-cell .priority-val {
  color: var(--el-text-color-secondary);
}
:deep(.el-table .col-no-wrap .cell),
:deep(.el-table th.el-table__cell) {
  white-space: nowrap;
}
:deep(.el-table .el-table__header-wrapper th) {
  white-space: nowrap;
}
/* 列设置弹窗 */
.column-setting-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.column-setting-header {
  display: flex;
  gap: 8px;
  align-items: center;
}
.column-setting-search {
  flex: 1;
  min-width: 0;
}
.column-setting-tpl {
  display: flex;
  gap: 8px;
  align-items: center;
}
.column-setting-select {
  width: 120px;
}
.column-setting-batch {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.column-setting-list {
  max-height: 240px;
  overflow-y: auto;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
}
.column-setting-list-header {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 600;
  background: var(--el-fill-color-lighter);
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.column-setting-list-header .col-check { width: 36px; }
.column-setting-list-header .col-num { width: 40px; }
.column-setting-list-header .col-name { flex: 1; min-width: 80px; }
.column-setting-list-header .col-vis { width: 80px; }
.column-setting-list-header .col-fix { width: 140px; }
.column-setting-row {
  display: flex;
  align-items: center;
  padding: 6px 10px;
  font-size: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.column-setting-row:last-child { border-bottom: none; }
.column-setting-row .col-check { width: 36px; }
.column-setting-row .col-num { width: 40px; }
.column-setting-row .col-name { flex: 1; min-width: 80px; }
.column-setting-row .col-vis { width: 80px; }
.column-setting-row .col-fix { width: 140px; }
.column-setting-footer {
  display: flex;
  justify-content: center;
}
.table-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
.table-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  width: 100%;
  overflow: hidden;
}
.table-toolbar {
  flex-shrink: 0;
}
.op-more-btn .el-icon--right {
  margin-left: 4px;
}
.hover-ip-list {
  text-align: left;
  padding: 4px 0;
}
.hover-ip-title {
  font-weight: 600;
  margin-bottom: 4px;
}
.hover-ip-item {
  font-size: 12px;
  padding-left: 8px;
}
.hover-ip-line {
  font-size: 12px;
  line-height: 1.5;
}
.service-cell .service-text {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-all;
  white-space: normal;
}
.nat-cell .nat-trigger {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-right: 6px;
  font-size: 12px;
}
.nat-cell .nat-trigger:hover {
  color: var(--el-color-primary);
}
.nat-cell-line {
  font-size: 12px;
  line-height: 1.35;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.nat-cell--single .nat-cell-line {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-all;
  white-space: normal;
  max-height: 2.7em;
}
.remark-cell {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tags-text-wrap {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-all;
  white-space: normal;
}
.tags-combined-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  max-height: 2.7em;
  overflow: hidden;
}
.tags-combined-wrap .tag-in-cell {
  flex-shrink: 0;
}
.optimize-type-cell {
  position: relative;
}
.optimize-text-link {
  cursor: pointer;
  color: var(--el-color-primary);
  text-decoration: underline;
}
.optimize-text-link:hover {
  color: var(--el-color-primary-light-3);
}
.optimize-tags-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  max-height: 2.7em;
  overflow: hidden;
}
.optimize-icon {
  margin-left: 4px;
  cursor: pointer;
  color: var(--el-color-warning);
  flex-shrink: 0;
}
.optimize-icon:hover {
  color: var(--el-color-warning-dark-2);
}
.archive-column-cell .el-table__cell {
  overflow: visible;
}
.archive-column-cell .cell {
  overflow: visible;
}
.archive-column-cell .cell {
  overflow: visible !important;
}
.archive-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 1.5em;
}
.archive-text-wrap {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}
.archive-text {
  display: block;
  min-height: 1.35em;
  font-size: 12px;
}
.archive-text-two-line {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-all;
  white-space: normal;
  line-height: 1.35;
}
.archive-edit-icon {
  flex-shrink: 0;
  cursor: pointer;
  color: var(--el-text-color-secondary);
  z-index: 2;
  display: inline-flex;
  align-items: center;
  width: 20px;
  height: 20px;
}
.archive-edit-icon:hover {
  color: var(--el-color-primary);
}
.archive-column-cell .cell {
  overflow: visible;
}
.archive-edit-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.archive-edit-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.archive-edit-label {
  width: 100px;
  flex-shrink: 0;
}
.archive-edit-row .el-input {
  flex: 1;
}
.tag-edit-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.tag-edit-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
.tag-edit-label {
  width: 60px;
  flex-shrink: 0;
  line-height: 32px;
}
.tag-edit-row .el-input {
  flex: 1;
}
.tag-edit-tag-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}
.tag-edit-tag-remark {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.remark-warn {
  color: var(--el-color-warning);
}
.nat-icon {
  margin-left: 4px;
  cursor: help;
  font-size: 12px;
}
.tags-in-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}
.context-menu {
  position: fixed;
  z-index: 9999;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  box-shadow: var(--el-box-shadow-light);
  padding: 4px 0;
  min-width: 120px;
}
.context-item {
  padding: 6px 12px;
  cursor: pointer;
  font-size: 13px;
}
.context-item:hover {
  background: var(--el-fill-color);
}
.context-item.danger {
  color: var(--el-color-danger);
}
/* 列设置弹窗 */
.column-setting-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px;
}
.column-setting-header {
  display: flex;
  align-items: center;
  gap: 8px;
}
.column-setting-search {
  flex: 1;
  min-width: 0;
}
.column-setting-tpl {
  display: flex;
  align-items: center;
  gap: 8px;
}
.column-setting-select {
  width: 120px;
}
.column-setting-batch {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.column-setting-list {
  max-height: 240px;
  overflow-y: auto;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
}
.column-setting-list-header {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 600;
  background: var(--el-fill-color-lighter);
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.column-setting-row {
  display: flex;
  align-items: center;
  padding: 6px 10px;
  font-size: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.column-setting-row:last-child {
  border-bottom: none;
}
.column-setting-list-header .col-check,
.column-setting-row .col-check { width: 36px; flex-shrink: 0; }
.column-setting-list-header .col-num,
.column-setting-row .col-num { width: 40px; flex-shrink: 0; }
.column-setting-list-header .col-name,
.column-setting-row .col-name { flex: 1; min-width: 0; }
.column-setting-list-header .col-vis,
.column-setting-row .col-vis { width: 70px; flex-shrink: 0; }
.column-setting-list-header .col-fix,
.column-setting-row .col-fix { width: 140px; flex-shrink: 0; }
.column-setting-footer {
  text-align: center;
  padding-top: 4px;
}
/* 状态/优先级列：单行紧凑展示 */
.status-priority-cell {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}
.context-menu-mask {
  position: fixed;
  inset: 0;
  z-index: 9998;
}

/* 策略明细弹窗 */
.policy-detail-dialog :deep(.el-dialog__body) {
  max-height: 70vh;
  overflow-y: auto;
}
.policy-detail-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}
.policy-detail-header-left {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.tag-block {
  display: inline-block;
  width: 8px;
  height: 16px;
  border-radius: 2px;
  flex-shrink: 0;
}
.policy-detail-desc {
  font-size: 13px;
  word-break: break-all;
}
.policy-detail-desc .desc-status.enabled { color: var(--el-color-success); }
.policy-detail-desc .desc-status.disabled { color: var(--el-color-danger); }
.policy-detail-desc .desc-action.allow { color: var(--el-color-success); }
.policy-detail-desc .desc-action.deny { color: var(--el-color-danger); }
.policy-detail-header-right {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}
.policy-detail-header-actions {
  flex-shrink: 0;
}
.detail-max-btn {
  flex-shrink: 0;
}
.valid-ip .section-title {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}
.policy-detail-body {
  padding: 0;
}
.policy-detail-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.policy-detail-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.policy-detail-section {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  padding: 12px;
  min-width: 0;
}
.policy-detail-section.base-info { grid-column: 1; }
.policy-detail-section.hit-info { grid-column: 2; }
.section-title {
  font-weight: 600;
  margin-bottom: 8px;
  font-size: 13px;
}
.section-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}
.section-title-row .section-title {
  margin-bottom: 0;
}
.info-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 16px;
  font-size: 12px;
}
.info-row { display: contents; }
.info-row .info-k { color: var(--el-text-color-secondary); }
.info-row .info-v { word-break: break-all; }
.info-remark, .info-source {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--el-border-color-lighter);
}
.info-remark {
  background: var(--el-fill-color-light);
  padding: 10px 12px;
  border-radius: 4px;
  margin-left: -12px;
  margin-right: -12px;
  padding-left: 12px;
  padding-right: 12px;
}
.info-remark .info-k, .info-source .info-k {
  display: block;
  margin-bottom: 4px;
  color: var(--el-text-color-secondary);
  font-weight: 600;
}
.info-source pre {
  margin: 0;
  font-size: 11px;
  white-space: pre-wrap;
  word-break: break-all;
}
.hit-bars { display: flex; flex-direction: column; gap: 8px; }
.hit-item { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.hit-label { min-width: 70px; }
.hit-bar-wrap { flex: 1; display: flex; align-items: center; gap: 8px; }
.hit-bar-wrap :deep(.el-progress) { flex: 1; }
.hit-count { flex-shrink: 0; color: var(--el-text-color-secondary); }
.detail-table-wrap { min-height: 0; }
.valid-ip-body { display: flex; flex-direction: column; gap: 8px; }
.valid-ip-row { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.valid-ip-row .info-k { color: var(--el-text-color-secondary); min-width: 70px; }
.valid-ip-row .info-v { flex: 1; word-break: break-all; }
.valid-ip-tip { color: var(--el-color-info); cursor: help; margin-left: 4px; }
.detail-link { color: var(--el-color-primary); text-decoration: none; }
.detail-link:hover { text-decoration: underline; }
.table-empty { padding: 16px; text-align: center; color: var(--el-text-color-placeholder); font-size: 12px; }
</style>
<style>
/* 统计区域标签 hover 提示：每类定义单独一行显示 */
.tag-stats-tooltip-popper {
  white-space: pre-line;
}
</style>
