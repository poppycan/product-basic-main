import type { Component } from 'vue';
import { Collection, TrendCharts } from '@element-plus/icons-vue';
import type { SubsystemDefinition } from './subsystems';

export type LocaleKey = 'zh' | 'en';
type SubsystemId = SubsystemDefinition['id'];

export interface MenuTitle {
  zh: string;
  en: string;
}

export interface SideNavItem {
  id: string;
  subsystemIds?: SubsystemId[];
  path: string;
  icon?: Component;
  iconSrc?: string;
  title: MenuTitle;
}

export function resolveMenuIcon(fileName: string): string {
  return new URL(`../assets/icons/${fileName}`, import.meta.url).href;
}

/** 左侧默认展示的菜单项数（策略台账到业务性能共 8 项，第 9 位为「更多」） */
export const DEFAULT_VISIBLE_MENU_COUNT = 8;

export const SIDE_NAV_ITEMS: SideNavItem[] = [
  {
    id: 'policy-ledger',
    path: '/policy-ledger',
    iconSrc: resolveMenuIcon('报表@2x.png'),
    title: {
      zh: '策略台账',
      en: 'Policy Ledger',
    },
  },
  {
    id: 'task-management',
    path: '/task-management',
    iconSrc: resolveMenuIcon('概览@2x.png'),
    title: {
      zh: '任务管理',
      en: 'Task Management',
    },
  },
  {
    id: 'policy-analysis',
    path: '/policy-analysis',
    iconSrc: resolveMenuIcon('报表@2x.png'),
    title: {
      zh: '策略分析',
      en: 'Policy Analysis',
    },
  },
  {
    id: 'policy-change',
    path: '/policy-change',
    iconSrc: resolveMenuIcon('概览@2x.png'),
    title: {
      zh: '策略变更',
      en: 'Policy Change',
    },
  },
  {
    id: 'work-order-management',
    path: '/work-order-management',
    iconSrc: resolveMenuIcon('报表@2x.png'),
    title: {
      zh: '工单管理',
      en: 'Work Order Management',
    },
  },
  {
    id: 'compliance-analysis',
    path: '/compliance-analysis',
    iconSrc: resolveMenuIcon('概览@2x.png'),
    title: {
      zh: '合规分析',
      en: 'Compliance Analysis',
    },
  },
  {
    id: 'backup-management',
    path: '/backup-management',
    iconSrc: resolveMenuIcon('报表@2x.png'),
    title: {
      zh: '备份管理',
      en: 'Backup Management',
    },
  },
  {
    id: 'business-performance',
    path: '/business-performance',
    iconSrc: resolveMenuIcon('概览@2x.png'),
    title: {
      zh: '业务性能',
      en: 'Business Performance',
    },
  },
  {
    id: 'tenant-detail',
    path: '/tenant-detail',
    iconSrc: resolveMenuIcon('报表@2x.png'),
    title: {
      zh: '租户详情',
      en: 'Tenant Detail',
    },
  },
  {
    id: 'tenant-host',
    path: '/tenant-host',
    iconSrc: resolveMenuIcon('概览@2x.png'),
    title: {
      zh: '租户主机',
      en: 'Tenant Host',
    },
  },
  {
    id: 'tenant-application',
    path: '/tenant-application',
    iconSrc: resolveMenuIcon('报表@2x.png'),
    title: {
      zh: '租户应用',
      en: 'Tenant Application',
    },
  },
  {
    id: 'tenant-public-ip',
    path: '/tenant-public-ip',
    iconSrc: resolveMenuIcon('概览@2x.png'),
    title: {
      zh: '租户外网IP',
      en: 'Tenant Public IP',
    },
  },
  {
    id: 'tenant-network',
    path: '/tenant-network',
    iconSrc: resolveMenuIcon('报表@2x.png'),
    title: {
      zh: '租户网络',
      en: 'Tenant Network',
    },
  },
  {
    id: 'alarm-center',
    path: '/alarm-center',
    iconSrc: resolveMenuIcon('概览@2x.png'),
    title: {
      zh: '告警中心',
      en: 'Alarm Center',
    },
  },
  {
    id: 'data-search',
    path: '/data-search',
    iconSrc: resolveMenuIcon('报表@2x.png'),
    title: {
      zh: '数据检索',
      en: 'Data Search',
    },
  },
  {
    id: 'packet-search',
    path: '/packet-search',
    iconSrc: resolveMenuIcon('概览@2x.png'),
    title: {
      zh: '数据包检索',
      en: 'Packet Search',
    },
  },
  {
    id: 'traffic-analysis',
    path: '/traffic-analysis',
    iconSrc: resolveMenuIcon('报表@2x.png'),
    title: {
      zh: '流量分析',
      en: 'Traffic Analysis',
    },
  },
  {
    id: 'view-center',
    path: '/view-center',
    iconSrc: resolveMenuIcon('概览@2x.png'),
    title: {
      zh: '视图中心',
      en: 'View Center',
    },
  },
  {
    id: 'report-management',
    path: '/report-management',
    iconSrc: resolveMenuIcon('报表@2x.png'),
    title: {
      zh: '报表管理',
      en: 'Report Management',
    },
  },
  {
    id: 'blacklist-block',
    path: '/blacklist-block',
    iconSrc: resolveMenuIcon('概览@2x.png'),
    title: {
      zh: '黑名单阻断',
      en: 'Blacklist Block',
    },
  },
  {
    id: 'firewall-performance',
    path: '/firewall-performance',
    iconSrc: resolveMenuIcon('报表@2x.png'),
    title: {
      zh: '防火墙性能',
      en: 'Firewall Performance',
    },
  },
  {
    id: 'load-performance',
    path: '/load-performance',
    iconSrc: resolveMenuIcon('概览@2x.png'),
    title: {
      zh: '负载性能',
      en: 'Load Performance',
    },
  },
  {
    id: 'policy-sorting',
    path: '/policy-sorting',
    iconSrc: resolveMenuIcon('报表@2x.png'),
    title: {
      zh: '策略梳理',
      en: 'Policy Sorting',
    },
  },
  {
    id: 'asset-sorting',
    path: '/asset-sorting',
    iconSrc: resolveMenuIcon('概览@2x.png'),
    title: {
      zh: '资产梳理',
      en: 'Asset Sorting',
    },
  },
  {
    id: 'configuration-center',
    path: '/configuration',
    iconSrc: resolveMenuIcon('报表@2x.png'),
    title: {
      zh: '配置中心',
      en: 'Configuration Center',
    },
  },
  {
    id: 'system-management',
    path: '/system-management',
    iconSrc: resolveMenuIcon('概览@2x.png'),
    title: {
      zh: '系统管理',
      en: 'System Management',
    },
  },
];

