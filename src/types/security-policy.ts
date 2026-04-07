/**
 * 安全策略页面 - 类型定义
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
  /** 设备管理 IP（用于左侧搜索与属性展示） */
  ip?: string;
  /** 型号（属性弹窗占位/展示） */
  model?: string;
  /** 获取方式（属性弹窗占位/展示） */
  fetchMode?: string;
  /** 采集周期（属性弹窗占位/展示） */
  collectCycle?: string;
  /** 位置（属性弹窗占位/展示） */
  location?: string;
  /** DNAT 匹配方式（属性弹窗占位/展示） */
  dnatMatchMode?: string;
  /** Web 管理访问（属性弹窗占位/展示） */
  webManage?: string;
  /** 功能开关（属性弹窗占位/展示） */
  complianceEnabled?: boolean;
  backupEnabled?: boolean;
  policyAnalysisEnabled?: boolean;
  performanceEnabled?: boolean;
  /** 硬件版本/备注/时间字段（属性弹窗占位/展示） */
  hardwareVersion?: string;
  remark?: string;
  updatedAt?: string;
  createdAt?: string;
  createdBy?: string;
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

/** 匹配模式：全包含 / 排除条件 / 相等 / 部分匹配（默认） */
export type MatchMode = 'fullInclude' | 'exclude' | 'equal' | 'partial';

/** 检索条件 */
export interface SearchParams {
  /** 高级检索表达式 */
  queryText?: string;
  /** 普通检索：单行自由文本（名称、ID、IP、端口、动作、区域、优先级、标签、负责人、专线、档案等） */
  normalQueryText?: string;
  /** 当前检索模式（用于收藏回显） */
  searchMode?: 'normal' | 'advanced';
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

/** 标签过滤项（生命周期/质量/风险与合规/业务） */
export interface TagFilterItem {
  category: 'lifecycle' | 'quality' | 'risk' | 'business';
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
  /** 设备 IP，用于设备信息列展示 */
  deviceIp?: string;
  enabled: boolean;
  priority: number;
  action: 'allow' | 'deny';
  srcZone: string;
  srcIp: string[];
  /** 源 IP 对象名 -> 对象内 IP 列表（用于 hover 展开对象明细） */
  srcIpObjectIps?: Record<string, string[]>;
  dstZone: string;
  dstIp: string[];
  /** 目的 IP 对象名 -> 对象内 IP 列表（用于 hover 展开对象明细） */
  dstIpObjectIps?: Record<string, string[]>;
  service: string[];
  /** 服务对象名 -> 协议端口（如 TCP_443，用于 hover 展开对象明细） */
  serviceObjectDetails?: Record<string, string>;
  snatRules?: NatRule[];
  dnatRules?: NatRule[];
  snatSourceIps?: string[];
  dnatDest?: string;
  lines: string[];
  /** 档案：业务员系统｜用途｜申请人｜负责人｜工单号｜执行人/日期，空则计入档案缺失 */
  archive?: string;
  remark: string;
  remarkFlags?: {
    empty?: boolean;
    missingOwner?: boolean;
    missingPurpose?: boolean;
  };
  hitCount: number;
  /** 首次命中时间（策略明细弹窗展示） */
  hitFirstTime?: string;
  hitLastTime: string;
  tags: string[];
  lifecycleFlags: string[];
  qualityFlags: string[];
  riskFlags?: string[];
  containsAny: boolean;
}

/** 标签统计（生命周期 / 质量 / 风险与合规 / 业务） */
export interface TagStats {
  lifecycle: Record<string, number>;
  quality: Record<string, number>;
  risk: Record<string, number>;
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
