/**
 * 安全策略页面 - 类型定义
 * 与 page-spec 及 mock 数据配套使用
 */

/** 设备组（树父级） */
export interface DeviceGroup {
  id: string;
  name: string;
  children: FirewallDevice[];
}

/** 防火墙设备（树子级） */
export interface FirewallDevice {
  id: string;
  name: string;
  enabled: boolean;
  policyTotal: number;
  problemCount: number;
}

/** 树节点（Element Plus Tree 用） */
export interface DeviceTreeNode {
  id: string;
  label: string;
  isGroup: boolean;
  device?: FirewallDevice;
  children?: DeviceTreeNode[];
}

/** 含 any 过滤 */
export type AnyMode = 'include' | 'exclude' | '';

/** 匹配模式 */
export type MatchMode = 'all' | 'include' | 'exclude' | 'equal' | 'partial';

/** 检索条件 */
export interface SearchParams {
  queryText?: string;
  policyNameOrId?: string;
  action?: string;
  srcIp?: string;
  dstIp?: string;
  port?: string;
  advanced?: boolean;
  anyMode: AnyMode;
  matchMode: MatchMode;
  deviceIds: string[];
  tagFilters: TagFilterItem[];
}

/** 标签过滤项（生命周期/质量/业务） */
export interface TagFilterItem {
  category: 'lifecycle' | 'quality' | 'business';
  key: string;
  label: string;
}

/** NAT 转换规则（hover 展示） */
export interface NatRule {
  fromIp: string;
  toIp: string;
  ruleName: string;
  valid: boolean;
}

/** 策略列表行 */
export interface PolicyRow {
  id: string;
  name: string;
  deviceId: string;
  deviceName: string;
  enabled: boolean;
  priority: number;
  action: 'allow' | 'deny';
  srcZone: string;
  srcIp: string[];
  dstZone: string;
  dstIp: string[];
  service: string[];
  snatRules?: NatRule[];
  dnatRules?: NatRule[];
  snatSourceIps?: string[];
  dnatDest?: string;
  lines: string[];
  remark: string;
  remarkFlags?: {
    empty?: boolean;
    missingOwner?: boolean;
    missingPurpose?: boolean;
  };
  hitCount: number;
  hitLastTime: string;
  tags: string[];
  lifecycleFlags: string[];
  qualityFlags: string[];
  containsAny: boolean;
}

/** 标签统计（生命周期 / 质量 / 业务） */
export interface TagStats {
  lifecycle: Record<string, number>;
  quality: Record<string, number>;
  business: Record<string, number>;
}

/** 策略搜索响应 */
export interface PolicySearchResult {
  items: PolicyRow[];
  total: number;
  tagStats: TagStats;
}

/** 常用检索项 */
export interface CommonSearchItem {
  id: string;
  label: string;
  params: Partial<SearchParams>;
  createdAt: number;
}
