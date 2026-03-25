import type { Component } from 'vue';
import { DataAnalysis, Monitor } from '@element-plus/icons-vue';
import defaultIcon from '@/assets/icons/设备管理@2x.png';
import type { LocaleText } from './roles';

export interface SubsystemLink {
  id: string;
  title: LocaleText;
  description: LocaleText;
  path: string;
  external?: boolean;
}

export interface SubsystemDefinition {
  id: string;
  title: LocaleText;
  description: LocaleText;
  defaultPath: string;
  icon?: Component;
  iconSrc?: string;
  menuCount?: number;
  topNavLinks?: SubsystemLink[];
}

export const SUBSYSTEMS: SubsystemDefinition[] = [
  {
    id: 'platform-center',
    title: {
      zh: '平台中心',
      en: 'Platform Center',
    },
    description: {
      zh: '平台全部功能一览。',
      en: 'Complete overview of platform capabilities.',
    },
    defaultPath: '/',
    iconSrc: defaultIcon,
    icon: Monitor,
    menuCount: 3,
    topNavLinks: [
      // {
      //   id: 'home-insight',
      //   title: {
      //     zh: '仪表盘',
      //     en: 'Dashboard',
      //   },
      //   description: {
      //     zh: '展示近期高频指标与平台状态。',
      //     en: 'Highlights recent metrics and platform status.',
      //   },
      //   path: '/',
      // },
      // {
      //   id: 'quick-report',
      //   title: {
      //     zh: '快捷报表',
      //     en: 'Quick Reports',
      //   },
      //   description: {
      //     zh: '快速导出对外汇报所需的数据快照。',
      //     en: 'Export shareable report snapshots with one click.',
      //   },
      //   path: '/reports',
      // },
    ],
  },
  {
    id: 'analysis-center',
    title: {
      zh: '子系统待配置',
      en: 'Subsystem Pending Configuration',
    },
    description: {
      zh: '子系统待配置的描述。',
      en: 'Description for subsystem pending configuration.',
    },
    defaultPath: '/',
    iconSrc: defaultIcon,
    icon: DataAnalysis,
    menuCount: 4,
    topNavLinks: [

    ],
  },
];
