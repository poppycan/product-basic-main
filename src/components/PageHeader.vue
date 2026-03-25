<template>
  <div class="ph-card" :class="[sizeClass, { 'ph-simple': isSimple }]"><!-- simple variant keeps single row -->
    <!-- simple layout: everything on one row -->
    <div v-if="isSimple" class="ph-row ph-row-simple">
      <div class="ph-simple-left">
        <button v-if="showBack" class="ph-back" @click="emit('back')" aria-label="back">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          <span class="ph-back-text">返回</span>
        </button>
        <div class="ph-simple-breadcrumb">
          <slot name="breadcrumb">
            <nav class="ph-bc-default" aria-label="breadcrumb">
              <a class="ph-bc-link" @click.prevent="emit('home')">首页</a>
              <span class="ph-bc-sep">/</span>
              <span class="ph-bc-current">{{ title || '当前页面' }}</span>
            </nav>
          </slot>
        </div>
        <div v-if="title || subtitle || tag" class="ph-simple-title-row">
          <span v-if="title" class="ph-simple-title" :title="title">{{ title }}</span>
          <span v-if="subtitle" class="ph-simple-sep">·</span>
          <span v-if="subtitle" class="ph-simple-subtitle" :title="subtitle">{{ subtitle }}</span>
          <span v-if="tag" class="ph-tag">{{ tag }}</span>
          <slot name="title-append" />
        </div>
      </div>
      <div class="ph-simple-right">
        <slot name="actions" />
        <slot name="extra" />
      </div>
    </div>

    <!-- breadcrumb row (default layout) -->
    <div v-else class="ph-row ph-row-breadcrumb">
      <div class="ph-breadcrumb">
        <slot name="breadcrumb">
          <nav class="ph-bc-default" aria-label="breadcrumb">
            <a class="ph-bc-link" @click.prevent="emit('home')">首页</a>
            <span class="ph-bc-sep">/</span>
            <span class="ph-bc-current">{{ title || '当前页面' }}</span>
          </nav>
        </slot>
      </div>
      <div class="ph-actions-top"><slot name="actions" /></div>
    </div>

    <!-- main header row: left(back+icon), center(title+subtitle), right(extra) -->
    <div v-if="!isSimple" class="ph-row ph-row-main">
      <div class="ph-left">
        <button v-if="showBack" class="ph-back" @click="emit('back')" aria-label="back">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          <span class="ph-back-text">返回</span>
        </button>

        <div class="ph-icon">
          <slot name="icon">
            <div v-if="showEmptyIcon" class="ph-empty-icon"></div>
          </slot>
        </div>
      </div>

      <div class="ph-center">
        <div class="ph-title-inline">
          <h1 class="ph-title" :title="title">{{ title }}</h1>
          <span v-if="subtitle" class="ph-sep">·</span>
          <div v-if="subtitle" class="ph-subtitle-inline" :title="subtitle">{{ subtitle }}</div>
          <span v-if="tag" class="ph-tag">{{ tag }}</span>
        </div>
      </div>

      <div class="ph-right">
        <slot name="extra" />
      </div>
    </div>

    <div v-if="!isSimple" class="ph-divider"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

defineSlots<{
  breadcrumb?: () => unknown;
  actions?: () => unknown;
  extra?: () => unknown;
  icon?: () => unknown;
  'title-append'?: () => unknown;
}>();

const props = defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  tag: { type: String, default: '' },
  showBack: { type: Boolean, default: false },
  showEmptyIcon: { type: Boolean, default: false },
  size: { type: String, default: 'medium' },
  variant: { type: String, default: 'default' },
});

const emit = defineEmits(['back', 'home']);
const sizeClass = computed(() => `ph-size-${props.size}`);
const isSimple = computed(() => props.variant === 'simple');
</script>

