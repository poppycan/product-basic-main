<script setup lang="ts">
/**
 * 设备树（单选）：基于「设备树.复选」交互改造，同一时刻最多选中一台设备；
 * 单击选中，再次单击同一设备取消选中；不选表示不按设备过滤。
 */
import { computed, ref, watch } from 'vue';
import {
  ElDialog,
  ElIcon,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElTooltip,
  ElTree,
} from 'element-plus';
import { CirclePlus } from '@element-plus/icons-vue';
import { mockDeviceTree } from '@/api/mock/security-policy';
import type { DeviceGroup, FirewallDevice } from '@/types/security-policy';

const props = withDefaults(
  defineProps<{
    groups?: DeviceGroup[];
    title?: string;
  }>(),
  { title: '设备' },
);

const emit = defineEmits<{
  (e: 'add-device'): void;
}>();

/** 当前选中的设备节点 id；null 表示未选（全部） */
const selectedId = defineModel<string | null>('selectedId', { default: null });

const sourceGroups = computed(() => props.groups ?? mockDeviceTree);

const deviceKeyword = ref('');
const deviceCount = computed(() =>
  sourceGroups.value.reduce((sum, g) => sum + (g.children?.length ?? 0), 0),
);

const baseTreeData = computed(() =>
  sourceGroups.value.map((g: DeviceGroup) => ({
    id: g.id,
    label: g.name,
    isGroup: true,
    children: g.children.map((d: FirewallDevice) => ({
      id: d.id,
      label: d.name,
      isGroup: false,
      device: d,
    })),
  })),
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

const defaultProps = { children: 'children', label: 'label' };
const treeRef = ref<{ setCurrentKey: (k?: string) => void } | null>(null);

const getNodeIcon = (data: { isGroup?: boolean; device?: FirewallDevice }) => {
  if (data.isGroup) return null;
  return data.device?.enabled ? '🟢' : '🔴';
};

function clearHighlight() {
  treeRef.value?.setCurrentKey(undefined);
}

watch(
  selectedId,
  (id) => {
    void id;
    if (id) treeRef.value?.setCurrentKey(id);
    else clearHighlight();
  },
  { flush: 'post' },
);

function onNodeClick(
  data: { id?: string; isGroup?: boolean; device?: FirewallDevice },
) {
  if (data.isGroup) return;
  const id = data.id ? String(data.id) : null;
  if (!id) return;
  if (selectedId.value === id) {
    selectedId.value = null;
    clearHighlight();
    return;
  }
  selectedId.value = id;
  treeRef.value?.setCurrentKey(id);
}

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

const devicePropsVisible = ref(false);
const devicePropsDevice = ref<FirewallDevice | null>(null);
function openDeviceProps(device: FirewallDevice) {
  devicePropsDevice.value = device;
  devicePropsVisible.value = true;
  closeContextMenu();
}
const handleDeviceDelete = () => {
  ElMessageBox.confirm(
    '删除后，该设备在平台中心的信息将全部清除，历史记录不予保留，且不可恢复。确定删除吗？',
    '删除设备',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    },
  )
    .then(() => {
      ElMessage.success('已删除（占位）');
      closeContextMenu();
    })
    .catch(() => closeContextMenu());
};

function onAddDevice() {
  emit('add-device');
  ElMessage.info('添加设备（占位）');
}
</script>

<template>
  <div class="security-policy-device-tree security-policy-device-tree--single">
    <div class="left-panel">
      <div class="panel-title-row">
        <span class="panel-title">{{ title }}（{{ deviceCount }}）</span>
        <ElTooltip content="添加设备">
          <span class="device-add-icon" @click="onAddDevice">
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
          ref="treeRef"
          :data="treeData"
          :props="defaultProps"
          node-key="id"
          highlight-current
          :default-expand-all="true"
          @node-click="onNodeClick"
          @node-contextmenu="onTreeContextMenu"
        >
          <template #default="{ node, data }">
            <span class="tree-node">
              <span v-if="!data.isGroup" class="node-icon">{{ getNodeIcon(data) }}</span>
              <span class="node-label">{{ node.label }}</span>
            </span>
          </template>
        </ElTree>
      </div>
    </div>

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
      <div v-if="contextMenuDevice" class="context-item" @click="openDeviceProps(contextMenuDevice)">
        属性
      </div>
      <div class="context-item danger" @click="handleDeviceDelete">设备删除</div>
    </div>
    <div v-show="contextMenuVisible" class="context-menu-mask" @click="closeContextMenu" />

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
  </div>
</template>

<style scoped>
.security-policy-device-tree {
  width: 260px;
  flex-shrink: 0;
  position: relative;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-self: stretch;
  height: 100%;
}
.left-panel {
  flex: 1;
  min-height: 0;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  padding: 8px;
  display: flex;
  flex-direction: column;
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
  transition:
    transform 0.2s,
    box-shadow 0.2s;
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
  min-width: 0;
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
.context-menu-mask {
  position: fixed;
  inset: 0;
  z-index: 9998;
}
</style>
