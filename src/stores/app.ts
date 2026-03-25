import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { DEFAULT_PRIMARY_COLOR, DEFAULT_THEME_MODE, PRIMARY_COLORS } from '@/config/theme';
import type { PrimaryColorKey, ThemeMode } from '@/config/theme';
import { ROLES, DEFAULT_ROLE_ID, type RoleDefinition } from '@/config/roles';
import { SUBSYSTEMS, type SubsystemDefinition } from '@/config/subsystems';

type LanguageCode = 'zh' | 'en';
type PrimaryColorSelection = PrimaryColorKey | 'custom';
type RoleId = RoleDefinition['id'];
type SubsystemId = SubsystemDefinition['id'];

interface PersistedSettings {
  themeMode: ThemeMode;
  primaryColorKey: PrimaryColorSelection;
  customPrimaryHex?: string;
  language: LanguageCode;
}

const STORAGE_KEY = 'my-product-starter:app-settings';
const ROLE_STORAGE_KEY = 'my-product-starter:role-id';
const SUBSYSTEM_STORAGE_KEY = 'my-product-starter:subsystem-id';

const PRIMARY_COLOR_MAP = PRIMARY_COLORS.reduce<Record<PrimaryColorKey, string>>(
  (acc, item) => {
    acc[item.key] = item.hex.toUpperCase();
    return acc;
  },
  {
    green: '#00AB79',
    purple: '#6954F0',
    blue: '#325CD8',
  },
);

const DEFAULT_PRIMARY_HEX = PRIMARY_COLOR_MAP[DEFAULT_PRIMARY_COLOR];

function isPrimaryColorKey(value: unknown): value is PrimaryColorKey {
  return (
    typeof value === 'string' && Object.prototype.hasOwnProperty.call(PRIMARY_COLOR_MAP, value)
  );
}

function isRoleId(value: string): value is RoleId {
  return ROLES.some((role) => role.id === value);
}

function isSubsystemId(value: string): value is SubsystemId {
  return SUBSYSTEMS.some((subsystem) => subsystem.id === value);
}

function normalizeHex(value: string | undefined): string {
  const trimmed = (value ?? '').trim();
  if (/^#([0-9a-fA-F]{6})$/.test(trimmed)) {
    return `#${trimmed.slice(1).toUpperCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) {
    return `#${trimmed.toUpperCase()}`;
  }
  if (/^#([0-9a-fA-F]{3})$/.test(trimmed)) {
    return `#${trimmed
      .slice(1)
      .split('')
      .map((char) => char.repeat(2))
      .join('')
      .toUpperCase()}`;
  }
  if (/^[0-9a-fA-F]{3}$/.test(trimmed)) {
    return `#${trimmed
      .split('')
      .map((char) => char.repeat(2))
      .join('')
      .toUpperCase()}`;
  }
  return DEFAULT_PRIMARY_HEX;
}

function resolvePrimaryHex(key: PrimaryColorSelection, customHex?: string) {
  if (key === 'custom') {
    return normalizeHex(customHex);
  }
  return PRIMARY_COLOR_MAP[key];
}

function getValidRoleId(candidate: string | null): RoleId {
  if (candidate && isRoleId(candidate)) {
    return candidate;
  }
  return DEFAULT_ROLE_ID;
}

function getAccessibleSubsystemIds(roleId: RoleId): SubsystemId[] {
  const role = ROLES.find((item) => item.id === roleId);
  if (!role) {
    return [];
  }
  return role.subsystemIds.filter(isSubsystemId);
}

function determineDefaultSubsystemId(
  role: RoleDefinition | undefined,
  allowed: SubsystemId[],
): SubsystemId {
  if (
    role?.defaultSubsystemId &&
    isSubsystemId(role.defaultSubsystemId) &&
    allowed.includes(role.defaultSubsystemId)
  ) {
    return role.defaultSubsystemId;
  }
  const fallback = allowed[0];
  if (fallback) {
    return fallback;
  }
  const firstSubsystem = SUBSYSTEMS[0];
  if (firstSubsystem && isSubsystemId(firstSubsystem.id)) {
    return firstSubsystem.id;
  }
  return '';
}

