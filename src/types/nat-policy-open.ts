/** NAT 开通 — 列表与表单共用类型 */

export type NatMode = 'SNAT' | 'DNAT' | 'DNAPT' | 'BNAT';

export type NatAddrType = 'NAT' | 'NAT46' | 'NAT64';

/** 列表行业务状态（与策略开通色块一致） */
export type NatRowStatus = 'incomplete' | 'completed' | 'cancelled';

export type NatExecStatus =
  | '待下发'
  | '下发成功'
  | '下发失败'
  | '回撤成功'
  | '回撤失败';

export type NatIdMode = 'system' | 'custom';

export type NatSnatConvert = 'egressIp' | 'specifiedIp' | 'none';

export type NatDnatConvert = 'specifiedIp' | 'none';

export type NatPosition = 'top' | 'bottom' | 'before' | 'after';

export interface NatDeviceOption {
  id: string;
  name: string;
  ip: string;
}

/** 列表行（展示字段聚合） */
export interface NatOpenListRow {
  id: string;
  /** 设备树节点 id，与 mockDeviceTree 中设备 id 对应 */
  deviceId: string;
  rowStatus: NatRowStatus;
  deviceName: string;
  deviceIp: string;
  mode: NatMode;
  natType: NatAddrType;
  idMode: NatIdMode;
  policyIdDisplay: string;
  policySourcePreview: string;
  vr: string;
  srcZone: string;
  srcIp: string;
  dstZone: string;
  dstIp: string;
  service: string;
  inIf: string;
  outIf: string;
  bnatIf: string;
  securityZone: string;
  snatConvert: NatSnatConvert;
  snatIp: string;
  dnatConvert: NatDnatConvert;
  dnatIp: string;
  translatedPort: string;
  position: NatPosition;
  positionRef: string;
  execStatus: NatExecStatus;
  execTime: string;
  verifyNeedManual: boolean;
  description: string;
  /** 创建人（原型固定 mock） */
  createdBy: string;
  createdAt: Date;
  /** 修改人（原型固定 mock） */
  updatedBy: string;
  updatedAt: Date;
  /** BNAT：虚拟/真实 IP（列表展示） */
  virtualIp?: string;
  realIp?: string;
}

/** 添加/编辑表单草稿 */
export interface NatOpenFormState {
  device: NatDeviceOption | null;
  mode: NatMode;
  natType: NatAddrType;
  idMode: NatIdMode;
  customId: string;
  vr: string;
  srcZone: string;
  srcIp: string;
  dstZone: string;
  dstIp: string;
  service: string;
  inIf: string;
  outIf: string;
  bnatIf: string;
  securityZone: string;
  snatConvert: NatSnatConvert;
  snatIp: string;
  dnatConvert: NatDnatConvert;
  dnatIp: string;
  translatedPort: string;
  position: NatPosition;
  positionRef: string;
  description: string;
}

export function defaultNatFormState(): NatOpenFormState {
  return {
    device: null,
    mode: 'SNAT',
    natType: 'NAT',
    idMode: 'system',
    customId: '',
    vr: '',
    srcZone: 'any',
    srcIp: '',
    dstZone: 'any',
    dstIp: '',
    service: 'any',
    inIf: '',
    outIf: '',
    bnatIf: '',
    securityZone: 'any',
    snatConvert: 'specifiedIp',
    snatIp: '',
    dnatConvert: 'specifiedIp',
    dnatIp: '',
    translatedPort: '',
    position: 'top',
    positionRef: '',
    description: '',
  };
}
