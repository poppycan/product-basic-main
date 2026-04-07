<script setup lang="ts">
import {
  ArrowDown,
  ArrowUp,
  Bottom,
  DArrowLeft,
  DArrowRight,
  Hide,
  Rank,
  Search,
  SetUp,
  Top,
  View,
} from '@element-plus/icons-vue';
import { ElButton, ElCheckbox, ElIcon, ElInput, ElOption, ElPopover, ElSelect, ElSwitch, ElTooltip } from 'element-plus';
import type { TableColumnSettingsApi } from '@/composables/useTableColumnSettings';

defineProps<{
  api: TableColumnSettingsApi;
}>();
</script>

<template>
  <div class="table-column-setting-wrap">
    <ElPopover
      v-model:visible="api.columnSettingVisible"
      placement="bottom-end"
      :width="520"
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
            v-model="api.columnSettingKeyword"
            placeholder="输入关键字"
            size="small"
            clearable
            class="column-setting-search"
            @keydown.enter="api.filterColumnList"
          >
            <template #prefix>
              <ElIcon><Search /></ElIcon>
            </template>
          </ElInput>
          <div class="column-setting-tpl">
            <ElSelect
              v-model="api.columnSettingTemplate"
              size="small"
              placeholder="列表样式"
              class="column-setting-select"
              @change="api.onColumnTemplateChange"
            >
              <ElOption v-for="t in api.columnTemplates" :key="t.id" :label="t.name" :value="t.id" />
            </ElSelect>
            <ElButton type="primary" size="small" @click="api.resetColumnTemplate">重置</ElButton>
          </div>
        </div>
        <div class="column-setting-batch">
          <ElTooltip content="隐藏" placement="top">
            <span class="column-setting-batch-icon" @click="api.batchColumnOp('hide')">
              <ElIcon :size="18"><Hide /></ElIcon>
            </span>
          </ElTooltip>
          <ElTooltip content="显示" placement="top">
            <span class="column-setting-batch-icon" @click="api.batchColumnOp('show')">
              <ElIcon :size="18"><View /></ElIcon>
            </span>
          </ElTooltip>
          <ElTooltip content="置顶" placement="top">
            <span class="column-setting-batch-icon" @click="api.batchColumnOp('pinTop')">
              <ElIcon :size="18"><Top /></ElIcon>
            </span>
          </ElTooltip>
          <ElTooltip content="置底" placement="top">
            <span class="column-setting-batch-icon" @click="api.batchColumnOp('pinBottom')">
              <ElIcon :size="18"><Bottom /></ElIcon>
            </span>
          </ElTooltip>
          <ElTooltip content="上移" placement="top">
            <span class="column-setting-batch-icon" @click="api.batchColumnOp('moveUp')">
              <ElIcon :size="18"><ArrowUp /></ElIcon>
            </span>
          </ElTooltip>
          <ElTooltip content="下移" placement="top">
            <span class="column-setting-batch-icon" @click="api.batchColumnOp('moveDown')">
              <ElIcon :size="18"><ArrowDown /></ElIcon>
            </span>
          </ElTooltip>
        </div>
        <div class="column-setting-list">
          <div class="column-setting-list-header">
            <span class="col-check">序号</span>
            <span class="col-num">#</span>
            <span class="col-name">表头名称</span>
            <span class="col-vis">隐藏/显示</span>
            <span class="col-fix">固定位置</span>
          </div>
          <template v-for="(col, idx) in api.filteredColumnDefs" :key="col.key">
            <div class="column-setting-row">
              <span class="col-check">
                <ElCheckbox v-model="col.checked" />
              </span>
              <span class="col-num">{{ idx + 1 }}</span>
              <span class="col-name">{{ col.label }}</span>
              <span class="col-vis">
                <ElSwitch
                  :model-value="col.visible"
                  size="small"
                  @update:model-value="(v) => api.onColumnVisibleChange(col, !!v)"
                />
              </span>
              <span class="col-fix">
                <span class="column-fix-seg">
                  <ElTooltip content="左固定" placement="top">
                    <span
                      class="column-fix-seg__btn"
                      :class="{ 'is-active': col.fixed === 'left' }"
                      @click="col.fixed = 'left'"
                    >
                      <ElIcon :size="16"><DArrowLeft /></ElIcon>
                    </span>
                  </ElTooltip>
                  <ElTooltip content="不固定" placement="top">
                    <span
                      class="column-fix-seg__btn"
                      :class="{ 'is-active': col.fixed === false || col.fixed === '' }"
                      @click="col.fixed = false"
                    >
                      <ElIcon :size="16"><Rank /></ElIcon>
                    </span>
                  </ElTooltip>
                  <ElTooltip content="右固定" placement="top">
                    <span
                      class="column-fix-seg__btn"
                      :class="{ 'is-active': col.fixed === 'right' }"
                      @click="col.fixed = 'right'"
                    >
                      <ElIcon :size="16"><DArrowRight /></ElIcon>
                    </span>
                  </ElTooltip>
                </span>
              </span>
            </div>
            <template v-if="api.isMultiFieldColumnDef(col)">
              <div v-for="f in col.fields" :key="col.key + '-' + f.key" class="column-setting-subrow">
                <span class="col-check" />
                <span class="col-num" />
                <span class="col-name col-name--sub">{{ f.label }}</span>
                <span class="col-vis">
                  <ElSwitch
                    :model-value="f.visible"
                    size="small"
                    @update:model-value="(v) => api.onFieldVisibleChange(col, f.key, !!v)"
                  />
                </span>
                <span class="col-fix" />
              </div>
            </template>
          </template>
        </div>
        <div class="column-setting-footer">
          <ElButton type="primary" @click="api.openSaveColumnTemplate">另存为</ElButton>
          <ElButton type="primary" @click="api.saveCurrentColumnTemplate">保存</ElButton>
        </div>
      </div>
    </ElPopover>

    <ElDialog v-model="api.saveTemplateVisible" title="另存为列设置模版" width="400px">
      <ElInput v-model="api.saveTemplateName" placeholder="输入模版名称" clearable @keydown.enter="api.saveColumnTemplate" />
      <template #footer>
        <ElButton @click="api.saveTemplateVisible = false">取消</ElButton>
        <ElButton type="primary" @click="api.saveColumnTemplate">保存</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<style scoped>