function resolveInitialRole(): RoleId {
  if (typeof window === 'undefined') {
    return DEFAULT_ROLE_ID;
  }
  const stored = window.localStorage.getItem(ROLE_STORAGE_KEY);
  return getValidRoleId(stored);
}

function resolveInitialSubsystem(roleId: RoleId): SubsystemId {
  const allowed = getAccessibleSubsystemIds(roleId);
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(SUBSYSTEM_STORAGE_KEY);
    if (stored && allowed.includes(stored)) {
      return stored;
    }
  }
  const role = ROLES.find((item) => item.id === roleId);
  return determineDefaultSubsystemId(role, allowed);
}

function persistRole(id: RoleId) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ROLE_STORAGE_KEY, id);
}

function persistSubsystem(id: SubsystemId) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SUBSYSTEM_STORAGE_KEY, id);
}

function dispatchWindowEvent(name: string, detail: unknown) {
  if (typeof window === 'undefined' || typeof CustomEvent === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  } catch (eventError) {
    console.warn(`Failed to dispatch ${name} event`, eventError);
  }
}

function loadSettings(): PersistedSettings {
  const fallback: PersistedSettings = {
    themeMode: DEFAULT_THEME_MODE,
    primaryColorKey: DEFAULT_PRIMARY_COLOR,
    customPrimaryHex: DEFAULT_PRIMARY_HEX,
    language: 'zh',
  };

  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw) as Partial<PersistedSettings>;
    const storedKey = parsed.primaryColorKey;
    const isCustom = storedKey === 'custom';
    const presetKey: PrimaryColorKey = isPrimaryColorKey(storedKey)
      ? storedKey
      : DEFAULT_PRIMARY_COLOR;
    const primaryColorKey: PrimaryColorSelection = isCustom ? 'custom' : presetKey;

    return {
      themeMode: parsed.themeMode ?? DEFAULT_THEME_MODE,
      primaryColorKey,
      customPrimaryHex:
        primaryColorKey === 'custom'
          ? normalizeHex(parsed.customPrimaryHex ?? DEFAULT_PRIMARY_HEX)
          : PRIMARY_COLOR_MAP[presetKey],
      language: parsed.language ?? 'zh',
    };
  } catch (error) {
    console.warn('Failed to parse persisted settings', error);
    return fallback;
  }
}

function applyTheme(mode: ThemeMode, primaryHex: string) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', mode);
  root.style.setProperty('--primary-color', primaryHex);
  root.style.setProperty('--primary-color-rgb', hexToRgb(primaryHex));
  root.style.setProperty('--el-color-primary', primaryHex);
  root.style.setProperty('--el-color-primary-dark-2', shadeColor(primaryHex, 0.2));
  root.style.setProperty('--el-color-primary-light-3', tintColor(primaryHex, 0.3));
  root.style.setProperty('--el-color-primary-light-5', tintColor(primaryHex, 0.5));
  root.style.setProperty('--el-color-primary-light-7', tintColor(primaryHex, 0.7));
  root.style.setProperty('--el-color-primary-light-8', tintColor(primaryHex, 0.8));
  root.style.setProperty('--el-color-primary-light-9', tintColor(primaryHex, 0.9));
}

function applyLanguage(lang: LanguageCode) {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  html.setAttribute('lang', lang === 'zh' ? 'zh-CN' : 'en-US');
}

