/** 与 MultiLineTableCell 的 fields 配置一致 */
export interface MultiLineField {
  /**
   * 整行展示（优先级最高）。
   * 与 prefix/value 二选一；用于「VR：xxx」等已含前缀的整段文案。
   */
  text?: string;
  /** 与 value 组合为「前缀：值」同一行 */
  prefix?: string;
  value?: string;
  tooltip?: string;
  disableTooltip?: boolean;
}