<style scoped>
.ph-card {
  --ph-text: var(--color-text, #1f2a37);
  --ph-muted: var(--color-text-secondary, #64748b);
  --ph-border: var(--color-border, rgba(148, 163, 184, 0.28));
  --ph-surface: var(--color-surface, #ffffff);
  --ph-primary: var(--primary-color, #00ab79);
  border: 1px solid var(--ph-border);
  border-radius: 8px;
  background: var(--ph-surface);
  color: var(--ph-text);
  overflow: hidden;
  margin-bottom: 10px;
}

.ph-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
}

.ph-row-breadcrumb {
  padding-top: 6px;
  padding-bottom: 4px;
}

.ph-row-simple {
  gap: 12px;
  padding: 0 16px;
  min-height: 44px;
}

.ph-simple-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.ph-simple-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.ph-simple-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--ph-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ph-simple-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.ph-simple-title-row > .ph-simple-title,
.ph-simple-title-row > .ph-simple-subtitle {
  flex: 0 1 auto;
  min-width: 0;
}

.ph-simple-subtitle {
  font-size: 13px;
  color: var(--ph-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ph-simple-sep {
  color: var(--ph-muted);
  font-size: 13px;
  flex-shrink: 0;
}

.ph-simple-breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.ph-card.ph-simple {
  padding: 0;
}

.ph-breadcrumb {
  color: var(--ph-muted);
  font-size: 13px;
}

.ph-bc-default {
  display: flex;
  gap: 6px;
  align-items: center;
}

.ph-bc-link {
  color: var(--ph-muted);
  cursor: pointer;
  text-decoration: none;
}

.ph-bc-link:hover {
  text-decoration: underline;
}

.ph-bc-sep {
  color: var(--ph-muted);
}

.ph-bc-current {
  color: var(--ph-text);
  font-weight: 500;
}

.ph-actions-top {
  display: flex;
  gap: 8px;
  align-items: center;
}

.ph-row-main {
  padding-top: 4px;
  padding-bottom: 4px;
}

.ph-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.ph-center {
  flex: 1;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  min-width: 0;
}

.ph-title-inline {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: flex-start;
  min-width: 0;
  max-width: 100%;
}

.ph-subtitle-inline {
  font-size: 13px;
  color: var(--ph-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ph-sep {
  color: var(--ph-muted);
  font-size: 14px;
}

.ph-back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: 0;
  color: var(--ph-muted);
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 6px;
}

.ph-back:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--ph-text);
}

.ph-back-text {
  font-size: 13px;
}

.ph-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ph-empty-icon {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  background: var(--ph-surface);
  border: 1px solid var(--ph-border);
}

.ph-title {
  font-size: 18px;
  margin: 0;
  font-weight: 600;
  color: var(--ph-text);
  line-height: 1;
}

.ph-subtitle {
  font-size: 13px;
  color: var(--ph-muted);
  margin-top: 4px;
}

.ph-tag {
  font-size: 12px;
  padding: 2px 8px;
  background: var(--ph-primary);
  color: #fff;
  border-radius: 4px;
}

.ph-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ph-divider {
  height: 1px;
  background: var(--ph-border);
  margin: 0;
}

/* size variants */
.ph-size-small .ph-title {
  font-size: 16px;
}

.ph-size-large .ph-title {
  font-size: 22px;
}

.ph-simple .ph-row {
  padding: 0 16px;
  min-height: 44px;
}

.ph-simple .ph-back {
  padding: 0 4px;
  min-height: 28px;
  font-size: 12px;
}

.ph-simple .ph-back-text {
  font-size: 12px;
}

.ph-simple .ph-simple-right :deep(.ui-btn) {
  --btn-height: 28px;
  --btn-padding-x: 10px;
  --btn-font-size: 12px;
}

.ph-simple .ph-simple-right :deep(.el-button) {
  height: 28px;
  padding: 0 10px;
  font-size: 12px;
}

.ph-simple .ph-tag {
  white-space: nowrap;
}

@media (max-width: 760px) {
  .ph-row {
    padding: 8px 10px;
  }

  .ph-row-simple {
    padding: 6px 10px;
  }

  .ph-icon {
    width: 28px;
    height: 28px;
  }
}
</style>
