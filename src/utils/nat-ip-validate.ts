/** NAT 弹窗 IP 类字段：单条校验（对象名 / 单 IPv4 / CIDR） */

export function isValidSingleIpv4(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(t);
  if (!m) return false;
  return [m[1], m[2], m[3], m[4]].every((x) => {
    const n = Number(x);
    return n >= 0 && n <= 255;
  });
}

export function isValidIpv4Cidr(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/.exec(t);
  if (!m) return false;
  const ok = [m[1], m[2], m[3], m[4]].every((x) => {
    const n = Number(x);
    return n >= 0 && n <= 255;
  });
  if (!ok) return false;
  const p = Number(m[5]);
  return p >= 0 && p <= 32;
}

/** 与 NatIpKindField 的 infer 逻辑一致：对象名为非 IP/CIDR 形态 */
export function validateNatIpFieldValue(v: string): boolean {
  const s = v.trim();
  if (!s) return false;
  if (s.includes('/')) return isValidIpv4Cidr(s);
  if (isValidSingleIpv4(s)) return true;
  return s.length > 0;
}
