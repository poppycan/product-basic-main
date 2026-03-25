<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { MoreFilled } from '@element-plus/icons-vue';
import { SIDE_NAV_ITEMS, DEFAULT_VISIBLE_MENU_COUNT } from '@/config/menu';
import type { SideNavItem } from '@/config/menu';
import { useAppStore } from '@/stores/app';
import NavigationItem from '@/components/NavigationItem.vue';

const router = useRouter();
const route = useRoute();
const appStore = useAppStore();
const morePopoverVisible = ref(false);

const currentLanguage = computed(() => appStore.language);
const activeSubsystemId = computed(() => appStore.subsystemId);
const defaultSubsystemId = 'platform-center';
const menuItems = computed(() =>
  SIDE_NAV_ITEMS.filter((item) => {
    if (activeSubsystemId.value === defaultSubsystemId) {
      return true;
    }
    return item.subsystemIds?.includes(activeSubsystemId.value) ?? false;
  }),
);

/** 默认展示的菜单（策略台账到业务性能，共 8 项） */
const visibleMenuItems = computed(() => menuItems.value.slice(0, DEFAULT_VISIBLE_MENU_COUNT));
/** 第 9 位固定为「更多」，展开后显示的其余菜单 */
const moreMenuItems = computed(() => menuItems.value.slice(DEFAULT_VISIBLE_MENU_COUNT));

function isActive(path: string) {
  return route.path === path;
}

function resolveTitle(title: { zh: string; en: string }) {
  return currentLanguage.value === 'zh' ? title.zh : title.en;
}

function handleNavigate(path: string) {
  morePopoverVisible.value = false;
  if (route.path !== path) {
    void router.push(path);
  }
}

function handleMoreItemClick(item: SideNavItem) {
  handleNavigate(item.path);
}
</script>

<template>
  <aside class="side-nav">
    <nav class="side-nav__container">
      <NavigationItem
        v-for="item in visibleMenuItems"
        :key="item.id"
        :active="isActive(item.path)"
        :icon="item.icon"
        :icon-src="item.iconSrc"
        :label="resolveTitle(item.title)"
        @click="handleNavigate(item.path)"
      />
      <!-- 第 9 位固定为「更多」，样式与其它菜单项一致，点击在右侧展开其余项 -->
      <ElPopover
        v-model:visible="morePopoverVisible"
        placement="right-start"
        :width="160"
        trigger="click"
        popper-class="side-nav__more-popover"
      >
        <template #reference>
          <button
            type="button"
            class="nav-button nav-button--more"
            :class="{ 'nav-button--active': moreMenuItems.some((m) => isActive(m.path)) }"
            aria-label="更多菜单"
          >
            <ElIcon class="nav-button__icon"><MoreFilled /></ElIcon>
            <span class="nav-button__label">更多</span>
          </button>
        </template>
        <div class="side-nav__more-list">
          <button
            v-for="item in moreMenuItems"
            :key="item.id"
            type="button"
            class="side-nav__more-item"
            :class="{ 'side-nav__more-item--active': isActive(item.path) }"
            @click="handleMoreItemClick(item)"
          >
            {{ resolveTitle(item.title) }}
          </button>
          <p v-if="moreMenuItems.length === 0" class="side-nav__more-empty">暂无更多菜单</p>
        </div>
      </ElPopover>
    </nav>
  </aside>
</template>

<style scoped>
.side-nav {
  width: 76px;
  background-color: #051627;
  color: rgba(232, 242, 255, 0.82);
  padding: 10px 0 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  border-right: 1px solid rgba(96, 150, 212, 0.16);
  position: relative;
  z-index: 110;
  min-height: 0;
}

.side-nav__container {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  align-items: center;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

/* 100% 缩放下 9 个菜单项整体更紧凑，保证「更多」可见 */
.side-nav__container :deep(.nav-button) {
  padding: 8px 0 6px;
  gap: 6px;
}
.side-nav__container :deep(.nav-button__icon) {
  width: 28px;
  height: 28px;
}
.side-nav__container :deep(.nav-button__icon img),
.side-nav__container :deep(.nav-button__icon svg) {
  width: 24px;
  height: 24px;
}
.side-nav__container :deep(.nav-button__label) {
  font-size: 11px;
  line-height: 1.15;
}

.side-nav :deep(.nav-button--more),
.side-nav .nav-button--more {
  position: relative;
  border: none;
  background: transparent;
  color: rgba(220, 234, 255, 0.74);
  width: 72px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px 0 6px;
  border-radius: 20px;
  cursor: pointer;
  transition: transform 0.2s ease, background 0.2s ease, color 0.2s ease;
}
.side-nav .nav-button--more:hover {
  background: rgba(255, 255, 255, 0.07);
  transform: translateY(-2px);
  color: rgba(235, 244, 255, 0.88);
}
.side-nav .nav-button--more .nav-button__icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.side-nav .nav-button--more .nav-button__icon svg {
  width: 24px;
  height: 24px;
}
.side-nav .nav-button--more .nav-button__label {
  font-size: 11px;
  text-align: center;
  line-height: 1.15;
  padding: 0 8px;
}
.nav-button--more {
  flex-shrink: 0;
}

.side-nav__more-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.side-nav__more-item {
  display: block;
  width: 100%;
  padding: 8px 12px;
  text-align: left;
  border: none;
  background: transparent;
  color: var(--el-text-color-regular);
  font-size: 13px;
  cursor: pointer;
  border-radius: 6px;
  white-space: nowrap;
}

.side-nav__more-item:hover {
  background: var(--el-fill-color-light);
}

.side-nav__more-item--active {
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.side-nav__more-empty {
  margin: 0;
  padding: 8px 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

@media (max-width: 900px) {
  .side-nav {
    flex-direction: row;
    width: 100%;
    height: auto;
    padding: 12px 16px;
    overflow-x: auto;
    border-right: none;
    border-bottom: 1px solid rgba(96, 150, 212, 0.16);
  }

  .side-nav__container {
    flex-direction: row;
    width: max-content;
    gap: 14px;
  }
}
</style>

<style>
.side-nav__more-popover.el-popper {
  margin-left: 8px !important;
}
</style>
