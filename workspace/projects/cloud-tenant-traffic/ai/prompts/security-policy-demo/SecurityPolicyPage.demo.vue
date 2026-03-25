<!--
  安全策略页面 - Demo 参考实现
  使用说明：可复制到 src/pages 并替换 PolicyAnalysisSecurityPolicy.vue 内容，或作为实现参考。
  集成时请使用 @/components/PageHeader、PageContent，并接入真实 API。
-->
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  ElButton,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElIcon,
  ElInput,
  ElOption,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
  ElTooltip,
  ElTree,
  ElMessage,
  ElMessageBox,
  vLoading,
} from 'element-plus';
import { Delete, MoreFilled, Refresh, Search, Star, ArrowDown, ArrowUp, WarningFilled } from '@element-plus/icons-vue';
import { mockDeviceTree, mockTagStats, searchPolicies } from './mock.security-policy';
import type {
  DeviceGroup,
  FirewallDevice,
  PolicyRow,
  SearchParams,
  TagFilterItem,
  CommonSearchItem,
} from './types.security-policy';

const STORAGE_KEY = 'securityPolicy.commonSearches';
const MAX_COMMON = 5;

// ---------- 左侧树 ----------
const treeData = computed(() =>
  mockDeviceTree.map((g: DeviceGroup) => ({
    id: g.id,
    label: g.name,
    isGroup: true,
    children: g.children.map((d: FirewallDevice) => ({
      id: d.id,
      label: `${d.name}，${d.policyTotal}/${d.problemCount}`,
      isGroup: false,
      device: d,
    })),
  }))
);

const selectedDeviceIds = ref<string[]>([]);
const treeRef = ref<InstanceType<typeof ElTree>>();
const treeHeight = ref(400);

const defaultProps = { children: 'children', label: 'label' };
const getNodeIcon = (data: { isGroup?: boolean; device?: FirewallDevice }) => {
  if (data.isGroup) return null;
  return data.device?.enabled ? '🟢' : '🔴';
};

const handleTreeCheck = (_data: unknown, { checkedNodes }: { checkedNodes: { id: string; isGroup?: boolean }[] }) => {
  selectedDeviceIds.value = (checkedNodes || []).filter((n) => !n.isGroup).map((n) => n.id);
};

// 右键菜单
const contextMenuVisible = ref(false);
const contextMenuPosition = ref({ x: 0, y: 0 });
const contextMenuDevice = ref<FirewallDevice | null>(null);

const onTreeContextMenu = (event: MouseEvent, data: { isGroup?: boolean; device?: FirewallDevice }) => {
  if (data?.isGroup) return;
  event.preventDefault();
  contextMenuDevice.value = data?.device ?? null;
  contextMenuPosition.value = { x: event.clientX, y: event.clientY };
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

// ---------- 检索 ----------
const searchMode = ref<'normal' | 'advanced'>('normal');
const queryText = ref('');
const policyNameOrId = ref('');
const actionFilter = ref('');
const srcIp = ref('');
const dstIp = ref('');
const port = ref('');
const anyMode = ref<SearchParams['anyMode']>('');
const matchMode = ref<SearchParams['matchMode']>('all');
const tagFilters = ref<TagFilterItem[]>([]);

const searchParams = computed<SearchParams>(() => ({
  queryText: searchMode.value === 'advanced' ? queryText.value : undefined,
  policyNameOrId: searchMode.value === 'normal' ? policyNameOrId.value : undefined,
  action: actionFilter.value || undefined,
  srcIp: srcIp.value || undefined,
  dstIp: dstIp.value || undefined,
  port: port.value || undefined,
  anyMode: anyMode.value,
  matchMode: matchMode.value,
  deviceIds: selectedDeviceIds.value,
  tagFilters: tagFilters.value,
}));

const doSearch = () => {
  loading.value = true;
  setTimeout(() => {
    const res = searchPolicies(searchParams.value);
    tableData.value = res.items;
    total.value = res.total;
    tagStats.value = res.tagStats;
    loading.value = false;
  }, 300);
};

const resetSearch = () => {
  queryText.value = '';
  policyNameOrId.value = '';
  actionFilter.value = '';
  srcIp.value = '';
  dstIp.value = '';
  port.value = '';
  anyMode.value = '';
  matchMode.value = 'all';
  tagFilters.value = [];
};

const onSearchKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') doSearch();
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
  const list = [...commonSearches.value];
  const item: CommonSearchItem = {
    id: Date.now().toString(),
    label: queryText.value || policyNameOrId.value || '未命名条件',
    params: { ...searchParams.value },
    createdAt: Date.now(),
  };
  list.unshift(item);
  if (list.length > MAX_COMMON) list.length = MAX_COMMON;
  commonSearches.value = list;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  ElMessage.success('已设为常用检索');
};
const removeCommon = (id: string) => {
  commonSearches.value = commonSearches.value.filter((c) => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(commonSearches.value));
};
const applyCommon = (item: CommonSearchItem) => {
  const p = item.params;
  if (p?.queryText) queryText.value = p.queryText;
  if (p?.policyNameOrId) policyNameOrId.value = p.policyNameOrId;
  if (p?.anyMode) anyMode.value = p.anyMode;
  if (p?.matchMode) matchMode.value = p.matchMode;
  if (p?.tagFilters) tagFilters.value = p.tagFilters;
  doSearch();
};

