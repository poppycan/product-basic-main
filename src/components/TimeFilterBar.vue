<script setup lang="ts">
/**
 * 时间过滤组件
 *
 * 日期时间范围选择 + 快捷项（今日/本周/上周/本月/最近一个月），
 * 用于列表按时间维度过滤；默认不选表示不按该时间条件过滤，仅用户选择范围后才生效。
 */
import { computed } from 'vue';
import { ElDatePicker, ElIcon } from 'element-plus';
import { Calendar } from '@element-plus/icons-vue';

defineOptions({ name: 'TimeFilterBar' });

const modelValue = defineModel<[Date, Date] | null>({ default: null });

const props = withDefaults(
  defineProps<{
    /** 左侧图标的无障碍说明与悬停提示（不展示文字标签） */
    ariaLabel?: string;
    /** 选择器区域宽度（px），与 datetimerange 两段「年月日 时分秒」展示匹配 */
    pickerWidth?: number;
  }>(),
  {
    ariaLabel: '时间过滤',
    pickerWidth: 400,
  },
);

const pickerWrapStyle = computed(() => ({
  width: `${props.pickerWidth}px`,
  maxWidth: `min(100%, ${props.pickerWidth}px)`,
}));

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

type TimeRangePreset = 'today' | 'week' | 'lastWeek' | 'month' | 'lastMonth';

function rangeForPreset(preset: TimeRangePreset): [Date, Date] {
  const now = new Date();
  if (preset === 'today') return [startOfDay(now), endOfDay(now)];
  if (preset === 'week') {
    const day = now.getDay() || 7;
    const monday = addDays(startOfDay(now), -(day - 1));
    return [monday, endOfDay(now)];
  }
  if (preset === 'lastWeek') {
    const day = now.getDay() || 7;
    const thisMonday = addDays(startOfDay(now), -(day - 1));
    const lastMonday = addDays(thisMonday, -7);
    return [lastMonday, endOfDay(addDays(lastMonday, 6))];
  }
  if (preset === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return [startOfDay(start), endOfDay(now)];
  }
  if (preset === 'lastMonth') {
    return [startOfDay(addDays(now, -30)), endOfDay(now)];
  }
  return [startOfDay(now), endOfDay(now)];
}

const dateShortcuts = [
  { text: '今日', value: () => rangeForPreset('today') },
  { text: '本周', value: () => rangeForPreset('week') },
  { text: '上周', value: () => rangeForPreset('lastWeek') },
  { text: '本月', value: () => rangeForPreset('month') },
  { text: '最近一个月', value: () => rangeForPreset('lastMonth') },
];

const defaultTime: [Date, Date] = [
  new Date(2000, 0, 1, 0, 0, 0),
  new Date(2000, 0, 1, 23, 59, 59),
];
</script>

<template>
  <div class="time-filter-bar">
    <span
      class="time-filter-bar__icon-wrap"
      role="img"
      :aria-label="ariaLabel"
      :title="ariaLabel"
    >
      <ElIcon :size="18"><Calendar /></ElIcon>
    </span>
    <div class="time-filter-bar__picker-wrap" :style="pickerWrapStyle">
      <ElDatePicker
        v-model="modelValue"
        type="datetimerange"
        clearable
        range-separator=" - "
        start-placeholder="开始时间"
        end-placeholder="结束时间"
        format="YYYY-MM-DD HH:mm:ss"
        :default-time="defaultTime"
        :shortcuts="dateShortcuts"
      />
    </div>
  </div>
</template>

<style scoped>
.time-filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
}

.time-filter-bar__icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
  line-height: 1;
}

.time-filter-bar__picker-wrap {
  flex: 0 0 auto;
  min-width: 0;
}

.time-filter-bar__picker-wrap :deep(.el-date-editor.el-date-editor--datetimerange) {
  width: 100% !important;
  max-width: 100%;
  box-sizing: border-box;
}
</style>
