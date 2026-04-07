/**
 * 策略开通 - 【调整】弹窗 类型（见 docs/开通-调整页面说明.md）
 */

export type DeviceExecStatusTag =
  | '待下发'
  | '下发成功'
  | '下发失败'
  | '回撤成功'
  | '回撤失败';

/** 设备行传入调整弹窗所需字段 */
export interface AdjustDialogDeviceRow {
  id: string;
  policyName: string;
  src: string;
  dst: string;
  service: string;
  action: string;
  validUntil: string;
  remark: string;
  execStatusTag: DeviceExecStatusTag;
  execStatusTime: string;
  firewall?: string;
}

export interface MergeablePolicyOption {
  id: string;
  name: string;
}

export interface TopPolicyOption {
  id: string;
  name: string;
}

export type IssueMode = 'new' | 'merge';
export type PolicyIdMode = 'custom' | 'system';
export type DeployPosition =
  | 'top'
  | 'before_merge'
  | 'insert_before_top'
  | 'insert_after_top';
export type ValidityMode = 'permanent' | 'custom';
export type ServiceProtocol = 'tcpudp' | 'tcp' | 'udp' | 'icmp';

export interface AdjustSavePayload {
  /** 保存后执行状态 */
  execStatusTag: DeviceExecStatusTag;
  /** 保存后执行时间展示；下发失败清空时为 '' */
  execStatusTime: string;
}
