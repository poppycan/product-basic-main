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

function normalizeMatchMode(m: SearchParams['matchMode'] | string | undefined): SearchParams['matchMode'] {
  if (m === 'all') return 'partial';
  if (m === 'include') return 'fullInclude';
  if (m === 'fullInclude' || m === 'exclude' || m === 'equal' || m === 'partial') return m;
  return 'partial';
}

export function tokenizeQuery(raw: string): string[] {
  return raw
    .trim()
    .split(/[\s,，]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 策略行可检索全文（普通检索） */
function rowSearchBlob(p: PolicyRow): string {
  const parts: string[] = [
    p.name,
    p.id,
    p.deviceName,
    p.deviceIp ?? '',
    String(p.priority),
    p.action,
    p.srcZone,
    p.dstZone,
    ...(p.srcIp ?? []),
    ...(p.dstIp ?? []),
    ...(p.service ?? []),
    ...(p.snatSourceIps ?? []),
    p.dnatDest ?? '',
    ...(p.lines ?? []),
    ...(p.tags ?? []),
    p.archive ?? '',
    p.remark ?? '',
    ...(p.snatRules ?? []).map((r) => `${r.fromIp} ${r.toIp} ${r.ruleName}`),
    ...(p.dnatRules ?? []).map((r) => `${r.fromIp} ${r.toIp} ${r.ruleName}`),
  ];
  return parts.join(' ').toLowerCase();
}

function tokenMatchesRow(token: string, p: PolicyRow): boolean {
  const t = token.toLowerCase();
  if (!t) return true;
  return rowSearchBlob(p).includes(t);
}

function rowMatchesNormalQuery(p: PolicyRow, raw: string, matchMode: SearchParams['matchMode']): boolean {
  const mode = normalizeMatchMode(matchMode);
  const q = raw.trim();
  if (!q) return true;
  const tokens = tokenizeQuery(q);
  if (!tokens.length) return true;

  if (mode === 'equal') {
    const ql = q.toLowerCase();
    return p.name.toLowerCase() === ql || p.id.toLowerCase() === ql;
  }

  if (mode === 'exclude') {
    return !tokens.some((tok) => tokenMatchesRow(tok, p));
  }

  if (mode === 'fullInclude') {
    return tokens.every((tok) => tokenMatchesRow(tok, p));
  }

  // partial：任意一个 token 命中即可
  return tokens.some((tok) => tokenMatchesRow(tok, p));
}

/** 高级检索：保留原逻辑（名称 / ID / 区域子串） */
function advancedFilterRow(p: PolicyRow, qLower: string, matchMode: SearchParams['matchMode']): boolean {
  const mode = normalizeMatchMode(matchMode);
  const name = p.name.toLowerCase();
  const id = p.id.toLowerCase();
  const combined = `${name} ${id} ${p.srcZone} ${p.dstZone}`.toLowerCase();
  if (mode === 'equal') return name === qLower || id === qLower;
  if (mode === 'exclude') return !combined.includes(qLower);
  if (mode === 'partial') return name.includes(qLower) || id.includes(qLower);
  if (mode === 'fullInclude') return combined.includes(qLower);
  return combined.includes(qLower);
}

function filterPolicies(list: PolicyRow[], params: SearchParams): PolicyRow[] {
  let result = [...list];

  if (params.deviceIds?.length) {
    result = result.filter((p) => params.deviceIds!.includes(p.deviceId));
  }

  const matchMode = normalizeMatchMode(params.matchMode);

  if (params.searchMode === 'normal' && params.normalQueryText?.trim()) {
    result = result.filter((p) => rowMatchesNormalQuery(p, params.normalQueryText!.trim(), matchMode));
  } else if (params.searchMode === 'advanced' && params.queryText?.trim()) {
    const q = params.queryText.trim().toLowerCase();
    result = result.filter((p) => advancedFilterRow(p, q, matchMode));
  } else if (params.queryText?.trim() && params.searchMode !== 'normal') {
    const q = params.queryText.trim().toLowerCase();
    result = result.filter((p) => advancedFilterRow(p, q, matchMode));
  } else if (params.normalQueryText?.trim()) {
    result = result.filter((p) => rowMatchesNormalQuery(p, params.normalQueryText!.trim(), matchMode));
  } else if (params.policyNameOrId?.trim()) {
    result = result.filter((p) => rowMatchesNormalQuery(p, params.policyNameOrId!.trim(), matchMode));
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

const IPv4_CHUNK = /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/;

function ipInField(ip: string, hay: string): boolean {
  if (!ip || !hay) return false;
  return hay.toLowerCase().includes(ip.toLowerCase());
}

/** 普通检索：输入联想统计（按字段命中条数，仅非空字段参与） */
export function computeNormalFieldStats(rows: PolicyRow[], query: string): { label: string; count: number }[] {
  const q = query.trim();
  if (!q) return [];

  const looksLikeIp = IPv4_CHUNK.test(q);
  const stats: Array<{ label: string; count: number }> = [];

  if (looksLikeIp) {
    const ip = q.match(IPv4_CHUNK)?.[0] ?? q;
    let src = 0;
    let dst = 0;
    let snat = 0;
    let dnat = 0;
    for (const p of rows) {
      const srcHit = (p.srcIp ?? []).some((x) => ipInField(ip, x));
      const dstHit = (p.dstIp ?? []).some((x) => ipInField(ip, x));
      const snatHit =
        (p.snatSourceIps?.length ?? 0) > 0 || (p.snatRules?.length ?? 0) > 0
          ? ipInField(ip, (p.snatSourceIps ?? []).join(' ')) ||
            (p.snatRules ?? []).some((r) => ipInField(ip, `${r.fromIp} ${r.toIp}`))
          : false;
      const dnatHit =
        (p.dnatRules?.length ?? 0) > 0 || (p.dnatDest && p.dnatDest.length > 0)
          ? ipInField(ip, p.dnatDest ?? '') || (p.dnatRules ?? []).some((r) => ipInField(ip, `${r.fromIp} ${r.toIp}`))
          : false;
      if (srcHit) src++;
      if (dstHit) dst++;
      if (snatHit) snat++;
      if (dnatHit) dnat++;
    }
    if (src) stats.push({ label: '源IP', count: src });
    if (dst) stats.push({ label: '目的IP', count: dst });
    if (snat) stats.push({ label: 'SNAT', count: snat });
    if (dnat) stats.push({ label: 'DNAT', count: dnat });
    return stats;
  }

  const qLower = q.toLowerCase();
  const add = (label: string, fn: (p: PolicyRow) => string) => {
    let c = 0;
    for (const p of rows) {
      const s = fn(p);
      if (!s || String(s).trim() === '') continue;
      if (String(s).toLowerCase().includes(qLower)) c++;
    }
    if (c) stats.push({ label, count: c });
  };

  add('策略名称', (p) => p.name);
  add('策略ID', (p) => p.id);
  add('设备名', (p) => p.deviceName);
  add('设备IP', (p) => p.deviceIp ?? '');
  add('优先级', (p) => String(p.priority));
  add('动作', (p) => p.action);
  add('源区域', (p) => p.srcZone);
  add('目的区域', (p) => p.dstZone);
  add('源IP', (p) => (p.srcIp ?? []).join(' '));
  add('目的IP', (p) => (p.dstIp ?? []).join(' '));
  add('端口/服务', (p) => (p.service ?? []).join(' '));
  add('专线', (p) => (p.lines ?? []).join(' '));
  add('标签', (p) => (p.tags ?? []).join(' '));
  add('档案', (p) => p.archive ?? '');
  add('备注', (p) => p.remark ?? '');

  return stats.sort((a, b) => b.count - a.count);
}

/** 判断某行在指定「条件分布」字段上是否命中当前检索词（用于点击分布标签过滤列表） */
export function policyRowMatchesFieldLabel(row: PolicyRow, label: string, query: string): boolean {
  const q = query.trim();
  if (!q) return true;

  const looksLikeIp = IPv4_CHUNK.test(q);
  const ip = q.match(IPv4_CHUNK)?.[0] ?? q;

  if (looksLikeIp) {
    if (label === '源IP') return (row.srcIp ?? []).some((x) => ipInField(ip, x));
    if (label === '目的IP') return (row.dstIp ?? []).some((x) => ipInField(ip, x));
    if (label === 'SNAT') {
      if (!((row.snatSourceIps?.length ?? 0) > 0 || (row.snatRules?.length ?? 0) > 0)) return false;
      return (
        ipInField(ip, (row.snatSourceIps ?? []).join(' ')) ||
        (row.snatRules ?? []).some((r) => ipInField(ip, `${r.fromIp} ${r.toIp}`))
      );
    }
    if (label === 'DNAT') {
      if (!((row.dnatRules?.length ?? 0) > 0 || (row.dnatDest && row.dnatDest.length > 0))) return false;
      return (
        ipInField(ip, row.dnatDest ?? '') ||
        (row.dnatRules ?? []).some((r) => ipInField(ip, `${r.fromIp} ${r.toIp}`))
      );
    }
    return false;
  }

  const qLower = q.toLowerCase();
  const map: Record<string, (p: PolicyRow) => string> = {
    策略名称: (p) => p.name,
    策略ID: (p) => p.id,
    设备名: (p) => p.deviceName,
    设备IP: (p) => p.deviceIp ?? '',
    优先级: (p) => String(p.priority),
    动作: (p) => p.action,
    源区域: (p) => p.srcZone,
    目的区域: (p) => p.dstZone,
    源IP: (p) => (p.srcIp ?? []).join(' '),
    目的IP: (p) => (p.dstIp ?? []).join(' '),
    '端口/服务': (p) => (p.service ?? []).join(' '),
    专线: (p) => (p.lines ?? []).join(' '),
    标签: (p) => (p.tags ?? []).join(' '),
    档案: (p) => p.archive ?? '',
    备注: (p) => p.remark ?? '',
  };
  const fn = map[label];
  if (!fn) return false;
  const s = fn(row);
  if (!s || String(s).trim() === '') return false;
  return String(s).toLowerCase().includes(qLower);
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
