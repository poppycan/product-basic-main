<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { ArrowDown, Check, Grid, Search, User, SwitchButton } from '@element-plus/icons-vue';
import { APP_BRAND, SUPPORTED_LANGUAGES } from '@/config/app';
import { QUICK_LINKS } from '@/config/menu';
import { PRIMARY_COLORS, THEME_MODES, type PrimaryColorKey, type ThemeMode } from '@/config/theme';
import { useAppStore } from '@/stores/app';
import type { LocaleText, RoleDefinition } from '@/config/roles';
import type { SubsystemDefinition } from '@/config/subsystems';
import logo from '@/assets/vue.svg';

interface SearchResult {
  type: 'navigate' | 'search' | 'download';
  title: string;
  description?: string;
  path?: string;
  query?: string;
}

const router = useRouter();
const route = useRoute();
const { t, locale } = useI18n();

const appStore = useAppStore();
const {
  themeMode,
  primaryColor,
  customPrimaryHex,
  language,
  roleId,
  subsystemId,
  currentRole,
  currentSubsystem,
  availableSubsystems,
} = storeToRefs(appStore);
const { setThemeMode, setPrimaryColor, setCustomPrimaryColor, setLanguage, setSubsystem } =
  appStore;

const quickLinks = QUICK_LINKS;

const navRef = ref<HTMLElement | null>(null);
const showSubsystems = ref(false);
const showRoleSelector = ref(false);
const showLanguagePanel = ref(false);
const showAboutPanel = ref(false);
const showThemePanel = ref(false);
const showUserPanel = ref(false);
const showSearchResults = ref(false);

const searchQuery = ref('');
const searchResults = ref<SearchResult[]>([]);

const currentLang = computed(() => language.value);
const brandName = computed(
  () => APP_BRAND.name[currentLang.value] ?? APP_BRAND.name.zh,
);
const subsystemQuickLinks = computed(() => currentSubsystem.value?.topNavLinks ?? []);
const hasCustomPrimary = computed(() => primaryColor.value === 'custom');
const isDataLike = computed(() => isDataQuery(searchQuery.value));
const currentUser = computed(() =>
  currentLang.value === 'zh' ? '演示账号' : 'Demo User',
);

watch(
  language,
  (lang) => {
    locale.value = lang;
  },
  { immediate: true },
);

function translateLocale(text: LocaleText | { zh: string; en: string } | undefined) {
  if (!text) {
    return '';
  }
  return text[currentLang.value] ?? text.zh ?? '';
}

function formatRoleName(role: RoleDefinition | null) {
  return role ? translateLocale(role.name) : '';
}


function closeOverlays() {
  showSubsystems.value = false;
  showRoleSelector.value = false;
  showLanguagePanel.value = false;
  showAboutPanel.value = false;
  showThemePanel.value = false;
  showUserPanel.value = false;
  showSearchResults.value = false;
}

function togglePanel(flag: Ref<boolean>) {
  const next = !flag.value;
  closeOverlays();
  flag.value = next;
}

function toggleSubsystemPanel() {
  togglePanel(showSubsystems);
}


function toggleLanguagePanel() {
  togglePanel(showLanguagePanel);
}

function toggleAboutPanel() {
  togglePanel(showAboutPanel);
}

function toggleThemePanel() {
  togglePanel(showThemePanel);
}

function toggleUserPanel() {
  togglePanel(showUserPanel);
}

function navigateHome() {
  closeOverlays();
  const target = currentSubsystem.value?.defaultPath ?? '/';
  void router.push(target);
}

function selectSubsystem(subsystem: SubsystemDefinition) {
  setSubsystem(subsystem.id);
  closeOverlays();
  if (subsystem.defaultPath) {
    void router.push(subsystem.defaultPath);
  }
}



function changeLanguage(code: string) {
  setLanguage(code as 'zh' | 'en');
  closeOverlays();
}

function handleLogout() {
  closeOverlays();
  void router.push('/login');
}

function handleSystemInfo() {
  closeOverlays();
  console.log('System info');
}

