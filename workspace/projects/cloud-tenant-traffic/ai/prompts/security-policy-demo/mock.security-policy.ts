/**
 * 安全策略页面 - Mock 数据与本地过滤逻辑
 * 用于 demo 或开发阶段，后续可替换为真实 API
 */

import type {
  DeviceGroup,
  FirewallDevice,
  PolicyRow,
  TagStats,
  SearchParams,
  NatRule,
} from './types.security-policy';

/** 设备树 Mock */
export const mockDeviceTree: DeviceGroup[] = [
  {
    id: 'group-1',
    name: '华东区',
    children: [
      {
        id: 'fw-1',
        name: 'FG-101C',
        enabled: true,
        policyTotal: 150,
        problemCount: 3,
      },
      {
        id: 'fw-2',
        name: 'FG-102A',
        enabled: false,
        policyTotal: 88,
        problemCount: 1,
      },
    ],
  },
  {
    id: 'group-2',
    name: '华北区',
    children: [
      {
        id: 'fw-3',
        name: '网间-亚信',
        enabled: true,
        policyTotal: 220,
        problemCount: 5,
      },
    ],
  },
];

/** 单条 NAT 规则示例 */
const natRule = (from: string, to: string, name: string, valid: boolean): NatRule => ({
  fromIp: from,
  toIp: to,
  ruleName: name,
  valid,
});

/** 策略列表 Mock（多行覆盖各列展示） */
export const mockPolicies: PolicyRow[] = [
  {
    id: '06517',
    name: 'block651',
    deviceId: 'fw-3',
    deviceName: '网间-亚信',
    enabled: true,
    priority: 1,
    action: 'deny',
    srcZone: 'trust',
    srcIp: ['192.168.10.15'],
    dstZone: 'untrust',
    dstIp: ['110.1.1.10'],
    service: ['TCP_80', 'UDP_90'],
    snatRules: [
      natRule('183.230.7.2', '110.1.1.1', 'snatrule_7', true),
      natRule('192.168.1.2', '110.1.1.2', 'snatrule_8', false),
    ],
    dnatRules: [
      natRule('192.168.23.7', '110.10.10.1', 'dnatrule_2', false),
    ],
    snatSourceIps: ['192.168.1.2', '10.0.0.1'],
    dnatDest: '172.168.8.12:80',
    lines: ['专线001', '专线002'],
    remark:
      '申请人：张三｜财务系统｜允许办公网访问数据库3306｜负责人：章三｜工单：inc-2043｜长期有效｜王武/2026-04-23',
    remarkFlags: {},
    hitCount: 22200,
    hitLastTime: '2026-01-07 12:00',
    tags: ['冗余策略', '远程管理'],
    lifecycleFlags: [],
    qualityFlags: ['redundant'],
    containsAny: false,
  },
  {
    id: '06518',
    name: 'allow-web',
    deviceId: 'fw-1',
    deviceName: 'FG-101C',
    enabled: true,
    priority: 2,
    action: 'allow',
    srcZone: 'dmz',
    srcIp: ['10.0.0.0/24'],
    dstZone: 'untrust',
    dstIp: ['any'],
    service: ['TCP_443'],
    snatRules: [],
    dnatRules: [],
    snatSourceIps: [],
    dnatDest: '192.168.0.3',
    lines: ['专线003'],
    remark: '',
    remarkFlags: { empty: true },
    hitCount: 1500,
    hitLastTime: '2026-03-10 08:00',
    tags: ['僵尸策略'],
    lifecycleFlags: ['zombie'],
    qualityFlags: [],
    containsAny: true,
  },
  {
    id: '06519',
    name: 'deny-malicious',
    deviceId: 'fw-1',
    deviceName: 'FG-101C',
    enabled: false,
    priority: 0,
    action: 'deny',
    srcZone: 'untrust',
    srcIp: ['0.0.0.0/0'],
    dstZone: 'trust',
    dstIp: ['192.168.0.0/16'],
    service: ['TCP_22', 'TCP_3389'],
    snatRules: [],
    dnatRules: [],
    snatSourceIps: [],
    dnatDest: '',
    lines: [],
    remark: '申请人：李四｜无用途｜负责人：无｜工单：-｜到期：2025-12-01｜张三/2025-01-01',
    remarkFlags: { missingPurpose: true, missingOwner: true },
    hitCount: 0,
    hitLastTime: '',
    tags: ['已停用', '信息缺失'],
    lifecycleFlags: ['disabled'],
    qualityFlags: ['invalid'],
    containsAny: false,
  },
];

/** 标签统计 Mock（可从后端或根据当前列表聚合） */
export const mockTagStats: TagStats = {
  lifecycle: {
    expired: 12,
    disabled: 8,
    zombie: 5,
    infoMissing: 3,
  },
  quality: {
    redundant: 4,
    conflict: 2,
    hidden: 1,
    duplicate: 0,
    violation: 1,
    invalid: 8,
    emptyObject: 0,
    abnormal: 0,
  },
  business: {
    '远程管理': 10,
    '财务系统': 6,
    '办公网': 20,
  },
};

/** 本地过滤：根据 SearchParams 过滤 mockPolicies（demo 用） */
export function filterPolicies(
  list: PolicyRow[],
  params: SearchParams
): PolicyRow[] {
  let result = [...list];

  if (params.deviceIds?.length) {
    result = result.filter((p) => params.deviceIds!.includes(p.deviceId));
  }

  const q = (params.queryText || params.policyNameOrId || '').trim().toLowerCase();
  if (q) {
    const matchMode = params.matchMode || 'all';
    result = result.filter((p) => {
      const name = p.name.toLowerCase();
      const id = p.id.toLowerCase();
      const combined = `${name} ${id} ${p.srcZone} ${p.dstZone}`.toLowerCase();
      if (matchMode === 'all') return combined.includes(q);
      if (matchMode === 'include') return combined.includes(q);
      if (matchMode === 'exclude') return !combined.includes(q);
      if (matchMode === 'equal') return name === q || id === q;
      if (matchMode === 'partial') return name.includes(q) || id.includes(q);
      return true;
    });
  }

  if (params.anyMode === 'include') {
    result = result.filter((p) => p.containsAny);
  } else if (params.anyMode === 'exclude') {
    result = result.filter((p) => !p.containsAny);
  }

  if (params.tagFilters?.length) {
    result = result.filter((p) => {
      return params.tagFilters!.some((f) => {
        if (f.category === 'lifecycle') return p.lifecycleFlags.includes(f.key);
        if (f.category === 'quality') return p.qualityFlags.includes(f.key);
        if (f.category === 'business') return p.tags.includes(f.label);
        return false;
      });
    });
  }

  return result;
}

/** 模拟搜索接口：返回 items + total + tagStats */
export function searchPolicies(params: SearchParams): {
  items: PolicyRow[];
  total: number;
  tagStats: TagStats;
} {
  const items = filterPolicies(mockPolicies, params);
  return {
    items,
    total: items.length,
    tagStats: mockTagStats,
  };
}
