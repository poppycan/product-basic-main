export interface LocaleText {
  zh: string;
  en: string;
}

export interface RoleDefinition {
  id: string;
  name: LocaleText;
  description: LocaleText;
  subsystemIds: string[];
  defaultSubsystemId?: string;
}

export const ROLES: RoleDefinition[] = [
  {
    id: 'ops',
    name: {
      zh: '运维管理员',
      en: 'Operations Admin',
    },
    description: {
      zh: '可以访问平台全部模块，适合平台负责人或超级管理员。',
      en: 'Full access across modules, ideal for platform owners or administrators.',
    },
    subsystemIds: ['platform-center', 'analysis-center'],
    defaultSubsystemId: 'platform-center',
  },
  {
    id: 'analyst',
    name: {
      zh: '分析专员',
      en: 'Analytics Specialist',
    },
    description: {
      zh: '聚焦分析配置与报表输出，无法切换到基础运营模块。',
      en: 'Focuses on analysis configuration and reporting; no access to operations subsystem.',
    },
    subsystemIds: ['analysis-center'],
    defaultSubsystemId: 'analysis-center',
  },
  {
    id: 'guest',
    name: {
      zh: '访客',
      en: 'Guest',
    },
    description: {
      zh: '仅可浏览概览报表，适合演示或临时访客账号。',
      en: 'Read-only overview access, useful for demo or temporary guest accounts.',
    },
    subsystemIds: ['analysis-center'],
    defaultSubsystemId: 'analysis-center',
  },
];

export const DEFAULT_ROLE_ID: RoleDefinition['id'] = ROLES[0]?.id ?? '';