function handleComponentList() {
  closeOverlays();
  console.log('Component list');
}

function changeMode(mode: ThemeMode) {
  setThemeMode(mode);
}

function changePrimaryColorOption(key: PrimaryColorKey) {
  setPrimaryColor(key);
}

function handleCustomColorChange(event: Event) {
  const target = event.target as HTMLInputElement | null;
  if (target?.value) {
    setCustomPrimaryColor(target.value);
  }
}



function isDataQuery(raw: string) {
  const value = raw.trim();
  if (!value) {
    return false;
  }
  const ipv4 = /^(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
  return ipv4.test(value) || /:\d+$/.test(value) || /session/i.test(value);
}

function updateSearchResults() {
  const keyword = searchQuery.value.trim();
  if (!keyword) {
    searchResults.value = [];
    showSearchResults.value = false;
    return;
  }

  const lower = keyword.toLowerCase();
  const results: SearchResult[] = [];

  if (isDataQuery(keyword)) {
    results.push({
      type: 'search',
      title: currentLang.value === 'zh' ? `检索数据：“${keyword}”` : `Search data: "${keyword}"`,
      description:
        currentLang.value === 'zh'
          ? '跳转至分析配置并携带查询条件。'
          : 'Run the query in the analysis workspace.',
      query: keyword,
    });
    results.push({
      type: 'download',
      title:
        currentLang.value === 'zh'
          ? `下载数据包：“${keyword}”`
          : `Download packets: "${keyword}"`,
      description:
        currentLang.value === 'zh'
          ? '前往报表中心查看或导出匹配数据。'
          : 'Open the reports area to review or export matches.',
      query: keyword,
    });
  } else {
    results.push({
      type: 'search',
      title:
        currentLang.value === 'zh'
          ? `在数据中检索：“${keyword}”`
          : `Search data: "${keyword}"`,
      description:
        currentLang.value === 'zh'
          ? '在分析模块中查找相关流量。'
          : 'Inspect the analysis workspace for related traffic.',
      query: keyword,
    });
  }

  availableSubsystems.value.forEach((subsystem) => {
    const title = translateLocale(subsystem.title);
    if (title.toLowerCase().includes(lower)) {
      results.push({
        type: 'navigate',
        title: currentLang.value === 'zh' ? `进入：${title}` : `Open: ${title}`,
        description: translateLocale(subsystem.description),
        path: subsystem.defaultPath,
      });
    }

    subsystem.topNavLinks?.forEach((link) => {
      const linkTitle = translateLocale(link.title);
      if (linkTitle.toLowerCase().includes(lower)) {
        results.push({
          type: 'navigate',
          title: currentLang.value === 'zh' ? `快速访问：${linkTitle}` : `Quick link: ${linkTitle}`,
          description: translateLocale(link.description),
          path: link.path,
        });
      }
    });
  });

  quickLinks.forEach((link) => {
    const label = translateLocale(link.title);
    if (label.toLowerCase().includes(lower)) {
      results.push({
        type: 'navigate',
        title: currentLang.value === 'zh' ? `前往：${label}` : `Go to: ${label}`,
        path: link.path,
      });
    }
  });

  searchResults.value = results;
  showSearchResults.value = results.length > 0;
}

function handleSearchFocus() {
  if (searchQuery.value.trim()) {
    updateSearchResults();
    showSearchResults.value = searchResults.value.length > 0;
  }
}

function handleSearchEnter() {
  const keyword = searchQuery.value.trim();
  if (!keyword) {
    showSearchResults.value = false;
    return;
  }

  if (searchResults.value.length === 1) {
    const result = searchResults.value[0];
    if (result) {
      performResult(result);
    }
    return;
  }

  if (isDataQuery(keyword)) {
    performSearchAction('search', keyword);
    return;
  }

  if (searchResults.value.length > 1) {
    showSearchResults.value = true;
    return;
  }

  performSearchAction('search', keyword);
}

function performSearchAction(action: 'search' | 'download', rawQuery: string | Ref<string>) {
  const value = typeof rawQuery === 'string' ? rawQuery : rawQuery.value;
  const trimmed = value.trim();
  if (!trimmed) {
    return;
  }
  closeOverlays();
  showSearchResults.value = false;
  searchQuery.value = '';
  if (action === 'search') {
    void router.push({ path: '/analysis', query: { q: trimmed } });
  } else {
    void router.push({ path: '/reports', query: { q: trimmed } });
  }
}

function performResult(item: SearchResult) {
  if (item.type === 'navigate' && item.path) {
    closeOverlays();
    showSearchResults.value = false;
    searchQuery.value = '';
    void router.push(item.path);
    return;
  }

  if (item.type === 'search') {
    performSearchAction('search', item.query ?? searchQuery.value);
    return;
  }

  if (item.type === 'download') {
    performSearchAction('download', item.query ?? searchQuery.value);
  }
}

function handleResultClick(item: SearchResult) {
  performResult(item);
}

function handleDocumentClick(event: MouseEvent) {
  if (!navRef.value) {
    return;
  }
  const target = event.target as Node | null;
  if (target && navRef.value.contains(target)) {
    return;
  }
  closeOverlays();
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeOverlays();
  }
}