export const POLICY_CHANGE_SUB_ITEMS: SideNavItem[] = [
  {
    id: 'policy-open',
    path: '/policy-change/open',
    iconSrc: resolveMenuIcon('概览@2x.png'),
    title: {
      zh: '策略开通',
      en: 'Policy Open',
    },
  },
  {
    id: 'policy-open-detail',
    path: '/policy-change/open-detail',
    iconSrc: resolveMenuIcon('报表@2x.png'),
    title: {
      zh: '策略开通明细',
      en: 'Policy Open Detail',
    },
  },
  {
    id: 'policy-modify',
    path: '/policy-change/modify',
    iconSrc: resolveMenuIcon('报表@2x.png'),
    title: {
      zh: '策略修改',
      en: 'Policy Modify',
    },
  },
  {
    id: 'policy-edit',
    path: '/policy-change/edit',
    iconSrc: resolveMenuIcon('概览@2x.png'),
    title: {
      zh: '策略编辑',
      en: 'Policy Edit',
    },
  },
  {
    id: 'policy-recycle',
    path: '/policy-change/recycle',
    iconSrc: resolveMenuIcon('报表@2x.png'),
    title: {
      zh: '策略回收',
      en: 'Policy Recycle',
    },
  },
];

export const QUICK_LINKS: SideNavItem[] = [
  {
    id: 'configuration-center',
    path: '/configuration',
    icon: Collection,
    title: {
      zh: '配置中心',
      en: 'Configuration Center',
    },
  },
  {
    id: 'system-management',
    path: '/system-management',
    icon: TrendCharts,
    title: {
      zh: '系统管理',
      en: 'System Management',
    },
  },
];
