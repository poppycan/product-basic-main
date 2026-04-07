import { computed, ref, type UnwrapNestedRefs } from 'vue';
import { ElMessage } from 'element-plus';
import type { ColumnDef, ColumnTemplate } from '@/types/table-column-setting';
import { deepCloneCols, mergeColumnDefsWithDefaults } from '@/types/table-column-setting';

export interface UseTableColumnSettingsOptions {
  templatesKey: string;
  defaultOverrideKey: string;
}

export function useTableColumnSettings(
  defaultColumnDefs: ColumnDef[],
  options: UseTableColumnSettingsOptions
) {
  const { templatesKey, defaultOverrideKey } = options;

  const columnSettingVisible = ref(false);
  const columnSettingKeyword = ref('');
  const columnSettingTemplate = ref('default');
  const columnDefs = ref<ColumnDef[]>(deepCloneCols(defaultColumnDefs));

  const defaultTemplate: ColumnTemplate = {
    id: 'default',
    name: '默认列表',
    columns: deepCloneCols(defaultColumnDefs),
  };
  const columnTemplates = ref<ColumnTemplate[]>([defaultTemplate]);

  try {
    const stored = localStorage.getItem(templatesKey);
    if (stored) {
      const parsed = JSON.parse(stored) as ColumnTemplate[];
      if (Array.isArray(parsed) && parsed.length) {
        columnTemplates.value = [defaultTemplate, ...parsed.filter((t) => t.id !== 'default')];
      }
    }
  } catch {
    /* ignore */
  }

  try {
    const defOverride = localStorage.getItem(defaultOverrideKey);
    if (defOverride) {
      const parsed = JSON.parse(defOverride) as ColumnDef[];
      if (Array.isArray(parsed) && parsed.length) {
        columnDefs.value = mergeColumnDefsWithDefaults(parsed, defaultColumnDefs);
      }
    }
  } catch {
    /* ignore */
  }

  const filteredColumnDefs = computed(() => {
    const kw = columnSettingKeyword.value.trim().toLowerCase();
    const list = [...columnDefs.value].sort((a, b) => a.order - b.order);
    if (!kw) return list;
    return list.filter((c) => {
      if (c.label.toLowerCase().includes(kw)) return true;
      return c.fields?.some((f) => f.label.toLowerCase().includes(kw)) ?? false;
    });
  });

  const sortedColumnDefsForRender = computed(() =>
    columnDefs.value.filter((c) => c.visible).sort((a, b) => a.order - b.order)
  );

  function columnFixedProp(col: ColumnDef): 'left' | 'right' | undefined {
    if (col.fixed === 'left') return 'left';
    if (col.fixed === 'right') return 'right';
    return undefined;
  }

  function isMultiFieldColumnDef(col: ColumnDef): boolean {
    return !!(col.fields && col.fields.length > 1);
  }

  function isFieldVisible(colKey: string, fieldKey: string): boolean {
    const col = columnDefs.value.find((c) => c.key === colKey);
    if (!col?.visible) return false;
    if (!col.fields?.length) return true;
    const f = col.fields.find((x) => x.key === fieldKey);
    return f?.visible !== false;
  }

  function onColumnVisibleChange(col: ColumnDef, val: boolean) {
    col.visible = val;
    if (val && col.fields?.length) {
      col.fields.forEach((f) => {
        f.visible = true;
      });
    }
  }

  function onFieldVisibleChange(col: ColumnDef, fieldKey: string, val: boolean) {
    if (!col.fields?.length) return;
    if (!val) {
      const visibleCount = col.fields.filter((f) => f.visible && f.key !== fieldKey).length;
      if (visibleCount === 0) {
        ElMessage.warning('至少保留一个子字段显示');
        return;
      }
    }
    const f = col.fields.find((x) => x.key === fieldKey);
    if (f) f.visible = val;
  }

  function filterColumnList() {
    /* keyword 已由 computed 响应 */
  }

  function onColumnTemplateChange(id: string) {
    const t = columnTemplates.value.find((x) => x.id === id);
    if (t) columnDefs.value = mergeColumnDefsWithDefaults(t.columns, defaultColumnDefs);
  }

  function resetColumnTemplate() {
    columnSettingTemplate.value = 'default';
    localStorage.removeItem(defaultOverrideKey);
    columnDefs.value = deepCloneCols(defaultColumnDefs);
  }

  function snapshotColumnDefsForTemplate(): ColumnDef[] {
    return columnDefs.value.map((c) => ({
      key: c.key,
      label: c.label,
      visible: c.visible,
      fixed: c.fixed,
      order: c.order,
      fields: c.fields ? c.fields.map((f) => ({ ...f })) : undefined,
    }));
  }

  function saveCurrentColumnTemplate() {
    const id = columnSettingTemplate.value;
    const tpl = columnTemplates.value.find((x) => x.id === id);
    if (!tpl) {
      ElMessage.warning('未找到当前列表样式');
      return;
    }
    tpl.columns = snapshotColumnDefsForTemplate();
    if (id === 'default') {
      localStorage.setItem(defaultOverrideKey, JSON.stringify(tpl.columns));
    } else {
      localStorage.setItem(templatesKey, JSON.stringify(columnTemplates.value.filter((t) => t.id !== 'default')));
    }
    ElMessage.success('已保存');
  }

  function batchColumnOp(op: 'hide' | 'show' | 'pinTop' | 'pinBottom' | 'moveUp' | 'moveDown') {
    const checked = columnDefs.value.filter((c) => c.checked);
    if (!checked.length) {
      ElMessage.warning('请先勾选要操作的列');
      return;
    }
    const sorted = [...columnDefs.value].sort((a, b) => a.order - b.order);
    const keys = new Set(checked.map((c) => c.key));
    if (op === 'hide') {
      checked.forEach((c) => (c.visible = false));
    } else if (op === 'show') {
      checked.forEach((c) => {
        c.visible = true;
        if (c.fields?.length) {
          c.fields.forEach((f) => {
            f.visible = true;
          });
        }
      });
    } else if (op === 'pinTop') {
      let minOrder = Math.min(...sorted.map((c) => c.order));
      checked.forEach((c) => {
        c.fixed = 'left';
        c.order = --minOrder;
      });
    } else if (op === 'pinBottom') {
      let maxOrder = Math.max(...sorted.map((c) => c.order));
      checked.forEach((c) => {
        c.fixed = 'right';
        c.order = ++maxOrder;
      });
    } else if (op === 'moveUp') {
      checked.forEach((c) => {
        const idx = sorted.findIndex((x) => x.key === c.key);
        if (idx > 0) {
          const prev = sorted[idx - 1];
          if (prev && !keys.has(prev.key)) {
            [c.order, prev.order] = [prev.order, c.order];
          }
        }
      });
    } else if (op === 'moveDown') {
      checked.forEach((c) => {
        const idx = sorted.findIndex((x) => x.key === c.key);
        if (idx >= 0 && idx < sorted.length - 1) {
          const next = sorted[idx + 1];
          if (next && !keys.has(next.key)) {
            [c.order, next.order] = [next.order, c.order];
          }
        }
      });
    }
  }

  const saveTemplateVisible = ref(false);
  const saveTemplateName = ref('');

  function openSaveColumnTemplate() {
    saveTemplateName.value = '';
    saveTemplateVisible.value = true;
  }

  function saveColumnTemplate() {
    const name = saveTemplateName.value.trim();
    if (!name) {
      ElMessage.warning('请输入模版名称');
      return;
    }
    const id = `tpl_${Date.now()}`;
    const tpl: ColumnTemplate = {
      id,
      name,
      columns: columnDefs.value.map((c) => ({
        key: c.key,
        label: c.label,
        visible: c.visible,
        fixed: c.fixed,
        order: c.order,
        fields: c.fields ? c.fields.map((f) => ({ ...f })) : undefined,
      })),
    };
    const extra = columnTemplates.value.filter((t) => t.id !== 'default');
    columnTemplates.value = [defaultTemplate, ...extra, tpl];
    columnSettingTemplate.value = id;
    localStorage.setItem(templatesKey, JSON.stringify(columnTemplates.value.filter((t) => t.id !== 'default')));
    saveTemplateVisible.value = false;
    ElMessage.success('已保存');
  }

  return {
    columnSettingVisible,
    columnSettingKeyword,
    columnSettingTemplate,
    columnDefs,
    columnTemplates,
    filteredColumnDefs,
    sortedColumnDefsForRender,
    columnFixedProp,
    isMultiFieldColumnDef,
    isFieldVisible,
    onColumnVisibleChange,
    onFieldVisibleChange,
    filterColumnList,
    onColumnTemplateChange,
    resetColumnTemplate,
    saveCurrentColumnTemplate,
    batchColumnOp,
    saveTemplateVisible,
    saveTemplateName,
    openSaveColumnTemplate,
    saveColumnTemplate,
  };
}

/** 与 `reactive(useTableColumnSettings(...))` 搭配传给列设置面板 */
export type TableColumnSettingsApi = UnwrapNestedRefs<ReturnType<typeof useTableColumnSettings>>;