// ---------- 标签统计（可折叠） ----------
const tagStatsCollapsed = ref(true);
const tagStats = ref(mockTagStats);
const toggleTagStats = () => {
  tagStatsCollapsed.value = !tagStatsCollapsed.value;
};

const toggleTagFilter = (category: 'lifecycle' | 'quality' | 'business', key: string, label: string) => {
  const item: TagFilterItem = { category, key, label };
  const idx = tagFilters.value.findIndex((f) => f.category === category && f.key === key);
  if (idx >= 0) tagFilters.value = tagFilters.value.filter((_, i) => i !== idx);
  else tagFilters.value = [...tagFilters.value, item];
  doSearch();
};

const isTagSelected = (category: string, key: string) =>
  tagFilters.value.some((f) => f.category === category && f.key === key);

// ---------- 列表 ----------
const loading = ref(false);
const tableData = ref<PolicyRow[]>([]);
const total = ref(0);

watch(
  [selectedDeviceIds, tagFilters],
  () => doSearch(),
  { deep: true }
);

function formatHitCount(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

const openDetail = () => ElMessage.info('策略明细弹窗（占位）');
const openPathAnalysis = () => ElMessage.info('路径分析（URL 占位）');
const openCompliance = () => {
  const loadingInstance = ElLoading.service({ text: '合规分析中请稍等' });
  setTimeout(() => loadingInstance.close(), 1500);
};
const openRecycle = () => ElMessage.info('策略回收（工单占位）');
const openOptimize = () => ElMessage.info('去优化弹窗（占位）');
const openEdit = () => ElMessage.info('编辑（工单占位）');
const openDelete = () => ElMessage.info('删除（工单占位）');
const openCommand = () => ElMessage.info('查看命令弹窗（占位）');
const openHitAnalysis = () => ElMessage.info('命中分析（URL 占位）');

const remarkTip = (row: PolicyRow) => {
  if (row.remarkFlags?.empty) return '策略备注为空';
  if (row.remarkFlags?.missingOwner) return '无相关负责人';
  if (row.remarkFlags?.missingPurpose) return '无相关用途描述';
  return row.remark || '';
};

const natSourceRuleText = (row: PolicyRow) =>
  row.snatRules?.map((r) => `${r.fromIp}转${r.toIp}:${r.ruleName} ${r.valid ? '有效' : '无效'}`).join('\n') || '-';
const natDestRuleText = (row: PolicyRow) =>
  row.dnatRules?.map((r) => `${r.fromIp}转${r.toIp}:${r.ruleName} ${r.valid ? '有效' : '无效'}`).join('\n') || '-';

// 初始加载
loadCommonSearches();
doSearch();
</script>

<template>
  <section class="security-policy-demo">
    <!-- 占位页头：集成时替换为 PageHeader + 页面说明 -->
    <div class="demo-header">
      <span class="demo-title">安全策略</span>
      <span class="demo-subtitle">设备与策略检索</span>
    </div>

    <div class="demo-layout">
      <!-- 左侧设备树（固定高度、独立滚动） -->
      <div class="left-panel">
        <div class="panel-title">设备</div>
        <div class="tree-wrap" :style="{ height: treeHeight + 'px' }">
          <ElTree
            ref="treeRef"
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
                <span>{{ node.label }}</span>
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
        <!-- 搜索栏（视觉强化） -->
        <div class="search-bar">
          <div class="search-row">
            <ElSelect v-model="searchMode" size="small" style="width: 100px">
              <ElOption label="普通检索" value="normal" />
              <ElOption label="高级检索" value="advanced" />
            </ElSelect>
            <template v-if="searchMode === 'advanced'">
              <ElInput
                v-model="queryText"
                placeholder="自由输入条件模糊匹配"
                clearable
                size="small"
                style="flex: 1; max-width: 280px"
                @keydown="onSearchKeydown"
              />
            </template>
            <template v-else>
              <ElInput v-model="policyNameOrId" placeholder="策略名称/ID" clearable size="small" style="width: 120px" />
              <ElInput v-model="actionFilter" placeholder="动作" clearable size="small" style="width: 80px" />
              <ElInput v-model="srcIp" placeholder="源IP" clearable size="small" style="width: 110px" />
              <ElInput v-model="dstIp" placeholder="目的IP" clearable size="small" style="width: 110px" />
              <ElInput v-model="port" placeholder="端口" clearable size="small" style="width: 80px" />
            </template>
            <ElSelect v-model="anyMode" placeholder="含any" clearable size="small" style="width: 100px">
              <ElOption label="含any" value="include" />
              <ElOption label="不含any" value="exclude" />
            </ElSelect>
            <ElSelect v-model="matchMode" size="small" style="width: 100px">
              <ElOption label="全包含" value="all" />
              <ElOption label="包含输入" value="include" />
              <ElOption label="排除输入" value="exclude" />
              <ElOption label="相等" value="equal" />
              <ElOption label="部分匹配" value="partial" />
            </ElSelect>
            <ElButton type="primary" size="small" :icon="Search" @click="doSearch">检索</ElButton>
            <ElButton size="small" :icon="Refresh" @click="resetSearch">重置</ElButton>
          </div>
        </div>

        <!-- 常用检索 -->
        <div class="common-searches">
          <ElButton link size="small" :icon="Star" @click="saveAsCommon">设为常用检索</ElButton>
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

        <!-- 策略标签统计（可折叠，默认收起） -->
        <div class="tag-stats-section">
          <div class="tag-stats-header" @click="toggleTagStats">
            <span>策略标签统计</span>
            <ElIcon><ArrowDown v-if="tagStatsCollapsed" /><ArrowUp v-else /></ElIcon>
          </div>
          <div v-show="!tagStatsCollapsed" class="tag-stats-body">
            <div class="tag-group">
              <span class="tag-group-title">生命周期状态</span>
              <ElTag
                v-for="(count, key) in tagStats.lifecycle"
                :key="'l-' + key"
                :type="isTagSelected('lifecycle', key) ? 'primary' : 'info'"
                size="small"
                class="filter-tag"
                @click="toggleTagFilter('lifecycle', key, key)"
              >
                {{ key }} {{ count }}
              </ElTag>
            </div>
            <div class="tag-group">
              <span class="tag-group-title">策略质量</span>
              <ElTag
                v-for="(count, key) in tagStats.quality"
                :key="'q-' + key"
                :type="isTagSelected('quality', key) ? 'primary' : 'info'"
                size="small"
                class="filter-tag"
                @click="toggleTagFilter('quality', key, key)"
              >
                {{ key }} {{ count }}
              </ElTag>
            </div>
            <div class="tag-group">
              <span class="tag-group-title">业务标签</span>
              <ElTag
                v-for="(count, key) in tagStats.business"
                :key="'b-' + key"
                :type="isTagSelected('business', key) ? 'primary' : 'info'"
                size="small"
                class="filter-tag"
                @click="toggleTagFilter('business', key, key)"
              >
                {{ key }} {{ count }}
              </ElTag>
            </div>
          </div>
        </div>

        <!-- 列表（高度自适应） -->
        <div class="table-wrap" v-loading="loading">
          <ElTable :data="tableData" border stripe max-height="100%">
            <ElTableColumn label="策略信息" min-width="160">
              <template #default="{ row }">
                <div class="cell-multi">
                  <div class="cell-main">{{ row.name }}</div>
                  <div class="cell-sub">ID：{{ row.id }}｜设备：{{ row.deviceName }}</div>
                </div>
              </template>
            </ElTableColumn>
            <ElTableColumn label="源" min-width="120">
              <template #default="{ row }">
                <div class="cell-multi">
                  <div class="cell-sub">区域：{{ row.srcZone }}</div>
                  <div class="cell-sub">源IP：{{ row.srcIp.join(', ') }}</div>
                </div>
              </template>
            </ElTableColumn>
            <ElTableColumn label="目的" min-width="120">
              <template #default="{ row }">
                <div class="cell-multi">
                  <div class="cell-sub">区域：{{ row.dstZone }}</div>
                  <div class="cell-sub">目的IP：{{ row.dstIp.join(', ') }}</div>
                </div>
              </template>
            </ElTableColumn>
            <ElTableColumn label="服务" min-width="100">
              <template #default="{ row }">
                <div class="cell-multi">
                  <div class="cell-sub">{{ row.service.join('，') }}</div>
                  <div class="cell-sub">{{ row.action === 'allow' ? '允许' : '拒绝' }}</div>
                </div>
              </template>
            </ElTableColumn>
            <ElTableColumn label="状态/优先级" width="100">
              <template #default="{ row }">
                <div class="cell-multi">
                  <div class="cell-sub">{{ row.enabled ? '启用' : '停用' }}</div>
                  <div class="cell-sub">优先级 {{ row.priority }}</div>
                </div>
              </template>
            </ElTableColumn>
            <ElTableColumn label="NAT信息" min-width="140">
              <template #default="{ row }">
                <div class="cell-multi">
                  <div class="cell-sub">
                    <ElTooltip :content="row.snatSourceIps?.join(', ') || '-'">
                      <span>转换前源IP：{{ row.snatSourceIps?.[0] || '-' }}</span>
                    </ElTooltip>
                    <ElTooltip :content="natSourceRuleText(row)" placement="top">
                      <ElIcon class="nat-icon"><WarningFilled /></ElIcon>
                    </ElTooltip>
                  </div>
                  <div class="cell-sub">
                    转换目的：{{ row.dnatDest || '-' }}
                    <ElTooltip :content="natDestRuleText(row)" placement="top">
                      <ElIcon class="nat-icon"><WarningFilled /></ElIcon>
                    </ElTooltip>
                  </div>
                </div>
              </template>
            </ElTableColumn>
            <ElTableColumn label="关联专线" min-width="100">
              <template #default="{ row }">
                <ElTooltip :content="row.lines.join('，')" :disabled="row.lines.length <= 1">
                  <span>{{ row.lines.join('，') || '-' }}</span>
                </ElTooltip>
              </template>
            </ElTableColumn>
            <ElTableColumn label="策略备注" min-width="200">
              <template #default="{ row }">
                <div class="cell-multi remark-cell">
                  <ElTooltip :content="remarkTip(row)" placement="top">
                    <span v-if="row.remarkFlags?.empty || row.remarkFlags?.missingOwner || row.remarkFlags?.missingPurpose" class="remark-warn">
                      <ElIcon><WarningFilled /></ElIcon>
                      {{ row.remark || '信息缺失' }}
                    </span>
                    <span v-else>{{ row.remark || '-' }}</span>
                  </ElTooltip>
                </div>
              </template>
            </ElTableColumn>
            <ElTableColumn label="命中信息" width="160">
              <template #default="{ row }">
                <div class="cell-multi">
                  <div class="cell-sub">命中次数：{{ formatHitCount(row.hitCount) }}</div>
                  <div class="cell-sub">
                    <span>最近：{{ row.hitLastTime || '-' }}</span>
                    <ElButton link type="primary" size="small" @click="openHitAnalysis">命中分析</ElButton>
                  </div>
                </div>
              </template>
            </ElTableColumn>
            <ElTableColumn label="标签" min-width="100">
              <template #default="{ row }">
                <ElTooltip :content="row.tags.join('，')" :disabled="row.tags.length <= 4">
                  <div class="tags-in-cell">
                    <ElTag v-for="t in row.tags.slice(0, 4)" :key="t" size="small">{{ t }}</ElTag>
                  </div>
                </ElTooltip>
              </template>
            </ElTableColumn>
            <ElTableColumn label="操作" width="280" fixed="right">
              <template #default>
                <ElButton link type="primary" size="small" @click="openDetail">详情</ElButton>
                <ElButton link type="primary" size="small" @click="openPathAnalysis">路径分析</ElButton>
                <ElButton link type="primary" size="small" @click="openCompliance">合规分析</ElButton>
                <ElButton link type="primary" size="small" @click="openRecycle">策略回收</ElButton>
                <ElButton link type="primary" size="small" @click="openOptimize">去优化</ElButton>
                <ElButton link type="primary" size="small" @click="openEdit">编辑</ElButton>
                <ElButton link type="primary" size="small" @click="openDelete">删除</ElButton>
                <ElButton link type="primary" size="small" @click="openCommand">查看命令</ElButton>
              </template>
            </ElTableColumn>
          </ElTable>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.security-policy-demo {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.demo-header {
  padding: 8px 12px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  margin-bottom: 10px;
  background: var(--el-bg-color);
}
.demo-title { font-weight: 600; }
.demo-subtitle { margin-left: 8px; color: var(--el-text-color-secondary); font-size: 13px; }
.demo-layout {
  flex: 1;
  display: flex;
  gap: 12px;
  min-height: 0;
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
}
.panel-title { font-weight: 500; margin-bottom: 8px; }
.tree-wrap {
  overflow: auto;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  padding: 4px;
}
.tree-node { display: inline-flex; align-items: center; gap: 4px; }
.node-icon { font-size: 10px; }
.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}
.search-bar {
  padding: 12px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  background: var(--el-fill-color-light);
}
.search-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.common-searches {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.common-tag {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-7);
  cursor: pointer;
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
.tag-stats-body { padding: 8px 12px; }
.tag-group { margin-bottom: 8px; }
.tag-group-title { margin-right: 8px; font-size: 12px; color: var(--el-text-color-secondary); }
.filter-tag { margin: 2px 4px 2px 0; cursor: pointer; }
.table-wrap {
  flex: 1;
  min-height: 200px;
  overflow: auto;
}
.cell-multi { font-size: 12px; }
.cell-main { font-weight: 500; }
.cell-sub { color: var(--el-text-color-secondary); }
.remark-cell { max-width: 200px; overflow: hidden; text-overflow: ellipsis; }
.remark-warn { color: var(--el-color-warning); }
.nat-icon { margin-left: 4px; cursor: help; font-size: 12px; }
.tags-in-cell { display: flex; flex-wrap: wrap; gap: 2px; }
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
.context-item { padding: 6px 12px; cursor: pointer; font-size: 13px; }
.context-item:hover { background: var(--el-fill-color); }
.context-item.danger { color: var(--el-color-danger); }
.context-menu-mask {
  position: fixed;
  inset: 0;
  z-index: 9998;
}
</style>
