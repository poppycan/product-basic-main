/** 多字段列的子字段（与主列表单元格内块一一对应） */
export interface ColumnFieldDef {
  key: string;
  label: string;
  visible: boolean;
}

export interface ColumnDef {
  key: string;
  label: string;
  visible: boolean;
  fixed: 'left' | 'right' | false | '';
  order: number;
  checked?: boolean;
  fields?: ColumnFieldDef[];
}

export interface ColumnTemplate {
  id: string;
  name: string;
  columns: ColumnDef[];
}

export function deepCloneCols(cols: ColumnDef[]): ColumnDef[] {
  return cols.map((c) => ({
    ...c,
    checked: false,
    fields: c.fields ? c.fields.map((f) => ({ ...f })) : undefined,
  }));
}

export function mergeColumnDefsWithDefaults(incoming: ColumnDef[], defaultColumnDefs: ColumnDef[]): ColumnDef[] {
  const defaults = deepCloneCols(defaultColumnDefs);
  const incomingMap = new Map(incoming.map((c) => [c.key, c]));
  return defaults.map((d) => {
    const inc = incomingMap.get(d.key);
    if (!inc) return d;
    const merged: ColumnDef = {
      ...d,
      visible: inc.visible,
      fixed: inc.fixed,
      order: inc.order,
      checked: false,
    };
    if (d.fields?.length && inc.fields?.length) {
      const fMap = new Map(inc.fields.map((f) => [f.key, f]));
      merged.fields = d.fields.map((bf) => {
        const mf = fMap.get(bf.key);
        return mf ? { ...bf, visible: mf.visible } : { ...bf };
      });
    } else if (d.fields) {
      merged.fields = d.fields.map((f) => ({ ...f }));
    }
    return merged;
  });
}
