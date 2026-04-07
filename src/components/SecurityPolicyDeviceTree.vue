<script setup lang="ts">
/**
 * 策略分析 / 安全策略页左侧设备树，复用「设备树.复选」实现。
 */
import DeviceTreeMulti from './设备树.复选.vue';
import type { DeviceGroup } from '@/types/security-policy';

const props = withDefaults(
  defineProps<{
    groups?: DeviceGroup[];
    title?: string;
  }>(),
  {}
);

const selectedIds = defineModel<string[]>('selectedIds', { default: () => [] });
</script>

<template>
  <DeviceTreeMulti
    v-model:selected-ids="selectedIds"
    :groups="props.groups"
    :title="props.title"
    v-bind="$attrs"
  />
</template>
