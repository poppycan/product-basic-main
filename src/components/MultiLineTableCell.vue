<script setup lang="ts">
/**
 * 表格单元格「同列多字段」封装：基于 table-list.css 的 multi-field 规范。
 *
 * 用法一 — 配置 fields（推荐）：
 *   <MultiLineTableCell
 *     :fields="[
 *       { prefix: '域', value: row.zone },
 *       { value: row.ip },
 *     ]"
 *   />
 *   spare 默认 'auto'：若干行有值、若干行为空时视为 spare，允许在留白内折行。
 *
 * 用法二 — 默认插槽（自定义行，如富文本、特殊 tooltip）：
 *   <MultiLineTableCell :spare="false">
 *     <TableCellFieldRow :text="a" />
 *     <TableCellFieldRow :text="b" />
 *   </MultiLineTableCell>
 *
 * 子组件：TableCellFieldRow、MultiFieldCell 仍可按需单独引用。
 */
import { computed, useAttrs, useSlots } from 'vue';
import MultiFieldCell from './MultiFieldCell.vue';
import TableCellFieldRow from './TableCellFieldRow.vue';
import type { MultiLineField } from '@/types/multi-line-table-cell';

const props = withDefaults(
  defineProps<{
    fields?: MultiLineField[];
    /** auto：仅 fields 模式且至少 2 行时，按「是否有空行」计算 spare */
    spare?: boolean | 'auto';
    /** 为 true 时不渲染「整行文案」为空的字段行（spare 仍按全部 fields 计算） */
    hideEmptyRows?: boolean;
  }>(),
  {
    spare: 'auto',
    hideEmptyRows: true,
  },
);

defineOptions({ inheritAttrs: false });

const slots = useSlots();
const attrs = useAttrs();

function lineDisplay(f: MultiLineField): string {
  if (f.text !== undefined) return f.text;
  const v = f.value ?? '';
  if (f.prefix != null && f.prefix !== '') {
    if (!v.trim()) return '';
    return `${f.prefix}：${v}`;
  }
  return v;
}

const useFieldsMode = computed(() => props.fields != null && props.fields.length > 0);

const autoSpareFromFields = computed(() => {
  const list = props.fields;
  if (!list || list.length < 2) return false;
  const texts = list.map(lineDisplay);
  const filled = texts.filter((t) => t.trim()).length;
  return filled > 0 && filled < list.length;
});

const rootSpare = computed(() => {
  if (useFieldsMode.value) {
    if (props.spare === 'auto') return autoSpareFromFields.value;
    return props.spare as boolean;
  }
  if (props.spare === 'auto') return false;
  return props.spare as boolean;
});

const hasSlot = computed(() => !!slots.default);

const showRoot = computed(() => useFieldsMode.value || hasSlot.value);
</script>

<template>
  <MultiFieldCell
    v-if="showRoot"
    :spare="rootSpare"
    v-bind="attrs"
  >
    <template v-if="useFieldsMode">
      <template v-for="(f, i) in fields ?? []" :key="i">
        <TableCellFieldRow
          v-if="!hideEmptyRows || lineDisplay(f).trim()"
          :text="lineDisplay(f)"
          :tooltip="f.tooltip"
          :disable-tooltip="f.disableTooltip"
        />
      </template>
    </template>
    <slot v-else />
  </MultiFieldCell>
</template>