watch(searchQuery, () => {
  updateSearchResults();
});

watch([language, availableSubsystems, subsystemQuickLinks], () => {
  if (searchQuery.value.trim()) {
    updateSearchResults();
  }
});

watch(roleId, () => {
  showRoleSelector.value = false;
});

watch(subsystemId, () => {
  showSubsystems.value = false;
});

watch(
  () => route.fullPath,
  () => {
    closeOverlays();
  },
);

onMounted(() => {
  document.addEventListener('click', handleDocumentClick);
  window.addEventListener('keydown', handleEscape);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick);
  window.removeEventListener('keydown', handleEscape);
});
</script>

<template>
  <header ref="navRef" class="top-nav">
    <div class="top-nav__left">
      <button type="button" class="brand" :title="brandName" @click="navigateHome">
        <span class="brand__badge">
          <img :src="logo" :alt="brandName" />
        </span>
      </button>

      <div class="divider" aria-hidden="true"></div>

      <div class="subsystem" @click.stop>
        <button type="button" class="subsystem__trigger" @click="toggleSubsystemPanel">
          <span class="subsystem__icon-shell">
            <ElIcon class="subsystem__icon">
              <Grid />
            </ElIcon>
          </span>
          <span class="subsystem__title">
            {{
              currentSubsystem
                ? translateLocale(currentSubsystem.title)
                : currentLang === 'zh'
                  ? '选择子系统'
                  : 'Pick subsystem'
            }}
          </span>
          <ElIcon class="subsystem__caret">
            <ArrowDown />
          </ElIcon>
        </button>
      </div>

      <div class="global-search" @click.stop>
        <div class="global-search__shell">
          <ElIcon class="global-search__icon">
            <Search />
          </ElIcon>
          <input
            v-model="searchQuery"
            class="global-search__input"
            type="text"
            :placeholder="
              currentLang === 'zh'
                ? '输入 IP、会话或功能关键词'
                : 'Search IPs, sessions, or features'
            "
            @focus="handleSearchFocus"
            @keydown.enter.prevent="handleSearchEnter"
          />
          <div v-if="isDataLike" class="global-search__actions">
            <ElButton size="small" text @click="performSearchAction('search', searchQuery)">
              {{ currentLang === 'zh' ? '检索' : 'Search' }}
            </ElButton>
            <ElButton size="small" text @click="performSearchAction('download', searchQuery)">
              {{ currentLang === 'zh' ? '下载' : 'Download' }}
            </ElButton>
          </div>
        </div>
        <div v-if="showSearchResults" class="global-search__results">
          <div
            v-for="(item, index) in searchResults"
            :key="`${item.type}-${index}`"
            class="search-result"
            @click="handleResultClick(item)"
          >
            <div class="search-result__title">{{ item.title }}</div>
            <div v-if="item.description" class="search-result__description">
              {{ item.description }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="top-nav__right">

      <!-- 角色选择区域 -->
      <!-- <div class="role" @click.stop>
        角色选择按钮
        <ElButton size="small" plain @click="toggleRolePanel">
          {{ currentLang === 'zh' ? '角色' : 'Role' }}：
          {{
            currentRole
              ? formatRoleName(currentRole)
              : currentLang === 'zh'
                ? '未分配'
                : 'Unassigned'
          }}
        </ElButton>
        角色选择下拉菜单
        <div v-if="showRoleSelector" class="popover role-popover">
          <div class="role-popover__header">
            {{ currentLang === 'zh' ? '选择角色' : 'Select a role' }}
          </div>
          <div class="role-popover__hint">
            {{
              currentLang === 'zh'
                ? '切换角色将影响可见模块。'
                : 'Switching roles updates accessible modules.'
            }}
          </div>
          角色选项列表
          <button v-for="role in roles" :key="role.id" type="button" class="role-option"
            :class="{ 'role-option--active': roleId === role.id }" @click="selectRole(role)">
            <div class="role-option__body">
              <div class="role-option__name">{{ formatRoleName(role) }}</div>
              <div class="role-option__description">{{ formatRoleDescription(role) }}</div>
            </div>
            活跃角色的勾选标记
            <ElIcon v-if="roleId === role.id" class="role-option__check">
              <Check />
            </ElIcon>
          </button>
        </div>
      </div> -->

      <!-- 快速链接区域 -->
      <!-- <div class="quick-links" @click.stop>
        <span class="quick-links__label">{{ t('topNav.quickLinks') }}</span>
        全局快速链接组
        <div class="quick-links__group">
          <ElButton v-for="link in quickLinks" :key="link.id" size="small" text class="quick-links__btn"
            :class="{ 'quick-links__btn--active': isQuickLinkActive(link.path) }" @click="goToQuickLink(link.path)">
            {{ translateLocale(link.title) }}
          </ElButton>
        </div>
        子系统快速链接组（仅在有链接时显示）
        <div v-if="subsystemQuickLinks.length" class="quick-links__group quick-links__group--secondary">
          <ElButton v-for="link in subsystemQuickLinks" :key="link.id" size="small" text class="quick-links__btn"
            :class="{ 'quick-links__btn--active': isQuickLinkActive(link.path) }" @click="goToSubsystemLink(link)">
            {{ translateLocale(link.title) }}
          </ElButton>
        </div>
      </div> -->

      <div class="language" @click.stop>
        <ElButton size="small" plain @click="toggleLanguagePanel">
          {{ currentLang === 'zh' ? '中文' : 'English' }}
        </ElButton>
        <div v-if="showLanguagePanel" class="popover language-popover">
          <div class="language-popover__header">
            {{ currentLang === 'zh' ? '选择语言' : 'Select Language' }}
          </div>
          <button
            v-for="lang in SUPPORTED_LANGUAGES"
            :key="lang.code"
            type="button"
            class="language-option"
            :class="{ 'language-option--active': language === lang.code }"
            @click="changeLanguage(lang.code)"
          >
            <span class="language-option__label">{{ lang.label }}</span>
            <ElIcon v-if="language === lang.code" class="language-option__check">
              <Check />
            </ElIcon>
          </button>
        </div>
      </div>

      <div class="about" @click.stop>
        <ElButton size="small" plain @click="toggleAboutPanel">
          {{ currentLang === 'zh' ? '关于' : 'About' }}
        </ElButton>
        <div v-if="showAboutPanel" class="popover about-popover">
          <div class="about-popover__header">
            {{ currentLang === 'zh' ? '关于系统' : 'About System' }}
          </div>
          <button
            type="button"
            class="about-option"
            @click="handleSystemInfo"
          >
            <span class="about-option__label">
              {{ currentLang === 'zh' ? '系统信息' : 'System Info' }}
            </span>
          </button>
          <button
            type="button"
            class="about-option"
            @click="handleComponentList"
          >
            <span class="about-option__label">
              {{ currentLang === 'zh' ? '系统组件清单' : 'Component List' }}
            </span>
          </button>
        </div>
      </div>

      <div class="theme" @click.stop>
        <ElButton size="small" plain @click="toggleThemePanel">
          {{ t('topNav.theme') }}
        </ElButton>
        <div v-if="showThemePanel" class="popover theme-popover">
          <div class="theme-section">
            <div class="theme-section__label">{{ t('topNav.mode') }}</div>
            <div class="theme-section__modes">
              <button
                v-for="mode in THEME_MODES"
                :key="mode"
                type="button"
                class="mode-button"
                :class="{ 'mode-button--active': themeMode === mode }"
                @click="changeMode(mode)"
              >
                {{ t(`topNav.${mode}`) }}
              </button>
            </div>
          </div>
          <div class="theme-section">
            <div class="theme-section__label">{{ t('topNav.colors') }}</div>
            <div class="theme-section__colors">
              <button
                v-for="option in PRIMARY_COLORS"
                :key="option.key"
                type="button"
                class="color-chip"
                :class="{ 'color-chip--active': primaryColor === option.key }"
                :style="{ backgroundColor: option.hex }"
                @click="changePrimaryColorOption(option.key)"
              >
                <span class="color-chip__label">{{ translateLocale(option.label) }}</span>
              </button>
              <button
                v-if="hasCustomPrimary"
                type="button"
                class="color-chip color-chip--active color-chip--custom"
                :style="{ backgroundColor: customPrimaryHex }"
              >
                <span class="color-chip__label">
                  {{ currentLang === 'zh' ? '自定义' : 'Custom' }}
                </span>
              </button>
            </div>
            <label class="theme-section__custom">
              <span>{{ currentLang === 'zh' ? '自定义颜色' : 'Custom color' }}</span>
              <input
                class="theme-section__color-input"
                type="color"
                :value="customPrimaryHex"
                @input="handleCustomColorChange"
              />
            </label>
          </div>
        </div>
      </div>

      <div class="user" @click.stop>
        <ElButton size="small" plain @click="toggleUserPanel">
          <ElIcon style="margin-right: 6px;">
            <User />
          </ElIcon>
          {{ currentUser }}
        </ElButton>
        <div v-if="showUserPanel" class="popover user-popover">
          <div class="user-popover__header">
            <div class="user-popover__name">{{ currentUser }}</div>
            <div class="user-popover__role">
              {{ currentRole ? formatRoleName(currentRole) : (currentLang === 'zh' ? '未分配' : 'Unassigned') }}
            </div>
          </div>
          <div class="user-popover__divider"></div>
          <button
            type="button"
            class="user-option"
            @click="handleLogout"
          >
            <ElIcon class="user-option__icon">
              <SwitchButton />
            </ElIcon>
            <span class="user-option__label">
              {{ currentLang === 'zh' ? '退出登录' : 'Logout' }}
            </span>
          </button>
        </div>
      </div>
    </div>
  </header>
  <transition name="fade">
    <div v-if="showSubsystems" class="subsystem-layer">
      <div class="subsystem-layer__panel" @click.stop>
        <div v-if="availableSubsystems.length" class="subsystem-layer__grid">
          <button
            v-for="sub in availableSubsystems"
            :key="sub.id"
            type="button"
            class="subsystem-card"
            :class="{ 'subsystem-card--active': subsystemId === sub.id }"
            @click="selectSubsystem(sub)"
          >
            <span class="subsystem-card__icon" :class="{ 'subsystem-card__icon--image': sub.iconSrc }">
              <img v-if="sub.iconSrc" :src="sub.iconSrc" :alt="translateLocale(sub.title)" loading="lazy" />
              <ElIcon v-else-if="sub.icon">
                <component :is="sub.icon" />
              </ElIcon>
            </span>
            <span class="subsystem-card__body">
              <span class="subsystem-card__title">{{ translateLocale(sub.title) }}</span>
              <span class="subsystem-card__description">
                {{ translateLocale(sub.description) }}
              </span>
            </span>
            <ElIcon v-if="subsystemId === sub.id" class="subsystem-card__check">
              <Check />
            </ElIcon>
          </button>
        </div>
        <div v-else class="subsystem-layer__empty">
          {{ currentLang === 'zh' ? '当前角色没有可访问的子系统' : 'No subsystems available for this role.' }}
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>

.top-nav {
  position: sticky;
  top: 0;
  z-index: 120;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  height: 60px;
  padding: 0 24px 0 0;
  background-image: linear-gradient(92deg, rgba(6, 22, 39, 0.96) 0%, rgba(8, 33, 54, 0.94) 100%);
  color: var(--color-top-nav-text, #f5f8ff);
}

.top-nav__left,
.top-nav__right {
  display: flex;
  align-items: center;
  gap: 18px;
}

.brand {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  width: 76px;
}

.brand__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 14px;
  background: radial-gradient(circle at 28% 28%, rgba(255, 255, 255, 0.26), rgba(255, 255, 255, 0) 68%);
  border: 1px solid rgba(132, 192, 255, 0.28);
}

.brand__badge img {
  width: 24px;
  height: 24px;
}

.divider {
  position: absolute;
  left: 76px;
  top: 0;
  width: 1px;
  height: 100%;
  background: rgba(255, 255, 255, 0.08);
}

.subsystem__trigger {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition: color 0.2s ease;
}

.subsystem__trigger:hover,
.subsystem__trigger:focus-visible {
  color: #ffffff;
}

.subsystem__icon-shell {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
}

.subsystem__icon {
  width: 20px;
  height: 20px;
  font-size: 20px;
  line-height: 1;
}

.subsystem__icon :deep(svg) {
  width: 24px;
  height: 24px;
}

.subsystem__title {
  font-size: 15px;
  font-weight: 600;
  color: #f7fbff;
  white-space: nowrap;
}

.subsystem__caret {
  margin-left: 8px;
  font-size: 14px;
  color: rgba(247, 252, 255, 0.6);
}

.global-search {
  position: relative;
  min-width: 300px;
  max-width: 460px;
}

.global-search__shell {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 18px;
  border-radius: 14px;
  background: rgba(11, 27, 45, 0.82);
  border: 1px solid rgba(102, 162, 230, 0.3);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
}

.global-search__icon {
  color: rgba(214, 231, 255, 0.72);
}

.global-search__input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: 14px;
  color: #f3f7ff;
}

