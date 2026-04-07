<script setup lang="ts">
/**
 * 只读触发 + 弹层表格单选 + 确定回显（名称类字段）
 * - 弹层内支持名称搜索（默认对行内所有字段模糊匹配）
 * - 选中行高亮（与地址对象弹窗一致）
 * - hover 选择框右侧显示清除，点击清除；clearToAny 时清除为 any
 */
import { computed, ref, watch } from 'vue';
import { CircleClose } from '@element-plus/icons-vue';
import { ElButton, ElDialog, ElIcon, ElInput, ElTable, ElTableColumn } from 'element-plus';

const props = withDefaults(
  defineProps<{
    modelValue: string;
    rows: Record<string, string>[];
    rowKey: string;
    displayKey: string;
    /** 双列展示：名称（副列）如设备 name（ip） */
    compositeKeys?: { primary: string; secondary: string };
    columns: { prop: string; label: string; minWidth?: number | string }[];
    placeholder?: string;
    disabled?: boolean;
    dialogTitle?: string;
    /** 指定参与搜索的字段；不传则对行内所有 key 搜索 */
    searchKeys?: string[];
    /** 为 true 时：空值展示为 any，清除时 emit('any') */
    clearToAny?: boolean;
    /** 清除后的回显值，默认 any */
    clearFallback?: string;
  }>(),
  {
    placeholder: '点击选择',
    dialogTitle: '请选择',
    clearFallback: 'any',
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void;
}>();

const dialogVisible = ref(false);
const pendingKey = ref('');
const searchKeyword = ref('');
const hover = ref(false);

const effectiveSearchKeys = computed(() => {
  if (props.searchKeys?.length) return props.searchKeys;
  const r = props.rows[0];
  return r ? Object.keys(r) : [];
});

const displayText = computed(() => {
  const v = props.modelValue?.trim() ?? '';
  const key = props.clearToAny && !v ? props.clearFallback : props.modelValue;
  const row = props.rows.find((r) => r[props.rowKey] === key);
  if (row) {
    if (props.compositeKeys) {
      return `${row[props.compositeKeys.primary]}（${row[props.compositeKeys.secondary]}）`;
    }
    return row[props.displayKey] ?? props.modelValue;
  }
  if (props.clearToAny && !v) return props.clearFallback;
  return props.modelValue;
});

const filteredRows = computed(() => {
  let list = props.rows;
  const kw = searchKeyword.value.trim().toLowerCase();
  if (kw && effectiveSearchKeys.value.length) {
    list = list.filter((r) =>
      effectiveSearchKeys.value.some((k) => String(r[k] ?? '').toLowerCase().includes(kw)),
    );
  }
  return list;
});

const showClearIcon = computed(() => {
  if (props.disabled) return false;
  if (props.clearToAny) {
    return props.modelValue?.trim() !== '' && props.modelValue !== props.clearFallback;
  }
  return !!props.modelValue?.trim();
});

function openDialog() {
  if (props.disabled) return;
  const v = props.modelValue?.trim() ?? '';
  if (props.clearToAny && !v) {
    pendingKey.value = props.clearFallback;
  } else {
    pendingKey.value = props.modelValue || '';
  }
  searchKeyword.value = '';
  dialogVisible.value = true;
}

function onRowClick(row: Record<string, string>) {
  pendingKey.value = row[props.rowKey] ?? '';
}

function rowClassName({ row }: { row: Record<string, string> }) {
  return row[props.rowKey] === pendingKey.value ? 'nat-picker-row--active' : '';
}

function confirm() {
  emit('update:modelValue', pendingKey.value);
  dialogVisible.value = false;
}

function clearSelection() {
  emit('update:modelValue', props.clearToAny ? props.clearFallback : '');
}

watch(dialogVisible, (v) => {
  if (!v) searchKeyword.value = '';
});
</script>

<template>
  <div
    class="nat-table-picker-field"
    @mouseenter="hover = true"
    @mouseleave="hover = false"
  >
    <div class="nat-table-picker-field__control">
      <ElInput
        readonly
        :model-value="displayText"
        :placeholder="placeholder"
        :disabled="disabled"
        class="nat-table-picker-field__input"
        @click="openDialog"
      >
        <template #suffix>
          <span class="nat-table-picker-field__suffix">
            <ElIcon
              v-if="hover && showClearIcon"
              class="nat-table-picker-field__clear"
              @click.stop="clearSelection"
            >
              <CircleClose />
            </ElIcon>
            <span class="nat-table-picker-field__chev" @click.stop="openDialog">▼</span>
          </span>
        </template>
      </ElInput>
    </div>
    <ElDialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="520px"
      append-to-body
      align-center
      destroy-on-close
      class="nat-table-picker-dialog"
    >
      <ElInput
        v-model="searchKeyword"
        clearable
        placeholder="按名称搜索"
        size="small"
        class="nat-table-picker-dialog__search"
      />
      <ElTable
        :data="filteredRows"
        border
        stripe
        size="small"
        max-height="320"
        highlight-current-row
        :row-class-name="rowClassName"
        @row-click="onRowClick"
      >
        <ElTableColumn
          v-for="c in columns"
          :key="c.prop"
          :prop="c.prop"
          :label="c.label"
          :min-width="c.minWidth ?? 120"
        />
      </ElTable>
      <template #footer>
        <ElButton size="small" @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" size="small" @click="confirm">确定</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<style scoped>
.nat-table-picker-field {
  width: 100%;
}

.nat-table-picker-field__control {
  width: 100%;
}

.nat-table-picker-field__input :deep(.el-input__wrapper) {
  cursor: pointer;
}

.nat-table-picker-field__suffix {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.nat-table-picker-field__clear {
  cursor: pointer;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.nat-table-picker-field__clear:hover {
  color: var(--el-color-danger);
}

.nat-table-picker-field__chev {
  font-size: 10px;
  color: var(--el-text-color-secondary);
  user-select: none;
  cursor: pointer;
}
</style>

<style>
.nat-table-picker-dialog__search {
  margin-bottom: 10px;
}

.nat-table-picker-dialog .el-table .nat-picker-row--active > td {
  background-color: var(--el-color-primary-light-9) !important;
}
</style>
