/** NAT 开通弹窗 — 列表选择类字段的 mock 数据（原型） */

export const MOCK_VR_LIST = [
  { name: 'trust-vr' },
  { name: 'untrust-vr' },
  { name: 'dmz-vr' },
  { name: 'mgmt-vr' },
];

export const MOCK_ZONE_LIST = [
  { name: 'trust' },
  { name: 'untrust' },
  { name: 'dmz' },
  { name: 'any' },
];

export const MOCK_SERVICE_LIST = [
  { name: 'TCP_80' },
  { name: 'TCP_443' },
  { name: 'UDP_53' },
  { name: 'any' },
];

export const MOCK_IFACE_LIST = [
  { name: 'ethernet0/0' },
  { name: 'ethernet0/1' },
  { name: 'eth0' },
  { name: 'eth1' },
  { name: 'any' },
];

export const MOCK_SECURITY_ZONE_LIST = [{ name: 'untrust' }, { name: 'trust' }, { name: 'any' }];

/** 地址对象（名称搜索） */
export const MOCK_ADDR_OBJECTS = [
  { id: 'ao-1', name: 'obj-office', address: '192.168.6.7' },
  { id: 'ao-2', name: 'obj-server', address: '10.0.0.10' },
  { id: 'ao-3', name: 'obj-dmz', address: '172.16.1.0/24' },
];

/** 自定义策略 ID 候选 */
export const MOCK_CUSTOM_POLICY_IDS = [{ name: '88' }, { name: '100' }, { name: '255' }];

/** 参照 ID 候选 */
export const MOCK_POSITION_REF_IDS = [{ name: '1' }, { name: '12' }, { name: '88' }];