function hexToRgb(hex: string) {
  const sanitized = hex.replace('#', '');
  const bigint = Number.parseInt(sanitized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `${r}, ${g}, ${b}`;
}

function tintColor(hex: string, amount: number) {
  return mixColor(hex, '#ffffff', amount);
}

function shadeColor(hex: string, amount: number) {
  return mixColor(hex, '#000000', amount);
}

function mixColor(hex: string, mixHex: string, amount: number) {
  const [r1, g1, b1] = hexToRgbArray(hex);
  const [r2, g2, b2] = hexToRgbArray(mixHex);
  const r = Math.round(r1 * (1 - amount) + r2 * amount);
  const g = Math.round(g1 * (1 - amount) + g2 * amount);
  const b = Math.round(b1 * (1 - amount) + b2 * amount);
  return rgbToHex(r, g, b);
}

function hexToRgbArray(hex: string): [number, number, number] {
  const sanitized = hex.replace('#', '');
  const bigint = Number.parseInt(sanitized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r, g, b];
}

function rgbToHex(r: number, g: number, b: number) {
  const toHex = (value: number) => value.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export const useAppStore = defineStore('app', () => {
  const initial = loadSettings();

  const themeMode = ref<ThemeMode>(initial.themeMode);
  const primaryColor = ref<PrimaryColorSelection>(initial.primaryColorKey);
  const customPrimaryHex = ref<string>(
    primaryColor.value === 'custom'
      ? normalizeHex(initial.customPrimaryHex)
      : PRIMARY_COLOR_MAP[primaryColor.value],
  );
  const language = ref<LanguageCode>(initial.language);
  const initialRoleId = resolveInitialRole();
  const roleId = ref<RoleId>(initialRoleId);
  const subsystemId = ref<SubsystemId>(resolveInitialSubsystem(initialRoleId));
  const roles = ROLES;
  const subsystems = SUBSYSTEMS;
  const currentRole = computed(
    () => roles.find((role) => role.id === roleId.value) ?? roles[0] ?? null,
  );
  const availableSubsystems = computed<SubsystemDefinition[]>(() => {
    const role = currentRole.value;
    if (!role) {
      return [];
    }
    return subsystems.filter((subsystem) => role.subsystemIds.includes(subsystem.id));
  });
  const currentSubsystem = computed<SubsystemDefinition | null>(() => {
    if (!availableSubsystems.value.length) {
      return null;
    }
    const match = availableSubsystems.value.find((item) => item.id === subsystemId.value);
    return match ?? availableSubsystems.value[0] ?? null;
  });

  const primaryColorHex = computed(() =>
    resolvePrimaryHex(primaryColor.value, customPrimaryHex.value),
  );

  function persist() {
    if (typeof window === 'undefined') return;
    const payload: PersistedSettings = {
      themeMode: themeMode.value,
      primaryColorKey: primaryColor.value,
      customPrimaryHex: customPrimaryHex.value,
      language: language.value,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  function setThemeMode(mode: ThemeMode) {
    themeMode.value = mode;
  }

  function setPrimaryColor(key: PrimaryColorKey) {
    primaryColor.value = key;
    customPrimaryHex.value = PRIMARY_COLOR_MAP[key];
  }

  function setCustomPrimaryColor(hex: string) {
    primaryColor.value = 'custom';
    customPrimaryHex.value = normalizeHex(hex);
  }

  function setLanguage(lang: LanguageCode) {
    language.value = lang;
  }

  function setRole(id: RoleId) {
    if (!isRoleId(id)) {
      return;
    }
    roleId.value = id;
  }

  function setSubsystem(id: SubsystemId) {
    const allowed = getAccessibleSubsystemIds(roleId.value);
    if (!allowed.includes(id)) {
      return;
    }
    subsystemId.value = id;
  }

  watch(
    roleId,
    (id) => {
      persistRole(id);
      const allowed = getAccessibleSubsystemIds(id);
      if (!allowed.includes(subsystemId.value)) {
        subsystemId.value = determineDefaultSubsystemId(
          ROLES.find((item) => item.id === id),
          allowed,
        );
      }
      dispatchWindowEvent('role-changed', id);
    },
    { immediate: true },
  );

  watch(
    subsystemId,
    (id) => {
      persistSubsystem(id);
      dispatchWindowEvent('subsystem-changed', id);
    },
    { immediate: true },
  );

  watch(
    [themeMode, primaryColorHex],
    ([mode, color]) => {
      applyTheme(mode, color);
      persist();
    },
    { immediate: true },
  );

  watch(
    language,
    (lang) => {
      applyLanguage(lang);
      persist();
    },
    { immediate: true },
  );

  return {
    themeMode,
    primaryColor,
    primaryColorHex,
    customPrimaryHex,
    language,
    roleId,
    subsystemId,
    roles,
    subsystems,
    currentRole,
    currentSubsystem,
    availableSubsystems,
    setThemeMode,
    setPrimaryColor,
    setCustomPrimaryColor,
    setLanguage,
    setRole,
    setSubsystem,
  };
});