.global-search__input::placeholder {
  color: rgba(202, 222, 248, 0.55);
}

.global-search__actions {
  display: flex;
  gap: 6px;
  margin-left: 4px;
}

.global-search__results {
  position: absolute;
  left: 0;
  top: calc(100% + 12px);
  width: 100%;
  background: rgba(10, 31, 52, 0.95);
  border-radius: 16px;
  border: 1px solid rgba(88, 158, 215, 0.28);
  padding: 10px 0;
  max-height: 340px;
  overflow: auto;
  backdrop-filter: blur(14px);
  z-index: 160;
}

.search-result {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 18px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.search-result:hover {
  background: rgba(70, 130, 203, 0.14);
}

.search-result__title {
  font-size: 14px;
  font-weight: 500;
}

.search-result__description {
  font-size: 12px;
  color: rgba(224, 236, 255, 0.64);
}

.role,
.quick-links,
.language,
.theme {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
}

.quick-links__label,
.language__label {
  font-size: 12px;
  color: rgba(232, 242, 255, 0.65);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.quick-links__group,
.language__group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.quick-links__group--secondary {
  padding-left: 12px;
  border-left: 1px solid rgba(121, 171, 230, 0.22);
}

:deep(.quick-links__btn) {
  padding: 8px 18px;
  color: rgba(236, 244, 255, 0.82);
  border-color: transparent;
  transition: all 0.2s ease;
}

:deep(.quick-links__btn:hover),
:deep(.quick-links__btn:focus-visible) {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

:deep(.quick-links__btn--active),
:deep(.quick-links__btn--active:hover),
:deep(.quick-links__btn--active:focus-visible) {
  background: #ffffff;
  color: #14263b;
}

.popover {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  min-width: 320px;
  padding: 18px 20px;
  border-radius: 18px;
  border: 1px solid rgba(92, 155, 219, 0.25);
  background: rgba(9, 28, 47, 0.95);
  color: #f3f7ff;
  backdrop-filter: blur(16px);
  z-index: 170;
}

.role-popover__header {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 6px;
}

.role-popover__hint {
  font-size: 12px;
  color: rgba(224, 236, 255, 0.6);
  margin-bottom: 14px;
}

.role-option {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 14px;
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  color: inherit;
  text-align: left;
  transition: all 0.2s ease;
}

.role-option:hover {
  background: rgba(75, 135, 205, 0.12);
  border-color: rgba(92, 155, 219, 0.3);
}

.role-option--active {
  background: rgba(var(--primary-color-rgb, 0, 171, 121), 0.22);
  border-color: rgba(var(--primary-color-rgb, 0, 171, 121), 0.45);
}

.role-option__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.role-option__name {
  font-size: 14px;
  font-weight: 500;
}

.role-option__description {
  font-size: 12px;
  color: rgba(224, 236, 255, 0.6);
}

.role-option__check {
  color: var(--primary-color, #00ab79);
}

.theme-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.theme-section + .theme-section {
  margin-top: 18px;
}

.theme-section__label {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 12px;
  color: rgba(215, 231, 255, 0.65);
}

.theme-section__modes,
.theme-section__colors {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.mode-button {
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid rgba(96, 160, 226, 0.28);
  background: rgba(6, 25, 43, 0.6);
  color: inherit;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s ease;
}

.mode-button--active {
  border-color: rgba(var(--primary-color-rgb, 0, 171, 121), 0.6);
  background: rgba(var(--primary-color-rgb, 0, 171, 121), 0.25);
}

.color-chip {
  position: relative;
  min-width: 60px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid transparent;
  cursor: pointer;
  color: #fff;
  font-size: 12px;
  letter-spacing: 0.02em;
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.color-chip--active {
  transform: translateY(-3px);
  border-color: rgba(255, 255, 255, 0.35);
}

.color-chip--custom {
  border-color: rgba(255, 255, 255, 0.32);
}

.color-chip__label {
  font-weight: 500;
}

.theme-section__custom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: rgba(221, 235, 255, 0.65);
  font-size: 12px;
}

.theme-section__color-input {
  width: 48px;
  height: 26px;
  border: 1px solid rgba(117, 180, 245, 0.25);
  border-radius: 6px;
  background: rgba(6, 25, 43, 0.9);
  cursor: pointer;
}

.subsystem-layer {
  position: absolute;
  top: 60px;
  left: 0;
  right: 0;
  width: 100%;
  display: flex;
  justify-content: center;
  pointer-events: none;
  z-index: 115;
}

.subsystem-layer__panel {
  pointer-events: auto;
  width: 100%;
  margin: 0;
  padding: 28px 40px;
  border-radius: 0 0 20px 20px;
  border: 1px solid rgba(88, 150, 220, 0.28);
  border-top: none;
  background: linear-gradient(135deg, rgba(10, 33, 58, 0.96) 0%, rgba(5, 24, 44, 0.92) 100%);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.subsystem-layer__grid {
  display: grid;
  gap: 18px;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.subsystem-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px 24px;
  border-radius: 18px;
  border: 1px solid rgba(114, 176, 244, 0.18);
  background: rgba(18, 46, 82, 0.85);
  color: #f3f7ff;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}

.subsystem-card:hover {
  transform: translateY(-4px);
  border-color: rgba(160, 218, 255, 0.6);
  background: rgba(26, 64, 108, 0.92);
}

.subsystem-card--active {
  border-color: rgba(var(--primary-color-rgb, 0, 171, 121), 0.65);
  background: linear-gradient(135deg, rgba(var(--primary-color-rgb, 0, 171, 121), 0.35) 0%, rgba(16, 48, 84, 0.38) 100%);
}

.subsystem-card__icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
}

.subsystem-card__icon--image img {
  width: 56px;
  height: 56px;
  object-fit: contain;
}

.subsystem-card__icon :deep(svg) {
  width: 40px;
  height: 40px;
}

.subsystem-card__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: left;
}

.subsystem-card__title {
  font-size: 18px;
  font-weight: 600;
  color: #f7fbff;
}

.subsystem-card__description {
  font-size: 13px;
  color: rgba(214, 231, 255, 0.82);
  line-height: 1.6;
}

.subsystem-card__check {
  position: absolute;
  right: 20px;
  top: 20px;
  color: rgba(255, 255, 255, 0.8);
}

.subsystem-layer__empty {
  text-align: center;
  font-size: 14px;
  color: rgba(213, 230, 255, 0.7);
  padding: 40px 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

:deep(.el-button) {
  border-radius: 999px;
  font-weight: 500;
}

:deep(.el-button.is-text:not(.quick-links__btn)) {
  color: rgba(236, 244, 255, 0.78);
  border-color: transparent;
}

:deep(.el-button.is-text:not(.quick-links__btn):hover),
:deep(.el-button.is-text:not(.quick-links__btn):focus-visible) {
  background: rgba(255, 255, 255, 0.14);
  color: #ffffff;
}

:deep(.el-button.is-plain) {
  background: rgba(7, 27, 46, 0.72);
  border-color: rgba(102, 164, 232, 0.28);
  color: rgba(238, 245, 255, 0.85);
}

:deep(.el-button.is-plain:hover),
:deep(.el-button.is-plain:focus-visible) {
  background: rgba(7, 32, 54, 0.92);
  border-color: rgba(128, 186, 244, 0.48);
  color: #ffffff;
}

:deep(.el-button.is-plain.el-button--primary) {
  background: rgba(var(--primary-color-rgb, 0, 171, 121), 0.28);
  border-color: rgba(var(--primary-color-rgb, 0, 171, 121), 0.55);
  color: #ffffff;
}

:deep(.el-button.is-plain.el-button--primary:hover),
:deep(.el-button.is-plain.el-button--primary:focus-visible) {
  background: rgba(var(--primary-color-rgb, 0, 171, 121), 0.45);
}

.language-popover,
.about-popover,
.user-popover {
  min-width: 200px;
}

.language-popover__header,
.about-popover__header {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #f6faff;
}

.language-option,
.about-option,
.user-option {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  color: inherit;
  text-align: left;
  transition: all 0.2s ease;
}

.language-option:hover,
.about-option:hover,
.user-option:hover {
  background: rgba(75, 135, 205, 0.12);
  border-color: rgba(92, 155, 219, 0.3);
}

.language-option--active {
  background: rgba(var(--primary-color-rgb, 0, 171, 121), 0.22);
  border-color: rgba(var(--primary-color-rgb, 0, 171, 121), 0.45);
}

.language-option__label,
.about-option__label,
.user-option__label {
  font-size: 13px;
}

.language-option__check {
  color: var(--primary-color, #00ab79);
}

.user-popover__header {
  padding: 0 0 12px 0;
}

.user-popover__name {
  font-size: 15px;
  font-weight: 600;
  color: #f6faff;
  margin-bottom: 4px;
}

.user-popover__role {
  font-size: 12px;
  color: rgba(224, 236, 255, 0.6);
}

.user-popover__divider {
  height: 1px;
  background: rgba(121, 171, 230, 0.22);
  margin: 0 0 8px 0;
}

.user-option__icon {
  margin-right: 8px;
  font-size: 16px;
}

@media (max-width: 1200px) {
  .top-nav {
    padding: 0 24px;
    gap: 20px;
  }

  .global-search {
    min-width: 300px;
  }
}

@media (max-width: 960px) {
  .top-nav {
    flex-wrap: wrap;
    height: auto;
    padding: 18px;
  }

  .top-nav__left,
  .top-nav__right {
    width: 100%;
    gap: 18px;
    flex-wrap: wrap;
  }

  .global-search {
    min-width: 0;
    width: 100%;
  }

  .divider {
    display: none;
  }
}
</style>
