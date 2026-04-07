<script setup lang="ts">
import { computed } from 'vue';
import { ElTooltip } from 'element-plus';

const props = defineProps<{
  text?: string;
  /** 悬停展示全文，缺省为 text */
  tooltip?: string;
  /** 为 true 时不展示 tooltip（仍渲染内容） */
  disableTooltip?: boolean;
}>();

const tip = computed(() => {
  if (props.disableTooltip) return '';
  return props.tooltip ?? props.text ?? '';
});
</script>

<template>
  <div class="cell-field-row">
    <ElTooltip :content="tip" placement="top" :show-after="280" :disabled="!tip">
      <span class="cell-field-row__inner">
        <slot>{{ text }}</slot>
      </span>
    </ElTooltip>
  </div>
</template>