.table-column-setting-wrap {
  display: inline-flex;
  align-items: center;
}

.column-setting-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--el-text-color-regular);
  padding: 4px;
  border-radius: 4px;
}

.column-setting-icon:hover {
  color: var(--el-color-primary);
  background: var(--el-fill-color-light);
}

.column-setting-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: min(70vh, 520px);
}

.column-setting-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.column-setting-search {
  width: 100%;
}

.column-setting-tpl {
  display: flex;
  align-items: center;
  gap: 8px;
}

.column-setting-select {
  flex: 1;
  min-width: 0;
}

.column-setting-batch {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.column-setting-batch-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--el-text-color-regular);
  padding: 4px;
  border-radius: 4px;
}

.column-setting-batch-icon:hover {
  color: var(--el-color-primary);
  background: var(--el-fill-color-light);
}

.column-fix-seg {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.column-fix-seg__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  color: var(--el-text-color-secondary);
}

.column-fix-seg__btn:hover {
  color: var(--el-color-primary);
  background: var(--el-fill-color-light);
}

.column-fix-seg__btn.is-active {
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.column-setting-subrow {
  display: flex;
  align-items: center;
  min-height: 32px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  padding-left: 8px;
}

.column-name--sub {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.column-setting-list {
  overflow: auto;
  flex: 1;
  min-height: 0;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
}

.column-setting-list-header {
  display: flex;
  align-items: center;
  min-height: 32px;
  padding: 0 8px;
  background: var(--el-fill-color-light);
  font-size: 12px;
  color: var(--el-text-color-secondary);
  position: sticky;
  top: 0;
  z-index: 1;
}

.column-setting-row {
  display: flex;
  align-items: center;
  min-height: 36px;
  padding: 0 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.column-setting-row:last-child {
  border-bottom: none;
}

.column-setting-list-header .col-check,
.column-setting-row .col-check {
  width: 36px;
  flex-shrink: 0;
}

.column-setting-list-header .col-num,
.column-setting-row .col-num {
  width: 40px;
  flex-shrink: 0;
}

.column-setting-list-header .col-name,
.column-setting-row .col-name {
  flex: 1;
  min-width: 0;
}

.column-setting-list-header .col-vis,
.column-setting-row .col-vis {
  width: 80px;
  flex-shrink: 0;
}

.column-setting-list-header .col-fix,
.column-setting-row .col-fix {
  width: 132px;
  flex-shrink: 0;
}

.column-setting-subrow .col-check {
  width: 36px;
  flex-shrink: 0;
}

.column-setting-subrow .col-num {
  width: 40px;
  flex-shrink: 0;
}

.column-setting-subrow .col-name {
  flex: 1;
  min-width: 0;
}

.column-setting-subrow .col-vis {
  width: 80px;
  flex-shrink: 0;
}

.column-setting-subrow .col-fix {
  width: 132px;
  flex-shrink: 0;
}

.column-setting-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
  padding-top: 4px;
}
</style>
