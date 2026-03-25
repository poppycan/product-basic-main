/**
 * 安全策略页面 - Mock 数据与本地过滤逻辑
 * 用于开发阶段预览，后续可替换为真实 API
 */

import type {
  DeviceGroup,
  PolicyRow,
  TagStats,
  SearchParams,
  NatRule,
} from '@/types/security-policy';

/** 设备树 Mock */
export const mockDeviceTree: DeviceGroup[] = [
  {
    id: 'group-1',
    name: '华东区',
    children: [
      {
        id: 'fw-1',
        name: 'FG-101C',
        ip: '10.0.1.101',
        model: '华为usg9580',
        fetchMode: '直连',
        collectCycle: '每周/次',
        location: '互联网边界',
        dnatMatchMode: '先dnat后匹配策略',
        webManage: 'https',
        complianceEnabled: true,
        backupEnabled: true,
        policyAnalysisEnabled: true,
        performanceEnabled: false,
        hardwareVersion: 'HW-1.0',
        remark: '占位备注',
        updatedAt: '2026-03-11 10:00',
        createdAt: '2026-01-01 09:00',
        createdBy: 'admin',
        enabled: true,
        policyTotal: 150,
        problemCount: 3,
      },
      {
        id: 'fw-2',
        name: 'FG-102A',
        ip: '10.0.1.102',
        model: '华为usg9580',
        fetchMode: '直连',
        collectCycle: '每周/次',
        location: '互联网边界',
        dnatMatchMode: '先匹配策略后dnat',
        webManage: 'https',
        complianceEnabled: false,
        backupEnabled: true,
        policyAnalysisEnabled: true,
        performanceEnabled: true,
        hardwareVersion: 'HW-1.1',
        remark: '占位备注',
        updatedAt: '2026-03-11 10:00',
        createdAt: '2026-01-01 09:00',
        createdBy: 'admin',
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
        ip: '192.168.10.15',
        model: '华为usg9580',
        fetchMode: '直连',
        collectCycle: '每周/次',
        location: '互联网边界',
        dnatMatchMode: '先dnat后匹配策略',
        webManage: 'https',
        complianceEnabled: true,
        backupEnabled: true,
        policyAnalysisEnabled: true,
        performanceEnabled: true,
        hardwareVersion: 'HW-2.0',
        remark: '占位备注',
        updatedAt: '2026-03-11 10:00',
        createdAt: '2026-01-01 09:00',
        createdBy: 'admin',
        enabled: true,
        policyTotal: 220,
        problemCount: 5,
      },
    ],
  },
];

const natRule = (from: string, to: string, name: string, valid: boolean): NatRule => ({
  fromIp: from,
  toIp: to,
  ruleName: name,
  valid,
});

