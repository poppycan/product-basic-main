export type ThemeMode = 'light' | 'dark';
export type PrimaryColorKey = 'green' | 'purple' | 'blue';

export const THEME_MODES: ThemeMode[] = ['light', 'dark'];

export const PRIMARY_COLORS: Array<{
  key: PrimaryColorKey;
  hex: string;
  label: {
    zh: string;
    en: string;
  };
}> = [
  {
    key: 'green',
    hex: '#00AB79',
    label: {
      zh: '清新绿',
      en: 'Emerald',
    },
  },
  {
    key: 'purple',
    hex: '#6954F0',
    label: {
      zh: '星空紫',
      en: 'Violet',
    },
  },
  {
    key: 'blue',
    hex: '#325CD8',
    label: {
      zh: '深海蓝',
      en: 'Azure',
    },
  },
];

export const DEFAULT_THEME_MODE: ThemeMode = 'light';
export const DEFAULT_PRIMARY_COLOR: PrimaryColorKey = 'green';