/** 策略列表 Mock */
export const mockPolicies: PolicyRow[] = [
  {
    id: '06516',
    name: 'allow-web-demo',
    deviceId: 'fw-1',
    deviceName: 'FG-101C',
    deviceIp: '10.0.1.101',
    enabled: true,
    priority: 3,
    action: 'allow',
    srcZone: 'MPLS',
    srcIp: ['192.168.10.15', '172.23.5.12', 'MPLS10.0'],
    srcIpObjectIps: { 'MPLS10.0': ['110.11.1.2', '10.1.3.1'] },
    dstZone: 'dmz',
    dstIp: ['Office', 'BR-DC'],
    dstIpObjectIps: { Office: ['10.2.1.1', '10.2.1.2'], 'BR-DC': ['192.168.5.10'] },
    service: ['T-3398', 'T-443', 'T-80'],
    serviceObjectDetails: { 'T-3398': 'TCP_33-98', 'T-443': 'TCP_443', 'T-80': 'TCP_80' },
    snatRules: [],
    dnatRules: [],
    snatSourceIps: [],
    dnatDest: '',
    lines: [],
    archive: '办公网｜Web访问｜申请人：张三｜负责人：李四｜工单：inc-2024｜执行人：王五/2026-03-01',
    remark: '示例策略',
    remarkFlags: {},
    hitCount: 5000,
    hitFirstTime: '2026-03-01 09:00',
    hitLastTime: '2026-03-11 14:30',
    tags: ['办公网'],
    lifecycleFlags: [],
    qualityFlags: [],
    riskFlags: [],
    containsAny: false,
  },
  {
    id: '06517',
    name: 'block651',
    deviceId: 'fw-3',
    deviceName: '网间-亚信',
    deviceIp: '192.168.10.5',
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
    dnatRules: [natRule('192.168.23.7', '110.10.10.1', 'dnatrule_2', false)],
    snatSourceIps: ['192.168.1.2', '10.0.0.1'],
    dnatDest: '172.168.8.12:80',
    lines: ['专线001', '专线002'],
    archive: '财务系统｜允许办公网访问数据库3306｜申请人：李莉丝｜负责人：章三｜工单：inc-2043｜执行人：王武/2026-04-23',
    remark:
      '申请人：张三，财务系统，允许办公网访问数据库3306，申请人：李莉丝，负责人：章三，工单：inc-2043，长期有效，王武/2026-04-23',
    remarkFlags: {},
    hitCount: 22200,
    hitFirstTime: '2026-03-06 11:10',
    hitLastTime: '2026-03-07 12:10',
    tags: ['冗余策略', '远程管理'],
    lifecycleFlags: [],
    qualityFlags: ['redundant'],
    riskFlags: [],
    containsAny: false,
  },
  {
    id: '06518',
    name: 'allow-web',
    deviceId: 'fw-1',
    deviceName: 'FG-101C',
    deviceIp: '10.0.1.101',
    enabled: true,
    priority: 2,
    action: 'allow',
    srcZone: 'dmz',
    srcIp: ['10.0.0.0/24'],
    dstZone: 'untrust',
    dstIp: ['any'],
    service: ['TCP_443'],
    snatRules: [natRule('10.0.0.5', '192.168.0.3', 'snatrule_allow_web', true)],
    dnatRules: [natRule('10.0.0.5', '192.168.0.3', 'dnatrule_allow_web', true)],
    snatSourceIps: [],
    dnatDest: '192.168.0.3',
    lines: ['专线003'],
    archive: '',
    remark: '',
    remarkFlags: { empty: true },
    hitCount: 1500,
    hitLastTime: '2026-03-10 08:00',
    tags: ['僵尸策略'],
    lifecycleFlags: ['zombie'],
    qualityFlags: [],
    riskFlags: ['containsAny', 'remarkEmpty'],
    containsAny: true,
  },
  {
    id: '06519',
    name: 'deny-malicious',
    deviceId: 'fw-1',
    deviceName: 'FG-101C',
    deviceIp: '10.0.1.102',
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
    archive: '',
    remark: '申请人：李四，无用途，负责人：无，工单：-，到期：2025-12-01，张三/2025-01-01',
    remarkFlags: { missingPurpose: true, missingOwner: true },
    hitCount: 0,
    hitLastTime: '',
    tags: ['已停用', '信息缺失'],
    lifecycleFlags: ['disabled'],
    qualityFlags: ['invalid'],
    riskFlags: ['logDisabled'],
    containsAny: false,
  },
];

export const mockTagStats: TagStats = {
  lifecycle: {
    disabled: 8,
    expired: 12,
    expire5d: 3,
    expire30d: 5,
    archiveMissing: 2,
  },
  quality: {
    redundant: 4,
    conflict: 2,
    hidden: 1,
    duplicate: 0,
    emptyZone: 1,
    emptyObject: 2,
  },
  risk: {
    matrixViolation: 2,
    highRiskPort: 1,
    containsAny: 3,
    broadPolicy: 4,
    logDisabled: 6,
    remarkEmpty: 5,
  },
  business: {
    '远程管理': 10,
    '财务系统': 6,
    '办公网': 20,
  },
};

/** 业务标签列表（档案编辑用：标签名称、创建时间、创建人） */
export interface BusinessTagItem {
  id: string;
  name: string;
  createdAt: string;
  createdBy: string;
}
export const mockBusinessTagList: BusinessTagItem[] = [
  { id: 'tag-1', name: '远程管理', createdAt: '2026-01-15 10:00', createdBy: 'admin' },
  { id: 'tag-2', name: '财务系统', createdAt: '2026-01-16 11:30', createdBy: '张三' },
  { id: 'tag-3', name: '办公网', createdAt: '2026-01-17 09:00', createdBy: '李四' },
  { id: 'tag-4', name: '临时策略', createdAt: '2026-02-01 14:00', createdBy: '王五' },
];

function filterPolicies(list: PolicyRow[], params: SearchParams): PolicyRow[] {
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
    result = result.filter((p) =>
      params.tagFilters!.some((f) => {
        if (f.category === 'lifecycle') return p.lifecycleFlags.includes(f.key);
        if (f.category === 'quality') return p.qualityFlags.includes(f.key);
        if (f.category === 'risk') return (p.riskFlags ?? []).includes(f.key);
        if (f.category === 'business') return p.tags.includes(f.label);
        return false;
      })
    );
  }

  return result;
}

/** 模拟搜索接口 */
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
